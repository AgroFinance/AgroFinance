'use client'

// ============================================================
// AgroFinance — Registro de gasto ambiental en dinero (RF-B5)
// ------------------------------------------------------------
// El holding de una de las agroexportadoras entrevistadas no pide UN
// reporte, pide DOS: el resultado del monitoreo ambiental y, por separado,
// la inversión monetaria hecha en medio ambiente durante el periodo.
//
//   "No todo es la inversión en la plataforma, es la inversión en el
//    recurso de la empresa para entregar la información."
//
// La plataforma calculaba muy bien el indicador físico (tCO₂e) y no tenía
// dónde anotar el indicador monetario, así que esa mitad del entregable se
// seguía armando a mano en Excel. Este módulo cierra esa mitad.
//
// Decisiones que sostienen la auditoría:
//  · Cada partida guarda su documento de respaldo. Un gasto sin respaldo se
//    puede registrar, pero se marca — no se esconde.
//  · Dos monedas conviven (el auditor de huella cotiza en USD, el
//    proveedor local factura en soles). El tipo de cambio NO se inventa:
//    lo declara el usuario y se imprime en el informe, que es lo que
//    permite reproducir el total.
//  · El ratio S//tCO₂e solo se calcula si hay huella; sin ella se declara
//    null y la UI muestra "sin dato" (RNF-G3).
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { sanitizar } from './anotaciones'
import { auth } from './firebase'

export type Moneda = 'PEN' | 'USD'

export const MONEDA_SIMBOLO: Record<Moneda, string> = { PEN: 'S/', USD: 'US$' }

/**
 * Categorías tomadas de las obligaciones que las propias agroexportadoras
 * nombraron en entrevista, no de un catálogo genérico de sostenibilidad.
 */
export type CategoriaGasto =
  | 'monitoreos'
  | 'residuos'
  | 'residuosPeligrosos'
  | 'certificaciones'
  | 'instrumentos'
  | 'agua'
  | 'eficiencia'
  | 'capacitacion'
  | 'verificacion'
  | 'otros'

export type MetaCategoria = {
  label: string
  detalle: string
  /** Obligación legal recurrente: sirve para avisar si el periodo va vacío. */
  obligatorio: boolean
}

export const CATEGORIA_META: Record<CategoriaGasto, MetaCategoria> = {
  monitoreos: {
    label: 'Monitoreos ambientales',
    detalle: 'Monitoreo anual de agua, aire, suelo o ruido con firma de profesional a cargo.',
    obligatorio: true,
  },
  residuos: {
    label: 'Gestión de residuos sólidos',
    detalle: 'Recolección, transporte y disposición final por EO-RS autorizada. Sustenta la declaración anual.',
    obligatorio: true,
  },
  residuosPeligrosos: {
    label: 'Residuos peligrosos',
    detalle: 'Manejo y disposición de residuos peligrosos — declaración trimestral.',
    obligatorio: true,
  },
  certificaciones: {
    label: 'Certificaciones y auditorías',
    detalle: 'BRC, SMETA, BASC, ISO, GLOBALG.A.P. y auditorías de cliente.',
    obligatorio: false,
  },
  instrumentos: {
    label: 'Instrumentos de gestión ambiental',
    detalle: 'Elaboración, actualización o modificación de PAMA, DIA, PAD o IGA equivalente.',
    obligatorio: false,
  },
  agua: {
    label: 'Agua y efluentes',
    detalle: 'Tratamiento de efluentes, licencias de uso de agua y obras de eficiencia hídrica.',
    obligatorio: false,
  },
  eficiencia: {
    label: 'Eficiencia energética',
    detalle: 'Inversión que reduce consumo: banco de condensadores, motores eficientes, iluminación, solar.',
    obligatorio: false,
  },
  capacitacion: {
    label: 'Capacitación ambiental',
    detalle: 'Formación del personal en gestión ambiental y buenas prácticas.',
    obligatorio: false,
  },
  verificacion: {
    label: 'Verificación de tercero',
    detalle: 'Auditoría independiente de la huella por organismo acreditado.',
    obligatorio: false,
  },
  otros: {
    label: 'Otros gastos ambientales',
    detalle: 'Partidas ambientales que no encajan en las categorías anteriores.',
    obligatorio: false,
  },
}

