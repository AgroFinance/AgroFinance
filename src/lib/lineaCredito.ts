'use client'

// ============================================================
// AgroFinance — Línea de crédito declarada (para "Ahorro potencial")
// ------------------------------------------------------------
// El "ahorro potencial" de un Sustainability-Linked Loan solo tiene sentido
// sobre un monto real: no hay forma honesta de adivinar cuánto crédito tiene
// o está negociando una agroexportadora — eso lo otorga el banco, no un
// promedio de mercado. Antes esto era una constante fija (US$5,000,000 × 0.35%
// = US$17,500, siempre igual, sin importar la campaña ni si había datos).
//
// Mientras no exista una integración real con la banca (bureau crediticio,
// SBS, o el propio banco), el único dato honesto es el que la persona
// declara aquí — mismo principio que el resto del motor: lo que no se sabe
// no se inventa, se pide.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { auth } from '@/core/config/firebase.client'

const REDUCCION_BPS_SLL = 35 // -35 bps es una referencia de mercado (SLL típico), no un otorgamiento real

function claveStorage(): string {
  return `agrofinance_linea_credito_${auth.currentUser?.uid || 'invitado'}`
}

const EVENTO_CAMBIO = 'agrofinance:linea-credito-cambio'

export function guardarLineaCredito(montoUsd: number | null): void {
  if (typeof window === 'undefined') return
  if (montoUsd === null) window.localStorage.removeItem(claveStorage())
  else window.localStorage.setItem(claveStorage(), String(montoUsd))
  window.dispatchEvent(new Event(EVENTO_CAMBIO))
}

function leerLineaCredito(): number | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(claveStorage())
  if (raw === null) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Devuelve [montoDeclarado, guardar]. `null` = el usuario todavía no lo declaró. */
export function useLineaCredito(): [number | null, (monto: number | null) => void] {
  const [monto, setMontoLocal] = useState<number | null>(null)

  useEffect(() => {
    setMontoLocal(leerLineaCredito())
    const onCambio = () => setMontoLocal(leerLineaCredito())
    window.addEventListener(EVENTO_CAMBIO, onCambio)
    window.addEventListener('storage', onCambio)
    return () => {
      window.removeEventListener(EVENTO_CAMBIO, onCambio)
      window.removeEventListener('storage', onCambio)
    }
  }, [])

  const setMonto = useCallback((m: number | null) => {
    guardarLineaCredito(m)
    setMontoLocal(m)
  }, [])

  return [monto, setMonto]
}

export type AhorroCredito = {
  disponible: boolean
  montoDeclarado: number | null
  ahorroAnualUsd: number
  bps: number
}

/** −35 bps es una referencia pública de mercado para SLL agroexportador, no
 *  la tasa que el banco vaya a otorgar realmente — se muestra rotulada como
 *  estimado, nunca como un ahorro confirmado. */
export function calcularAhorroCredito(montoDeclarado: number | null): AhorroCredito {
  if (montoDeclarado === null || montoDeclarado <= 0) {
    return { disponible: false, montoDeclarado: null, ahorroAnualUsd: 0, bps: REDUCCION_BPS_SLL }
  }
  const ahorroAnualUsd = Math.round(montoDeclarado * (REDUCCION_BPS_SLL / 10000))
  return { disponible: true, montoDeclarado, ahorroAnualUsd, bps: REDUCCION_BPS_SLL }
}
