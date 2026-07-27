'use client'

/**
 * Datos de prueba — fuente única de verdad de lo que Configuración muestra.
 *
 * Antes, la tabla de "Fuentes de datos" vivía en un useState local de
 * configuracion/page.tsx: al borrar un archivo desaparecía de la tabla,
 * pero (a) nunca se guardaba en ningún lado, así que al salir y volver a
 * entrar reaparecía tal cual, y (b) el resto de la app (Dashboard, Análisis)
 * calculaba la huella desde arrays estáticos de pilotEngine que jamás se
 * enteraban de que un archivo fue eliminado. Es decir: borrar no borraba
 * nada de verdad.
 *
 * Este archivo resuelve ambas cosas:
 *  1. Persiste la lista de fuentes en localStorage, así sí se queda borrado.
 *  2. Expone `useFuentesActivas()`, que traduce esa lista a qué partes del
 *     motor de cálculo (riego / producción / finanzas / logística) siguen
 *     alimentadas — así el Scope 1/2/3 en /analisis baja de verdad.
 */

import { useCallback, useEffect, useState } from 'react'
import { campos, packing, envios } from './pilotData'
import type { FuenteId, FuentesActivas } from './pilotEngine'
import { FUENTES_TODAS_ACTIVAS } from './pilotEngine'

export type EstadoFuente = 'sincronizado' | 'procesando' | 'error'
export type PreviewFuente = { columnas: string[]; filas: (string | number)[][] }
export type FuenteDatos = {
  id: string
  /** Solo las 4 fuentes demo lo tienen; es lo que conecta con el motor de cálculo. */
  fuenteId?: FuenteId
  area: string
  archivo: string
  actualizado: string
  estado: EstadoFuente
  isDemo?: boolean
  progress?: number
  preview: PreviewFuente
}

// Las 4 fuentes demo del piloto — cada una es una porción REAL de pilotData,
// no un adorno visual.
export const FUENTES_DEMO_INICIALES: FuenteDatos[] = [
  {
    id: '1', fuenteId: 'riego', area: 'Riego', archivo: 'Control_de_Campo_.xlsx', isDemo: true,
    actualizado: '01 Jun 2026', estado: 'sincronizado',
    preview: {
      columnas: ['id_campo', 'empresa', 'cultivo', 'hectareas', 'electricidad_riego_kwh', 'fertilizante_nitrogenado_kg'],
      filas: campos.map((c) => [c.idCampo, c.empresa, c.cultivo, c.hectareas, c.electricidadRiegoKwh, c.fertilizanteKg]),
    },
  },
  {
    id: '2', fuenteId: 'logistica', area: 'Logística', archivo: 'Tracking_Aduanas_Exportacion.xlsx', isDemo: true,
    actualizado: '28 May 2026', estado: 'sincronizado',
    preview: {
      columnas: ['id_envio', 'cultivo', 'fecha_despacho', 'puerto_destino_europa', 'peso_neto_fruta_kg', 'distancia_maritima_km'],
      filas: envios.slice(0, 14).map((e) => [e.idEnvio, e.cultivo, e.fecha, e.puertoDestino, e.pesoNetoKg, e.distanciaMaritimaKm]),
    },
  },
  {
    id: '3', fuenteId: 'finanzas', area: 'Finanzas', archivo: 'Reporte_Mensual_Packing_y_Mermas.xlsx', isDemo: true,
    actualizado: '30 May 2026', estado: 'sincronizado',
    preview: {
      columnas: ['id_packing', 'empresa', 'electricidad_packing_kwh', 'toneladas_procesadas', 'ratio_descarte_local_pct'],
      filas: packing.map((p) => [p.idPacking, p.empresa, p.electricidadPackingKwh, p.toneladasProcesadas, p.ratioDescartePct]),
    },
  },
  {
    id: '4', fuenteId: 'produccion', area: 'Producción', archivo: 'Control_de_Campo_Masivo_Q1_Q4.xlsx', isDemo: true,
    actualizado: 'En proceso', estado: 'procesando', progress: 45,
    preview: {
      columnas: ['id_campo', 'cultivo', 'diesel_campo_gal', 'rendimiento_total_tn'],
      filas: campos.map((c) => [c.idCampo, c.cultivo, c.dieselGal, c.rendimientoTon]),
    },
  },
]