export const CATEGORIAS: CategoriaGasto[] = Object.keys(CATEGORIA_META) as CategoriaGasto[]

export type PartidaGasto = {
  id: string
  categoria: CategoriaGasto
  concepto: string
  monto: number
  moneda: Moneda
  /** ISO date (YYYY-MM-DD) del comprobante. */
  fecha: string
  proveedor: string
  /** Nº de factura, orden de compra o informe que respalda la partida. */
  respaldo: string
}

export type EstadoGasto = {
  partidas: PartidaGasto[]
  /** Soles por 1 USD. Lo declara el usuario; se imprime en el informe. */
  tipoCambio: number
}

/** Valor de arranque, editable. Se declara como "tipo de cambio declarado". */
export const TIPO_CAMBIO_POR_DEFECTO = 3.75

export const GASTO_VACIO: EstadoGasto = { partidas: [], tipoCambio: TIPO_CAMBIO_POR_DEFECTO }

function STORAGE_KEY(): string {
  return `agrofinance_gasto_ambiental_${auth.currentUser?.uid || 'invitado'}`
}
const EVENTO = 'agrofinance:gasto-ambiental-cambio'

// ============================================================
// Persistencia
// ============================================================
export function leerGasto(): EstadoGasto {
  if (typeof window === 'undefined') return GASTO_VACIO
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY())
    if (!raw) return GASTO_VACIO
    const p = JSON.parse(raw)
    const partidas: PartidaGasto[] = Array.isArray(p?.partidas) ? p.partidas.filter(esPartidaValida) : []
    const tc = Number(p?.tipoCambio)
    return {
      partidas,
      tipoCambio: isFinite(tc) && tc > 0 ? tc : TIPO_CAMBIO_POR_DEFECTO,
    }
  } catch {
    return GASTO_VACIO
  }
}

function esPartidaValida(x: unknown): x is PartidaGasto {
  const p = x as PartidaGasto
  return (
    !!p && typeof p.id === 'string' && typeof p.concepto === 'string' &&
    typeof p.monto === 'number' && isFinite(p.monto) &&
    (p.moneda === 'PEN' || p.moneda === 'USD') &&
    CATEGORIAS.includes(p.categoria)
  )
}

export function guardarGasto(e: EstadoGasto) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY(), JSON.stringify(e))
  window.dispatchEvent(new Event(EVENTO))
}

// ============================================================
// Conversión y agregados
// ============================================================

/** Todo se normaliza a soles para poder sumar; el tipo de cambio se declara. */
export function aSoles(p: PartidaGasto, tipoCambio: number): number {
  return p.moneda === 'USD' ? p.monto * tipoCambio : p.monto
}

export type ResumenCategoria = {
  categoria: CategoriaGasto
  label: string
  totalPEN: number
  partidas: number
  pct: number
  obligatorio: boolean
  /** true cuando es obligación recurrente y no hay ninguna partida cargada. */
  faltante: boolean
}

export type ResumenGasto = {
  totalPEN: number
  totalUSDOriginal: number
  totalPENOriginal: number
  partidas: number
  tipoCambio: number
  porCategoria: ResumenCategoria[]
  /** Soles invertidos por tonelada de CO₂e del inventario. null sin huella. */
  solesPorTon: number | null
  /** Partidas sin documento de respaldo declarado — las ve el auditor. */
  sinRespaldo: number
  /** Obligaciones legales recurrentes sin ninguna partida en el periodo. */
  obligacionesSinGasto: string[]
  tieneDatos: boolean
}

