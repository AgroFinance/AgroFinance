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
import { auth } from './firebase'
import { campos, packing, envios } from './pilotData'
import { aguaCampos, aguaPacking } from './pilotDataAgua'
import type { FuenteId, FuentesActivas } from './pilotEngine'
import { ghgClassify, type LineaClasificada, type LineaLeida, type ResumenClasificacion } from './ghgClassify'
import { FUENTES_TODAS_ACTIVAS } from './pilotEngine'

// ============================================================
// Líneas clasificadas de los 4 archivos demo — complejas y multivariadas
// a propósito, para que el reconocimiento de columnas (ghgClassify +
// huellaHidrica) tenga algo real que leer incluso sin que el usuario suba
// nada, y para que sirvan de caso de prueba del propio motor: mezclan
// sinónimos de columna distintos entre archivos, unidades en prefijo y en
// sufijo, columnas numéricas sin factor asignable (deben quedar
// "ignoradas" con motivo, no inventarse un factor), una fila oculta y un
// valor negativo (nota de crédito). No alimentan huellaConsolidada (esa
// sigue viniendo de pilotEngine sobre campos/packing/envios) — solo
// alimentan huellaHidrica y la vista de depuración de estos archivos.
// ============================================================
let _idLinea = 0
const linea = (
  campoLeido: string, valor: number | null, unidad: string, hoja: string, opts?: { oculto?: boolean; crudo?: string },
): LineaLeida => ({
  id: `demo-${++_idLinea}`, campoLeido, valor, unidad, hoja, fila: _idLinea, ...opts,
})

function lineasControlDeCampo(): LineaClasificada[] {
  const crudas: LineaLeida[] = []
  campos.forEach((c, i) => {
    const hoja = c.cultivo === 'Palta Hass' ? 'Campo - Palta' : 'Campo - Mango'
    const agua = aguaCampos.find((a) => a.idCampo === c.idCampo)
    crudas.push(linea('hectareas', c.hectareas, '', hoja)) // numérica, sin factor: debe quedar ignorada
    crudas.push(linea('electricidad_riego_kwh', c.electricidadRiegoKwh, 'kWh', hoja))
    crudas.push(linea('fertilizante_nitrogenado_kg', c.fertilizanteKg, 'kg', hoja))
    // Sinónimo distinto al de "packing.xlsx" para el mismo mecanismo — prueba
    // que reconocerFactor() no depende de un único nombre de columna.
    crudas.push(linea('riego_agua_m3', agua?.aguaRiegoM3 ?? null, 'm3', hoja))
    crudas.push(linea('rendimiento_total_tn', c.rendimientoTon, 't', hoja)) // numérica, sin factor
    // Complejidad deliberada: una fila en hoja oculta (no debe sumar), y una
    // nota de crédito con valor negativo (no debe sumar, motivo distinto).
    if (i === 0) crudas.push(linea('electricidad_riego_kwh', 450, 'kWh', 'Ajustes internos', { oculto: true }))
    if (i === campos.length - 1) crudas.push(linea('diesel_maquinaria_gal', -12, 'gal', hoja, { crudo: '-12 (nota de crédito grifo)' }))
  })
  return ghgClassify(crudas)
}

function lineasLogistica(): LineaClasificada[] {
  const crudas: LineaLeida[] = envios.slice(0, 14).map((e) =>
    linea('distancia_maritima_km', e.distanciaMaritimaKm, 'km', 'Aduanas'))
  envios.slice(0, 14).forEach((e) => {
    crudas.push(linea('distancia_terrestre_camion_km', e.distanciaCamionKm, 'km', 'Aduanas'))
    crudas.push(linea('peso_neto_fruta_kg', e.pesoNetoKg, 'kg', 'Aduanas')) // sin factor: ignorada
    crudas.push(linea('cajas_carton_despachadas', e.cajasCarton, 'u', 'Aduanas'))
    crudas.push(linea('palets_madera_u', e.paletsU, 'u', 'Aduanas'))
    crudas.push(linea('dias_transito_maritimo', e.diasTransitoMar, '', 'Aduanas')) // sin factor: ignorada
  })
  return ghgClassify(crudas)
}

