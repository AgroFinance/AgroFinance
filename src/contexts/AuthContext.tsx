'use client'

import { createContext, useContext, useEffect, useState } from 'react'

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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
})

export const useAuth = () => useContext(AuthContext)

const SESSION_KEY = 'agrofinance_session'

function makeInitials(nombre: string): string {
  return nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch { /* ignore */ }
    setLoading(false)
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
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
