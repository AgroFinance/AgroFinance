'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import {
  asegurarSesionAnonima, DEFAULT_ORG_ID, auth, db,
  registrarConEmail, iniciarSesionConEmail, iniciarSesionConGoogle, cerrarSesionFirebase,
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
  /** Acceso de administrador (usuario maestro fijo, ver /api/login). */
  login: (nombre: string, empresa: string, email: string) => void
  logout: () => void
  /** Crea una cuenta real (email + contraseña) y su perfil en Firestore. */
  registrarCuenta: (nombre: string, empresa: string, email: string, password: string) => Promise<void>
  /** Inicia sesión con una cuenta real ya existente. */
  iniciarSesion: (email: string, password: string) => Promise<void>
  /** Inicia sesión (o registra en el primer uso) con Google. */
  iniciarSesionGoogle: () => Promise<void>
  /** uid real de Firebase Auth — anónimo para el usuario maestro, real y
   *  persistente para las cuentas con email/contraseña o Google. Es el que
   *  exigen firestore.rules/storage.rules para aislar cada sesión. */
  firebaseUserId: string | null
  /** DEFAULT_ORG_ID para el usuario maestro; el uid de la cuenta real
   *  (una organización por cuenta) para todo lo demás. */
  orgId: string
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  registrarCuenta: async () => {},
  iniciarSesion: async () => {},
  iniciarSesionGoogle: async () => {},
  firebaseUserId: null,
  orgId: DEFAULT_ORG_ID,
})

export const useAuth = () => useContext(AuthContext)

const SESSION_KEY = 'agrofinance_session'

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
  // Dos sesiones posibles y mutuamente excluyentes en la práctica: la
  // cuenta real (Firebase Auth con email/contraseña o Google) y el usuario
  // maestro (localStorage, sin Firebase Auth real detrás — ver /api/login).
  const [masterUser, setMasterUser] = useState<SessionUser | null>(null)
  const [realUser, setRealUser] = useState<SessionUser | null>(null)
  const [orgIdReal, setOrgIdReal] = useState<string>(DEFAULT_ORG_ID)
  const [loading, setLoading] = useState(true)
  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) {
        setMasterUser(JSON.parse(raw))
        // login() ya hace esto en el primer clic, pero al recargar la página
        // (o volver a abrir la pestaña) este efecto restaura el usuario
        // maestro desde localStorage sin volver a pedirle Firebase Auth —
        // firebaseUserId se quedaba en null para siempre y la carga de
        // archivos fallaba con "No se pudo iniciar la sesión con Firebase"
        // hasta que la persona cerraba sesión y volvía a entrar.
        asegurarSesionAnonima()
          .then(setFirebaseUserId)
          .catch((e) => console.warn('No se pudo restaurar la sesión anónima de Firebase:', e?.message || e))
      }
    } catch { /* ignore */ }

    // onAuthStateChanged cubre tanto la sesión anónima del usuario maestro
    // (fbUser.isAnonymous === true) como una cuenta real. Solo una cuenta
    // real construye `realUser` — la anónima solo aporta el uid que
    // necesitan las Rules para el pipeline de carga de archivos.
    const dejarDeEscuchar = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUserId(fbUser?.uid ?? null)
      if (fbUser && !fbUser.isAnonymous) {
        try {
          const snap = await getDoc(doc(db, 'usuarios', fbUser.uid))
          if (snap.exists()) {
            const perfil = snap.data() as PerfilUsuario
            setRealUser(perfilAUsuario(fbUser.uid, perfil))
            setOrgIdReal(perfil.orgId || fbUser.uid)
          } else {
            setRealUser(null)
          }
        } catch (e) {
          console.warn('No se pudo leer el perfil de la cuenta:', (e as Error)?.message || e)
          setRealUser(null)
        }
      } else {
        setRealUser(null)
      }
      setLoading(false)
    })
    return dejarDeEscuchar
  }, [])

  const login = (nombre: string, empresa: string, email: string) => {
    const u: SessionUser = {
      uid: `${Date.now()}`,
      nombre,
      empresa,
      email,
      avatarInitials: makeInitials(nombre),
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(u))
    setMasterUser(u)
    asegurarSesionAnonima()
      .then(setFirebaseUserId)
      .catch((e) => console.warn('No se pudo iniciar sesión anónima de Firebase:', e?.message || e))
  }

  const logout = async () => {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(`agrofinance_has_data_${auth.currentUser?.uid || 'invitado'}`)
    setMasterUser(null)
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      try { await cerrarSesionFirebase() } catch { /* ignore */ }
    }
  }

  const registrarCuenta = async (nombre: string, empresa: string, email: string, password: string) => {
    const fbUser = await registrarConEmail(email, password)
    const perfil: PerfilUsuario = { nombre, empresa, email, orgId: fbUser.uid, createdAt: new Date().toISOString() }
    await setDoc(doc(db, 'usuarios', fbUser.uid), perfil)
  }

  const iniciarSesion = async (email: string, password: string) => {
    await iniciarSesionConEmail(email, password)
  }

  const iniciarSesionGoogle = async () => {
    const fbUser = await iniciarSesionConGoogle()
    const ref = doc(db, 'usuarios', fbUser.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      const perfil: PerfilUsuario = {
        nombre: fbUser.displayName || 'Usuario',
        empresa: '',
        email: fbUser.email || '',
        orgId: fbUser.uid,
        createdAt: new Date().toISOString(),
      }
      await setDoc(ref, perfil)
    }
  }

  const user = realUser ?? masterUser
  const orgId = realUser ? orgIdReal : DEFAULT_ORG_ID

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout,
      registrarCuenta, iniciarSesion, iniciarSesionGoogle,
      firebaseUserId, orgId,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