function lineasPacking(): LineaClasificada[] {
  const crudas: LineaLeida[] = []
  packing.forEach((p) => {
    const agua = aguaPacking.find((a) => a.idPacking === p.idPacking)
    crudas.push(linea('electricidad_packing_kwh', p.electricidadPackingKwh, 'kWh', 'Packing'))
    crudas.push(linea('toneladas_procesadas', p.toneladasProcesadas, 't', 'Packing')) // sin factor: ignorada
    crudas.push(linea('ratio_descarte_local_pct', p.ratioDescartePct, '%', 'Packing')) // sin factor: ignorada
    // Sinónimo de agua distinto al de "Control_de_Campo": prueba que el
    // reconocimiento no dependa del nombre exacto de columna del otro archivo.
    crudas.push(linea('agua_lavado_prefrio_m3', agua?.aguaLavadoM3 ?? null, 'm3', 'Packing'))
    crudas.push(linea('kg_carton_corrugado_empaque', Math.round(p.toneladasProcesadas * 0.42), 'kg', 'Packing'))
    crudas.push(linea('kg_film_plastico_ldpe', Math.round(p.toneladasProcesadas * 0.06), 'kg', 'Packing'))
  })
  return ghgClassify(crudas)
}

function lineasProduccion(): LineaClasificada[] {
  const crudas: LineaLeida[] = []
  campos.forEach((c) => {
    crudas.push(linea('diesel_campo_gal', c.dieselGal, 'gal', 'Produccion Q1-Q4'))
    crudas.push(linea('rendimiento_total_tn', c.rendimientoTon, 't', 'Produccion Q1-Q4')) // sin factor
    // Celda con texto en vez de número: parseArchivo real la descartaría
    // antes de llegar aquí; se documenta con `crudo` para que la vista de
    // depuración explique por qué esa línea no aparece.
    crudas.push(linea('estado_cosecha', null, '', 'Produccion Q1-Q4', { crudo: 'en curso' }))
  })
  return ghgClassify(crudas)
}

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
  /** De donde vino: set demo, vinculacion en Configuracion o carga en Analizar Datos. */
  origen?: 'demo' | 'configuracion' | 'upload'
  /** Identidad del archivo (nombre+tamano+fecha): base de la idempotencia. */
  huella?: string
  /** Motivo legible cuando el estado es 'error'. */
  motivoError?: string
  /** Hojas recorridas por el parser (las ocultas vienen marcadas). */
  hojas?: string[]
  /** Lineas clasificadas por ghgClassify — la trazabilidad linea a linea. */
  lineas?: LineaClasificada[]
  /** Agregado del archivo: leidas, ignoradas, emision, scopes, mecanismos. */
  resumen?: ResumenClasificacion
}

