'use client'

// ============================================================
// AgroFinance — Cultivo declarado (para el benchmark sectorial)
// ------------------------------------------------------------
// El benchmark "sector" solo puede compararse contra un cultivo real: SUNAT
// no declara qué fruta exporta la empresa, y solo dos cultivos tienen una
// referencia UE citable en benchmarks.ts (Palta Hass, Mango Kent). Antes se
// promediaba entre ambos SIEMPRE, sin importar cuál cultivo real vendía el
// usuario — comparar palta contra el benchmark de mango (o viceversa) no
// tiene sentido. Se pide, no se asume.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { auth } from '@/core/config/firebase.client'
import { BENCHMARKS } from '@/lib/benchmarks'

/** Únicos cultivos con referencia UE citable — no se ofrece elegir uno sin fuente. */
export const CULTIVOS_CON_BENCHMARK = Object.keys(BENCHMARKS).filter((c) => BENCHMARKS[c].eu.valor !== null)

function claveStorage(): string {
  return `agrofinance_cultivo_declarado_${auth.currentUser?.uid || 'invitado'}`
}

const EVENTO_CAMBIO = 'agrofinance:cultivo-cambio'

export function guardarCultivo(cultivo: string | null): void {
  if (typeof window === 'undefined') return
  if (cultivo === null) window.localStorage.removeItem(claveStorage())
  else window.localStorage.setItem(claveStorage(), cultivo)
  window.dispatchEvent(new Event(EVENTO_CAMBIO))
}

function leerCultivo(): string | null {
  if (typeof window === 'undefined') return null
  const v = window.localStorage.getItem(claveStorage())
  return v && CULTIVOS_CON_BENCHMARK.includes(v) ? v : null
}

export function useCultivoDeclarado(): [string | null, (c: string | null) => void] {
  const [cultivo, setCultivoLocal] = useState<string | null>(null)

  useEffect(() => {
    setCultivoLocal(leerCultivo())
    const onCambio = () => setCultivoLocal(leerCultivo())
    window.addEventListener(EVENTO_CAMBIO, onCambio)
    window.addEventListener('storage', onCambio)
    return () => {
      window.removeEventListener(EVENTO_CAMBIO, onCambio)
      window.removeEventListener('storage', onCambio)
    }
  }, [])

  const setCultivo = useCallback((c: string | null) => {
    guardarCultivo(c)
    setCultivoLocal(c)
  }, [])

  return [cultivo, setCultivo]
}
