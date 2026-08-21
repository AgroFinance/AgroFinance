'use client'

// ============================================================
// AgroFinance — Huella consolidada (única fuente de verdad de la app)
// ------------------------------------------------------------
// Todo número que se muestre en Dashboard, Inventario GHG y Por producto
// sale de aquí. La consolidación tiene dos sumandos, y ninguno es mock:
//
//   1. Las fuentes demo del piloto que sigan vinculadas en Configuración
//      (motor pilotEngine sobre la data real de campaña).
//   2. Los archivos que el usuario haya vinculado o cargado él mismo,
//      parseados y clasificados con el MISMO módulo ghgClassify que usa
//      la pantalla de carga de facturas.
//
// Sin ninguna de las dos cosas, el resultado es cero de verdad y las
// pantallas muestran su estado vacío — no cifras de relleno (RF-7.6).
// ============================================================

import { useMemo } from 'react'
import {
  calcularCooperativa, cooperativa as cooperativaCompleta, type Agregado,
} from '@/modules/carbon-accounting/domain/pilotEngine'
import {
  FUENTE_META, MECANISMOS, MECANISMO_VACIO,
  type DesgloseMecanismo, type FuenteEmision, type Mecanismo,
} from '@/modules/carbon-accounting/domain/emissionFactors'
import { useFuentesDatos, fuentesActivasDesde, type FuenteDatos } from '@/modules/data-loader/domain/datosPrueba'

/** Mecanismo → fuente de emisión equivalente, para mezclar ambos desgloses. */
const FUENTE_DE_MECANISMO: Record<Mecanismo, FuenteEmision> = {
  riego: 'electricidadRiego',
  n2oCampo: 'fertilizante',
  fertilizante: 'fertilizante',
  maquinaria: 'dieselCampo',
  packing: 'packingEnergia',
  empaque: 'materiales',
  flete: 'transporteMaritimo',
  pesticidas: 'fertilizante',
}

export type HuellaConsolidada = Agregado & {
  /** Archivos del usuario que aportan al total (sin contar el set demo). */
  archivosUsuario: FuenteDatos[]
  /** Archivos que quedaron en error y por tanto NO suman (RNF-7.5). */
  archivosConError: FuenteDatos[]
  /** true cuando hay al menos una fuente aportando datos. */
  tieneDatos: boolean
  /** tCO₂e aportadas por archivos del usuario. */
  aporteUsuarioTon: number
}

/** Archivos del usuario en estado utilizable. */
export const archivosDeUsuario = (fuentes: FuenteDatos[]) =>
  fuentes.filter((f) => !f.isDemo && f.estado === 'sincronizado' && !!f.resumen)

export function consolidar(fuentes: FuenteDatos[]): HuellaConsolidada {
  const base = calcularCooperativa(fuentesActivasDesde(fuentes))
  const usuario = archivosDeUsuario(fuentes)
  const conError = fuentes.filter((f) => !f.isDemo && f.estado === 'error')

  const desglose = { ...base.desglose }
  let desgloseMecanismo: DesgloseMecanismo = { ...base.desgloseMecanismo }
  const scopes = { ...base.scopes }
  let aporteUsuarioKg = 0

  for (const f of usuario) {
    const r = f.resumen!
    scopes.s1 += r.scopes.s1
    scopes.s2 += r.scopes.s2
    scopes.s3 += r.scopes.s3
    aporteUsuarioKg += r.emisionKg
    for (const m of MECANISMOS) {
      const kg = r.porMecanismo[m]
      if (kg === undefined) continue
      desgloseMecanismo[m] = (desgloseMecanismo[m] ?? 0) + kg
      const fuente = FUENTE_DE_MECANISMO[m]
      desglose[fuente] = +(desglose[fuente] + kg / 1000).toFixed(3)
    }
  }

  const huellaTotalTon = +(scopes.s1 + scopes.s2 + scopes.s3).toFixed(3)
  const totalKg = huellaTotalTon * 1000
  const desglosePct = {} as Record<FuenteEmision, number>
  let hotspot = { fuente: 'transporteMaritimo' as FuenteEmision, label: '', pct: 0 }
  for (const f of Object.keys(desglose) as FuenteEmision[]) {
    const pct = totalKg > 0 ? +(((desglose[f] * 1000) / totalKg) * 100).toFixed(2) : 0
    desglosePct[f] = pct
    if (pct > hotspot.pct) hotspot = { fuente: f, label: FUENTE_META[f].label, pct }
  }

  // Los kilos exportados solo los conoce el registro de logística: un archivo
  // de consumos no declara cuánta fruta salió, así que la intensidad sigue
  // apoyada en los kilos del registro de envíos. Si no hay envíos, no hay
  // intensidad — se declara 0 y la UI lo muestra como "sin dato".
  const kilos = base.kilosExportados

  return {
    huellaTotalTon,
    kilosExportados: kilos,
    intensidadKgPorKg: kilos > 0 ? +(totalKg / kilos).toFixed(4) : 0,
    scopes: { s1: +scopes.s1.toFixed(3), s2: +scopes.s2.toFixed(3), s3: +scopes.s3.toFixed(3) },
    desglose,
    desglosePct,
    hotspot,
    desgloseMecanismo,
    archivosUsuario: usuario,
    archivosConError: conError,
    tieneDatos: huellaTotalTon > 0,
    aporteUsuarioTon: +(aporteUsuarioKg / 1000).toFixed(3),
  }
}

export const CONSOLIDADA_VACIA: HuellaConsolidada = {
  huellaTotalTon: 0,
  kilosExportados: 0,
  intensidadKgPorKg: 0,
  scopes: { s1: 0, s2: 0, s3: 0 },
  desglose: Object.fromEntries(
    (Object.keys(FUENTE_META) as FuenteEmision[]).map((f) => [f, 0]),
  ) as Record<FuenteEmision, number>,
  desglosePct: Object.fromEntries(
    (Object.keys(FUENTE_META) as FuenteEmision[]).map((f) => [f, 0]),
  ) as Record<FuenteEmision, number>,
  hotspot: { fuente: 'transporteMaritimo', label: '', pct: 0 },
  desgloseMecanismo: { ...MECANISMO_VACIO },
  archivosUsuario: [],
  archivosConError: [],
  tieneDatos: false,
  aporteUsuarioTon: 0,
}

/**
 * Hook que toda pantalla debe usar en lugar de importar `cooperativa`
 * directamente. Recalcula sola cuando cambia la lista de fuentes.
 */
export function useHuellaConsolidada(): { huella: HuellaConsolidada; fuentes: FuenteDatos[] } {
  const [fuentes] = useFuentesDatos()
  const huella = useMemo(() => consolidar(fuentes), [fuentes])
  return { huella, fuentes }
}

/** Referencia con TODAS las fuentes demo activas — usada solo por el reporte
 *  técnico para declarar el escenario completo de la campaña. */
export const huellaCampaniaCompleta = cooperativaCompleta
