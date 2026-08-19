'use client'

const BP = process.env.NEXT_PUBLIC_BASE_PATH || ''

interface KapiIconProps {
  /** Tamaño del ícono en px (cuadrado). */
  size?: number
  /** Color del trazo (currentColor por defecto vía máscara CSS). */
  color?: string
  className?: string
}

/** Ícono de marca de Kapi (capibara + hoja) — reemplaza al mascot ilustrado a color. */
export default function KapiIcon({ size = 24, color = 'currentColor', className = '' }: KapiIconProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: `url(${BP}/kapi-mark.png)`,
        maskImage: `url(${BP}/kapi-mark.png)`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
      aria-hidden="true"
    />
  )
}