export function resumirGasto(estado: EstadoGasto, huellaTotalTon: number): ResumenGasto {
  const { partidas, tipoCambio } = estado

  let totalPEN = 0
  let totalUSDOriginal = 0
  let totalPENOriginal = 0
  let sinRespaldo = 0
  const acum = new Map<CategoriaGasto, { total: number; n: number }>()

  for (const p of partidas) {
    const enSoles = aSoles(p, tipoCambio)
    totalPEN += enSoles
    if (p.moneda === 'USD') totalUSDOriginal += p.monto
    else totalPENOriginal += p.monto
    if (!p.respaldo?.trim()) sinRespaldo++
    const prev = acum.get(p.categoria)
    if (prev) {
      prev.total += enSoles
      prev.n += 1
    } else {
      acum.set(p.categoria, { total: enSoles, n: 1 })
    }
  }

  const porCategoria: ResumenCategoria[] = CATEGORIAS.map((c) => {
    const a = acum.get(c)
    const total = a?.total ?? 0
    const meta = CATEGORIA_META[c]
    return {
      categoria: c,
      label: meta.label,
      totalPEN: +total.toFixed(2),
      partidas: a?.n ?? 0,
      pct: totalPEN > 0 ? +((total / totalPEN) * 100).toFixed(1) : 0,
      obligatorio: meta.obligatorio,
      faltante: meta.obligatorio && (a?.n ?? 0) === 0,
    }
  })
    .filter((r) => r.partidas > 0 || r.obligatorio)
    .sort((a, b) => b.totalPEN - a.totalPEN)

  return {
    totalPEN: +totalPEN.toFixed(2),
    totalUSDOriginal: +totalUSDOriginal.toFixed(2),
    totalPENOriginal: +totalPENOriginal.toFixed(2),
    partidas: partidas.length,
    tipoCambio,
    porCategoria,
    // Sin partidas cargadas el ratio es "sin dato", NO cero: un S/ 0,00 se lee
    // como "no invertimos nada este periodo", que es una afirmación distinta
    // y que nadie declaró (RNF-G3).
    solesPorTon:
      partidas.length > 0 && huellaTotalTon > 0
        ? +(totalPEN / huellaTotalTon).toFixed(2)
        : null,
    sinRespaldo,
    obligacionesSinGasto: porCategoria.filter((r) => r.faltante).map((r) => r.label),
    tieneDatos: partidas.length > 0,
  }
}

export const formatoPEN = (n: number) =>
  `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ============================================================
// Hook
// ============================================================
export function useGastoAmbiental() {
  const [estado, setEstado] = useState<EstadoGasto>(GASTO_VACIO)

  useEffect(() => {
    setEstado(leerGasto())
    const on = () => setEstado(leerGasto())
    window.addEventListener(EVENTO, on)
    window.addEventListener('storage', on)
    return () => {
      window.removeEventListener(EVENTO, on)
      window.removeEventListener('storage', on)
    }
  }, [])

  const agregar = useCallback((p: Omit<PartidaGasto, 'id'>) => {
    setEstado((prev) => {
      const partida: PartidaGasto = {
        ...p,
        id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        concepto: sanitizar(p.concepto, 200),
        proveedor: sanitizar(p.proveedor, 120),
        respaldo: sanitizar(p.respaldo, 120),
      }
      const next = { ...prev, partidas: [partida, ...prev.partidas] }
      guardarGasto(next)
      return next
    })
  }, [])

  const eliminar = useCallback((id: string) => {
    setEstado((prev) => {
      const next = { ...prev, partidas: prev.partidas.filter((p) => p.id !== id) }
      guardarGasto(next)
      return next
    })
  }, [])

  const setTipoCambio = useCallback((tc: number) => {
    setEstado((prev) => {
      if (!isFinite(tc) || tc <= 0) return prev
      const next = { ...prev, tipoCambio: tc }
      guardarGasto(next)
      return next
    })
  }, [])

  return { estado, agregar, eliminar, setTipoCambio }
}
