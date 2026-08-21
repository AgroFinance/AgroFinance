'use client'

// ============================================================
// AgroFinance — Anotaciones del usuario que viajan al reporte
// ------------------------------------------------------------
// Dos cosas que el analista escribe a mano y que un auditor externo
// necesita leer junto al número:
//
//   1. Nota de sustento del benchmark — por qué la intensidad peruana
//      difiere de la referencia (mano de obra intensiva, salinidad de
//      suelo/agua, régimen laboral, distancia al mercado).
//   2. Nota de varianza interanual — qué explica el Δ vs. la campaña
//      anterior de un producto.
//
// Ambas se guardan en localStorage en un modelo serializable, no en el DOM,
// para que el módulo de Reportes pueda incluirlas en el PDF.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { auth } from './firebase'

export type Anotaciones = {
  /** clave: cultivo → texto libre */
  sustentoBenchmark: Record<string, string>
  /** clave: `${producto}__${periodo}` → texto libre */
  varianza: Record<string, string>
  /** clave: cultivo → alcance de benchmark elegido */
  alcanceBenchmark: Record<string, string>
}

export const ANOTACIONES_VACIAS: Anotaciones = {
  sustentoBenchmark: {},
  varianza: {},
  alcanceBenchmark: {},
}

function STORAGE_KEY(): string {
  return `agrofinance_anotaciones_${auth.currentUser?.uid || 'invitado'}`
}
const EVENTO = 'agrofinance:anotaciones-cambiaron'

const NL = String.fromCharCode(10)
const TAB = String.fromCharCode(9)

/**
 * Sanitiza texto libre antes de renderizarlo en pantalla o en el PDF.
 * Quita marcado, caracteres de control y colapsa espacios. No confiamos en
 * que React escape por nosotros: el mismo texto se pinta en jsPDF, donde no
 * hay escapado automatico de ningun tipo.
 */
export function sanitizar(texto: string, maxLargo = 1200): string {
  const sinControl = Array.from(texto ?? '')
    .filter((ch) => {
      const c = ch.charCodeAt(0)
      return c === 10 || c === 9 || (c >= 32 && c !== 127)
    })
    .join('')
  return sinControl
    .replace(/<[^>]*>/g, '') // etiquetas de marcado
    .split(NL)
    .map((linea) => linea.split(TAB).join(' ').replace(/ {2,}/g, ' ').trimEnd())
    .join(NL)
    .slice(0, maxLargo)
    .trim()
}

export function leerAnotaciones(): Anotaciones {
  if (typeof window === 'undefined') return ANOTACIONES_VACIAS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY())
    if (!raw) return ANOTACIONES_VACIAS
    const p = JSON.parse(raw)
    return {
      sustentoBenchmark: p?.sustentoBenchmark ?? {},
      varianza: p?.varianza ?? {},
      alcanceBenchmark: p?.alcanceBenchmark ?? {},
    }
  } catch {
    return ANOTACIONES_VACIAS
  }
}

export function guardarAnotaciones(a: Anotaciones) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY(), JSON.stringify(a))
  window.dispatchEvent(new Event(EVENTO))
}

export const claveVarianza = (producto: string, periodo: string) => `${producto}__${periodo}`

export function useAnotaciones() {
  const [anotaciones, setLocal] = useState<Anotaciones>(ANOTACIONES_VACIAS)

  useEffect(() => {
    setLocal(leerAnotaciones())
    const on = () => setLocal(leerAnotaciones())
    window.addEventListener(EVENTO, on)
    window.addEventListener('storage', on)
    return () => {
      window.removeEventListener(EVENTO, on)
      window.removeEventListener('storage', on)
    }
  }, [])

  const setSustento = useCallback((cultivo: string, texto: string) => {
    setLocal((prev) => {
      const next = { ...prev, sustentoBenchmark: { ...prev.sustentoBenchmark, [cultivo]: sanitizar(texto) } }
      guardarAnotaciones(next)
      return next
    })
  }, [])

  const setVarianza = useCallback((producto: string, periodo: string, texto: string) => {
    setLocal((prev) => {
      const varianza = { ...prev.varianza }
      const limpio = sanitizar(texto)
      // Sin texto no se guarda una clave vacía: el PDF no debe emitir
      // secciones huérfanas por notas que el usuario abrió y cerró.
      if (limpio) varianza[claveVarianza(producto, periodo)] = limpio
      else delete varianza[claveVarianza(producto, periodo)]
      const next = { ...prev, varianza }
      guardarAnotaciones(next)
      return next
    })
  }, [])

  const setAlcance = useCallback((cultivo: string, alcance: string) => {
    setLocal((prev) => {
      const next = { ...prev, alcanceBenchmark: { ...prev.alcanceBenchmark, [cultivo]: alcance } }
      guardarAnotaciones(next)
      return next
    })
  }, [])

  return { anotaciones, setSustento, setVarianza, setAlcance }
}