// Las 4 fuentes demo del piloto — cada una es una porción REAL de pilotData,
// no un adorno visual.
export const FUENTES_DEMO_INICIALES: FuenteDatos[] = [
  {
    id: '1', fuenteId: 'riego', area: 'Riego', archivo: 'Control_de_Campo_.xlsx', isDemo: true, origen: 'demo',
    actualizado: '01 Jun 2026', estado: 'sincronizado',
    preview: {
      columnas: ['id_campo', 'empresa', 'cultivo', 'hectareas', 'electricidad_riego_kwh', 'fertilizante_nitrogenado_kg', 'riego_agua_m3'],
      filas: campos.map((c) => [
        c.idCampo, c.empresa, c.cultivo, c.hectareas, c.electricidadRiegoKwh, c.fertilizanteKg,
        aguaCampos.find((a) => a.idCampo === c.idCampo)?.aguaRiegoM3 ?? '',
      ]),
    },
    lineas: lineasControlDeCampo(),
  },
  {
    id: '2', fuenteId: 'logistica', area: 'Logística', archivo: 'Tracking_Aduanas_Exportacion.xlsx', isDemo: true, origen: 'demo',
    actualizado: '28 May 2026', estado: 'sincronizado',
    preview: {
      columnas: ['id_envio', 'cultivo', 'fecha_despacho', 'puerto_destino_europa', 'peso_neto_fruta_kg', 'distancia_maritima_km'],
      filas: envios.slice(0, 14).map((e) => [e.idEnvio, e.cultivo, e.fecha, e.puertoDestino, e.pesoNetoKg, e.distanciaMaritimaKm]),
    },
    lineas: lineasLogistica(),
  },
  {
    id: '3', fuenteId: 'finanzas', area: 'Finanzas', archivo: 'Reporte_Mensual_Packing_y_Mermas.xlsx', isDemo: true, origen: 'demo',
    actualizado: '30 May 2026', estado: 'sincronizado',
    preview: {
      columnas: ['id_packing', 'empresa', 'electricidad_packing_kwh', 'toneladas_procesadas', 'ratio_descarte_local_pct', 'agua_lavado_prefrio_m3'],
      filas: packing.map((p) => [
        p.idPacking, p.empresa, p.electricidadPackingKwh, p.toneladasProcesadas, p.ratioDescartePct,
        aguaPacking.find((a) => a.idPacking === p.idPacking)?.aguaLavadoM3 ?? '',
      ]),
    },
    lineas: lineasPacking(),
  },
  {
    id: '4', fuenteId: 'produccion', area: 'Producción', archivo: 'Control_de_Campo_Masivo_Q1_Q4.xlsx', isDemo: true, origen: 'demo',
    actualizado: 'En proceso', estado: 'procesando', progress: 45,
    preview: {
      columnas: ['id_campo', 'cultivo', 'diesel_campo_gal', 'rendimiento_total_tn'],
      filas: campos.map((c) => [c.idCampo, c.cultivo, c.dieselGal, c.rendimientoTon]),
    },
    lineas: lineasProduccion(),
  },
]

// Sufijadas por cuenta (uid) para que cada usuario vea solo sus propias
// fuentes/demo en el mismo navegador — antes era una sola clave global
// compartida por cualquiera que abriera la app.
function claveStorage(): string {
  return `agrofinance_fuentes_datos_${auth.currentUser?.uid || 'invitado'}`
}
function claveVersion(): string {
  return `agrofinance_fuentes_demo_version_${auth.currentUser?.uid || 'invitado'}`
}
const EVENTO_CAMBIO = 'agrofinance:fuentes-cambiaron'

// Versión del set demo embebido en el código (no del que guardó el
// usuario). Súbela cada vez que cambien FUENTES_DEMO_INICIALES — por
// ejemplo al agregar las columnas de agua — para que el navegador de
// alguien que ya tenía datos guardados en localStorage de una sesión
// anterior reciba el set nuevo en vez de quedarse con el viejo cacheado.
// Sin esto, "agregué agua a los datos de prueba" no le llega a nadie que
// ya hubiera abierto la app antes del cambio.
const DEMO_VERSION = 2

export function leerFuentes(): FuenteDatos[] {
  if (typeof window === 'undefined') return FUENTES_DEMO_INICIALES
  try {
    const guardado = window.localStorage.getItem(claveStorage())
    const versionGuardada = Number(window.localStorage.getItem(claveVersion()) ?? '0')

    if (!guardado) {
      window.localStorage.setItem(claveVersion(), String(DEMO_VERSION))
      return FUENTES_DEMO_INICIALES
    }

    const parsed = JSON.parse(guardado)
    if (!Array.isArray(parsed)) return FUENTES_DEMO_INICIALES

    if (versionGuardada < DEMO_VERSION) {
      // Reemplaza solo las filas demo (isDemo: true) por el set nuevo del
      // código; conserva intactos los archivos que el propio usuario
      // vinculó o subió — esto no es un reset, es una actualización del
      // contenido de fábrica.
      const propiosDelUsuario = parsed.filter((f: FuenteDatos) => !f.isDemo)
      const actualizado = [...FUENTES_DEMO_INICIALES, ...propiosDelUsuario]
      window.localStorage.setItem(claveStorage(), JSON.stringify(actualizado))
      window.localStorage.setItem(claveVersion(), String(DEMO_VERSION))
      return actualizado
    }

    return parsed
  } catch {
    return FUENTES_DEMO_INICIALES
  }
}

export function guardarFuentes(fuentes: FuenteDatos[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(claveStorage(), JSON.stringify(fuentes))
  window.localStorage.setItem(claveVersion(), String(DEMO_VERSION))
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