const STORAGE_KEY = 'agrofinance_fuentes_datos'
const EVENTO_CAMBIO = 'agrofinance:fuentes-cambiaron'

export function leerFuentes(): FuenteDatos[] {
  if (typeof window === 'undefined') return FUENTES_DEMO_INICIALES
  try {
    const guardado = window.localStorage.getItem(STORAGE_KEY)
    if (!guardado) return FUENTES_DEMO_INICIALES
    const parsed = JSON.parse(guardado)
    return Array.isArray(parsed) ? parsed : FUENTES_DEMO_INICIALES
  } catch {
    return FUENTES_DEMO_INICIALES
  }
}

export function guardarFuentes(fuentes: FuenteDatos[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fuentes))
  // Notifica a otras vistas montadas en la misma pestaña (storage event no
  // dispara en el mismo documento que escribió).
  window.dispatchEvent(new Event(EVENTO_CAMBIO))
}

/**
 * Hook con la misma forma que useState, pero que persiste cada cambio y
 * se re-hidrata si otra pestaña/componente modifica los datos.
 */
export function useFuentesDatos(): [FuenteDatos[], (actualizar: FuenteDatos[] | ((prev: FuenteDatos[]) => FuenteDatos[])) => void] {
  // Arranca con el set demo para que el primer render (servidor y cliente)
  // coincida; se hidrata desde localStorage justo después del mount.
  const [fuentes, setFuentesLocal] = useState<FuenteDatos[]>(FUENTES_DEMO_INICIALES)

  useEffect(() => {
    setFuentesLocal(leerFuentes())
    const onCambio = () => setFuentesLocal(leerFuentes())
    window.addEventListener(EVENTO_CAMBIO, onCambio)
    window.addEventListener('storage', onCambio)
    return () => {
      window.removeEventListener(EVENTO_CAMBIO, onCambio)
      window.removeEventListener('storage', onCambio)
    }
  }, [])

  const setFuentes = useCallback((actualizar: FuenteDatos[] | ((prev: FuenteDatos[]) => FuenteDatos[])) => {
    setFuentesLocal((prev) => {
      const siguiente = typeof actualizar === 'function' ? actualizar(prev) : actualizar
      guardarFuentes(siguiente)
      return siguiente
    })
  }, [])

  return [fuentes, setFuentes]
}

/** Restaura las 4 fuentes demo originales (deshace todos los borrados). */
export function reiniciarFuentesDemo() {
  guardarFuentes(FUENTES_DEMO_INICIALES)
}

const IDS_FUENTE: FuenteId[] = ['riego', 'produccion', 'finanzas', 'logistica']

/** Una fuente demo está "activa" si su archivo sigue en la lista y no quedó en error. */
export function fuentesActivasDesde(fuentes: FuenteDatos[]): FuentesActivas {
  const activas = { ...FUENTES_TODAS_ACTIVAS }
  for (const id of IDS_FUENTE) {
    activas[id] = fuentes.some((f) => f.fuenteId === id && f.estado !== 'error')
  }
  return activas
}

/** Qué fuentes están inactivas ahora mismo, para mostrar el motivo en la UI. */
export function fuentesInactivas(fuentes: FuenteDatos[]): FuenteId[] {
  return IDS_FUENTE.filter((id) => !fuentes.some((f) => f.fuenteId === id && f.estado !== 'error'))
}

export const ETIQUETA_FUENTE: Record<FuenteId, string> = {
  riego: 'Riego',
  produccion: 'Producción',
  finanzas: 'Finanzas',
  logistica: 'Logística',
}

/** Deriva directamente qué partes del cálculo siguen alimentadas. Útil en
 *  componentes que solo necesitan el resultado, sin manejar la lista completa. */
export function useFuentesActivas(): FuentesActivas {
  const [fuentes] = useFuentesDatos()
  return fuentesActivasDesde(fuentes)
}
