'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import {
  DEFAULT_ORG_ID, auth, db,
  registrarConEmail, iniciarSesionConEmail, iniciarSesionConGoogle, recogerResultadoGoogle, cerrarSesionFirebase,
} from '@/core/config/firebase.client'

export interface SessionUser {
  uid: string
  nombre: string
  empresa: string
  email: string
  avatarInitials: string
}

interface PerfilUsuario {
  nombre: string
  empresa: string
  email: string
  orgId: string
  createdAt: string
}

interface AuthContextType {
  user: SessionUser | null
  loading: boolean
  logout: () => void
  /** Crea una cuenta (email + contraseña) y su perfil en Firestore. */
  registrarCuenta: (nombre: string, empresa: string, email: string, password: string) => Promise<void>
  /** Inicia sesión con una cuenta ya existente. */
  iniciarSesion: (email: string, password: string) => Promise<void>
  /** Inicia sesión (o crea la cuenta si es la primera vez) con Google. */
  iniciarSesionGoogle: () => Promise<void>
  /** uid real de Firebase Auth — el que exigen firestore.rules/storage.rules
   *  para aislar los datos de cada cuenta. */
  firebaseUserId: string | null
  /** uid de la cuenta (una organización por cuenta). */
  orgId: string
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
  registrarCuenta: async () => {},
  iniciarSesion: async () => {},
  iniciarSesionGoogle: async () => {},
  firebaseUserId: null,
  orgId: DEFAULT_ORG_ID,
})

export const useAuth = () => useContext(AuthContext)

function makeInitials(nombre: string): string {
  return nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function perfilAUsuario(uid: string, perfil: PerfilUsuario): SessionUser {
  return {
    uid,
    nombre: perfil.nombre,
    empresa: perfil.empresa,
    email: perfil.email,
    avatarInitials: makeInitials(perfil.nombre || perfil.email || 'U'),
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [orgId, setOrgId] = useState<string>(DEFAULT_ORG_ID)
  const [loading, setLoading] = useState(true)
  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(null)

  useEffect(() => {
    // Se dispara al cargar la página, en TODAS las visitas — pero solo
    // resuelve con un usuario real cuando esta carga es el regreso de
    // signInWithRedirect(Google). El resto de las veces resuelve null
    // rápido y no afecta nada. Se guarda la promesa (no se espera acá)
    // porque onAuthStateChanged puede disparar su primer evento antes de
    // que esto resuelva, y es ahí donde de verdad se necesita el dato.
    const resultadoGoogle = recogerResultadoGoogle().catch(() => null)

    const dejarDeEscuchar = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUserId(fbUser?.uid ?? null)
      if (fbUser) {
        try {
          const ref = doc(db, 'usuarios', fbUser.uid)
          let snap = await getDoc(ref)
          if (!snap.exists()) {
            // Perfil inexistente + venimos de un redirect de Google con
            // ese mismo uid → es la primera vez que esta persona entra
            // con Google, se crea el perfil ahora (mismo patrón que
            // registrarCuenta, pero sin formulario de por medio).
            const gUser = await resultadoGoogle
            if (gUser && gUser.uid === fbUser.uid) {
              const perfil: PerfilUsuario = {
                nombre: gUser.displayName || gUser.email || 'Usuario',
                empresa: '',
                email: gUser.email || '',
                orgId: gUser.uid,
                createdAt: new Date().toISOString(),
              }
              await setDoc(ref, perfil)
              snap = await getDoc(ref)
            }
          }
          if (snap.exists()) {
            const perfil = snap.data() as PerfilUsuario
            setUser(perfilAUsuario(fbUser.uid, perfil))
            setOrgId(perfil.orgId || fbUser.uid)
          } else {
            setUser(null)
          }
        } catch (e) {
          console.warn('No se pudo leer el perfil de la cuenta:', (e as Error)?.message || e)
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return dejarDeEscuchar
  }, [])

  const logout = async () => {
    localStorage.removeItem(`agrofinance_has_data_${auth.currentUser?.uid || 'invitado'}`)
    try { await cerrarSesionFirebase() } catch { /* ignore */ }
  }

  const registrarCuenta = async (nombre: string, empresa: string, email: string, password: string) => {
    const fbUser = await registrarConEmail(email, password)
    const perfil: PerfilUsuario = { nombre, empresa, email, orgId: fbUser.uid, createdAt: new Date().toISOString() }
    await setDoc(doc(db, 'usuarios', fbUser.uid), perfil)
  }

  const iniciarSesion = async (email: string, password: string) => {
    await iniciarSesionConEmail(email, password)
  }

  // Con popup-first, iniciarSesionConGoogle devuelve el User directo si el
  // popup tuvo éxito (Safari/la mayoría de navegadores), o null si cayó a
  // redirect (popup bloqueado). En el segundo caso, la creación del perfil
  // se resuelve en el onAuthStateChanged de arriba cuando la app recarga.
  // En el primero, se crea el perfil acá mismo si es cuenta nueva.
  const iniciarSesionGoogle = async () => {
    const gUser = await iniciarSesionConGoogle()
    if (gUser) {
      // Popup exitoso: verificar si ya existe perfil; si no, crearlo ahora.
      try {
        const ref = doc(db, 'usuarios', gUser.uid)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          const perfil = {
            nombre: gUser.displayName || gUser.email || 'Usuario',
            empresa: '',
            email: gUser.email || '',
            orgId: gUser.uid,
            createdAt: new Date().toISOString(),
          }
          await setDoc(ref, perfil)
        }
      } catch (e) {
        console.warn('No se pudo crear perfil tras popup Google:', (e as Error)?.message || e)
      }
    }
  }

  return (
    <AuthContext.Provider value={{
      user, loading, logout,
      registrarCuenta, iniciarSesion, iniciarSesionGoogle,
      firebaseUserId, orgId,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
