'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import {
  DEFAULT_ORG_ID, auth, db,
  registrarConEmail, iniciarSesionConEmail, cerrarSesionFirebase,
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
    const dejarDeEscuchar = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUserId(fbUser?.uid ?? null)
      if (fbUser) {
        try {
          const snap = await getDoc(doc(db, 'usuarios', fbUser.uid))
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

  return (
    <AuthContext.Provider value={{
      user, loading, logout,
      registrarCuenta, iniciarSesion,
      firebaseUserId, orgId,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
