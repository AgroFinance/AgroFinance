'use client'

// ============================================================
// AgroFinance — Modo oscuro
// ------------------------------------------------------------
// El <html> tenía `className="dark"` fijo a mano, resto de un diseño
// anterior — nunca fue un modo real que alguien pudiera apagar. Este
// provider lo reemplaza por un toggle de verdad: persiste en localStorage
// (por navegador, no por cuenta — es preferencia visual, no dato de
// negocio) y aplica/quita la clase `dark` en <html> para que las clases
// `dark:` de Tailwind (darkMode: 'class') respondan.
// ============================================================

import { createContext, useContext, useEffect, useState } from 'react'

type Tema = 'claro' | 'oscuro'

interface ThemeContextType {
  tema: Tema
  toggleTema: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  tema: 'claro',
  toggleTema: () => {},
})

export const useTema = () => useContext(ThemeContext)

const CLAVE = 'agrofinance_tema'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>('claro')

  useEffect(() => {
    const guardado = localStorage.getItem(CLAVE) as Tema | null
    if (guardado === 'oscuro' || guardado === 'claro') setTema(guardado)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'oscuro')
    localStorage.setItem(CLAVE, tema)
  }, [tema])

  const toggleTema = () => setTema((t) => (t === 'claro' ? 'oscuro' : 'claro'))

  return (
    <ThemeContext.Provider value={{ tema, toggleTema }}>
      {children}
    </ThemeContext.Provider>
  )
}
