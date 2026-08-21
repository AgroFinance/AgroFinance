'use client'

// ============================================================
// AgroFinance — Historial real de huella (para "X% vs período anterior")
// ------------------------------------------------------------
// Antes "8% vs campaña anterior" era una constante fija — no había ninguna
// campaña anterior real contra la cual comparar, así que era un número sin
// respaldo. Este módulo guarda una foto de la huella total cada vez que
// cambia de verdad, con fecha real. La comparación solo se muestra cuando
// hay al menos 2 fotos reales — sin eso, no hay "antes" que comparar, y se
// declara así en vez de inventar un porcentaje.
// ============================================================

import { useEffect, useState } from 'react'
import { auth } from '@/core/config/firebase.client'

type Snapshot = { fechaIso: string; huellaTon: number }

const MAX_SNAPSHOTS = 24

function claveStorage(): string {
  return `agrofinance_historial_huella_${auth.currentUser?.uid || 'invitado'}`
}

function leerHistorial(): Snapshot[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(claveStorage())
    return raw ? (JSON.parse(raw) as Snapshot[]) : []
  } catch {
    return []
  }
}

/** Agrega una foto solo si el valor cambió de verdad desde la última —
 *  así no se llena el historial con la misma cifra repetida en cada render. */
function registrarSiCambio(huellaTon: number): Snapshot[] {
  const historial = leerHistorial()
  const ultima = historial[historial.length - 1]
  if (ultima && Math.abs(ultima.huellaTon - huellaTon) < 0.001) return historial
  const actualizado = [...historial, { fechaIso: new Date().toISOString(), huellaTon }].slice(-MAX_SNAPSHOTS)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(claveStorage(), JSON.stringify(actualizado))
  }
  return actualizado
}

export type ComparacionHuella = {
  disponible: boolean
  variacionPct: number | null
  /** true si bajó (mejora); false si subió; null sin dato. */
  esReduccion: boolean | null
  fechaComparada: string | null
}

/** Se suscribe al total actual: registra una foto si cambió, y devuelve la
 *  comparación real contra la primera foto guardada (la más antigua
 *  disponible) — no contra un "período anterior" que no existe todavía. */
export function useComparacionHuella(huellaTonActual: number, tieneDatos: boolean): ComparacionHuella {
  const [historial, setHistorial] = useState<Snapshot[]>([])

  useEffect(() => {
    if (!tieneDatos || huellaTonActual <= 0) return
    setHistorial(registrarSiCambio(huellaTonActual))
  }, [huellaTonActual, tieneDatos])

  if (historial.length < 2) {
    return { disponible: false, variacionPct: null, esReduccion: null, fechaComparada: null }
  }
  const primera = historial[0]
  if (primera.huellaTon <= 0) {
    return { disponible: false, variacionPct: null, esReduccion: null, fechaComparada: null }
  }
  const variacionPct = +(((huellaTonActual - primera.huellaTon) / primera.huellaTon) * 100).toFixed(1)
  return {
    disponible: true,
    variacionPct: Math.abs(variacionPct),
    esReduccion: variacionPct <= 0,
    fechaComparada: new Date(primera.fechaIso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
  }
}
