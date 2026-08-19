'use client'

import { HelpCircle } from 'lucide-react'

// Glosario central de la jerga que el agroexportador no tiene por qué conocer.
// Si un término aparece en pantalla, su explicación vive acá.
export const GLOSARIO: Record<string, string> = {
  'tCO₂e': 'Toneladas de CO₂ equivalente. Medida universal para comparar el impacto de distintos gases de efecto invernadero.',
  'Scope 1': 'Alcance 1: emisiones directas de tu operación, como el diésel de la maquinaria y los fertilizantes aplicados en campo.',
  'Scope 2': 'Alcance 2: emisiones de la electricidad que compras, principalmente riego tecnificado y packing.',
  'Scope 3': 'Alcance 3: emisiones de tu cadena de valor que no controlas directamente, sobre todo el flete marítimo y el empaque. Suele ser la mayor parte de la huella.',
  'SLL': 'Sustainability Linked Loan: crédito cuya tasa de interés baja si cumples metas ambientales verificadas. Es el descuento que persigue el dossier bancario.',
  'UBL 2.1': 'Universal Business Language 2.1: el formato XML estándar en que SUNAT emite los comprobantes electrónicos. AgroFinance los lee directo, sin que tengas que transcribir nada.',
  'EUDR': 'Reglamento de la UE contra la deforestación. Exige demostrar que el producto no proviene de tierras deforestadas para poder venderlo en Europa.',
}

type Props = {
  /** Clave del glosario. Si no existe, se usa `texto` como explicación. */
  termino: keyof typeof GLOSARIO | string
  texto?: string
  className?: string
}

export default function TerminoTooltip({ termino, texto, className = '' }: Props) {
  const explicacion = texto ?? GLOSARIO[termino]
  if (!explicacion) return null

  return (
    <span className={`relative group inline-flex align-middle ml-1 ${className}`}>
      <HelpCircle
        className="w-3.5 h-3.5 text-[rgba(80,108,92,0.5)] cursor-help hover:text-[#137C53] transition-colors"
        role="img"
        aria-label={`Qué significa ${termino}`}
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-[#13301F] text-white text-[11px] font-normal leading-snug rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50 shadow-lg text-center"
      >
        {explicacion}
      </span>
    </span>
  )
}
