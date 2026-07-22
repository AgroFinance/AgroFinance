'use client'

// Logo oficial de AgroFinance. Respeta el basePath para que funcione tanto en
// Firebase Hosting (basePath vacío) como en GitHub Pages (/AgroFinance).
const BP = process.env.NEXT_PUBLIC_BASE_PATH || ''

interface LogoProps {
  /** Alto del logo en px. Ancho se ajusta automáticamente. */
  height?: number
  className?: string
  /** Muestra el tagline "FinTech & ClimaTech SaaS" embebido en el PNG */
  priority?: boolean
}

export default function Logo({ height = 36, className = '' }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BP}/logo.png`}
      alt="AgroFinance — FinTech & ClimaTech SaaS"
      height={height}
      style={{ height, width: 'auto' }}
      className={`select-none ${className}`}
      draggable={false}
    />
  )
}
