'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { asegurarSesionAnonima, DEFAULT_ORG_ID } from '@/core/config/firebase.client'

export interface SessionUser {
  uid: string
  nombre: string
  empresa: string
  email: string
  avatarInitials: string
}

interface AuthContextType {
  user: SessionUser | null
  loading: boolean
  login: (nombre: string, empresa: string, email: string) => void
  logout: () => void
  /** uid real de Firebase Anonymous Auth — el que exigen firestore.rules
   *  para las sesiones de carga de archivos. null hasta que resuelve. */
  firebaseUserId: string | null
  /** Constante fija en esta fase — ver nota en lib/integrations/firebase.ts. */
  orgId: string
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  firebaseUserId: null,
  orgId: DEFAULT_ORG_ID,
})

export const useAuth = () => useContext(AuthContext)

const SESSION_KEY = 'agrofinance_session'

function makeInitials(nombre: string): string {
  return nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch { /* ignore */ }
    setLoading(false)

    // Sesión anónima de Firebase Auth: da un uid real y verificable por
    // las Rules, independiente del login maestro (que no toca Firebase
    // Auth). Si falla (proyecto sin Firestore habilitado todavía, por
    // ejemplo), el resto de la app sigue funcionando — solo el flujo de
    // carga asíncrona por Cloud Function queda sin disponible.
    asegurarSesionAnonima()
      .then(setFirebaseUserId)
      .catch((e) => console.warn('No se pudo iniciar sesión anónima de Firebase:', e?.message || e))
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
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem('agrofinance_has_data')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, firebaseUserId, orgId: DEFAULT_ORG_ID }}>
      {children}
    </AuthContext.Provider>
  )
}
