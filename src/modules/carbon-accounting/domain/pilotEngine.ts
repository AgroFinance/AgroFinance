// ============================================================
// AgroFinance — Motor del PRIMER PILOTO
// ------------------------------------------------------------
// Toma la data real de prueba (pilotData) — 4 mypes, 2 cultivos,
// 80 envíos — y calcula la huella de carbono de cada campaña con
// el motor PCF (emissionFactors), agrega a nivel cooperativa y la
// clasifica con el motor de reglas (certification).
//
//   pilotData → calcularHuellaCampana → ResultadoPCF → evaluar() → Nivel
// ============================================================

import { campos, packing, envios, empresas, type EnvioRow } from '@/modules/carbon-accounting/domain/pilotData'
import {
  calcularHuellaCampana, FUENTE_META, MECANISMO_VACIO, sumarMecanismos,
  type Envio, type ResultadoPCF, type FuenteEmision, type DesgloseMecanismo,
} from '@/modules/carbon-accounting/domain/emissionFactors'
import { evaluar, type Certificacion, type Metricas, type Verificacion } from '@/modules/carbon-accounting/domain/certification'

// Benchmarks de intensidad por cultivo (kgCO₂e/kg, referencia sector UE)
export const BENCHMARK: Record<string, number> = {
  'Palta Hass': 0.68,
  'Mango Kent': 0.62,
}

// Límite que exige el retailer (Tesco) por cultivo
export const LIMITE_TESCO: Record<string, number> = {
  'Palta Hass': 0.68,
  'Mango Kent': 0.65,
}

// Supuestos de empaque (la data trae cajas y palets, no el peso de material):
// cada caja de exportación ≈ 0,4 kg de cartón; cada palet ≈ 1,2 kg de film.
const KG_CARTON_POR_CAJA = 0.4
const KG_FILM_POR_PALET = 1.2

function aEnvio(e: EnvioRow): Envio {
  return {
    pesoNetoKg: e.pesoNetoKg,
    cartonKg: e.cajasCarton * KG_CARTON_POR_CAJA,
    filmKg: e.paletsU * KG_FILM_POR_PALET,
    paletsU: e.paletsU,
    distanciaCamionKm: e.distanciaCamionKm,
    distanciaMaritimaKm: e.distanciaMaritimaKm,
  }
}

// ---- Una campaña = empresa × cultivo ----
export type Campania = {
  id: string
  empresa: string
  cultivo: string
  hectareas: number
  envios: EnvioRow[]
  pcf: ResultadoPCF
  benchmark: number
  limiteTesco: number
  deltaVsBenchmarkPct: number // % bajo (−) o sobre (+) el benchmark
}

// kg exportados por (empresa, cultivo) — base de la asignación del packing
function kgExportados(empresa: string, cultivo?: string): number {
  return envios
    .filter((e) => e.empresa === empresa && (!cultivo || e.cultivo === cultivo))
    .reduce((s, e) => s + e.pesoNetoKg, 0)
}

// Las 4 fuentes de datos que Configuración deja vincular/eliminar. Cada una
// alimenta una parte real del cálculo — desactivarla debe DOLER en el
// resultado, no solo desaparecer de una tabla.
export type FuenteId = 'riego' | 'produccion' | 'finanzas' | 'logistica'
export type FuentesActivas = Record<FuenteId, boolean>
export const FUENTES_TODAS_ACTIVAS: FuentesActivas = {
  riego: true, produccion: true, finanzas: true, logistica: true,
}

function construirCampania(empresa: string, cultivo: string, activas: FuentesActivas = FUENTES_TODAS_ACTIVAS): Campania | null {
  const campoRaw = campos.find((c) => c.empresa === empresa && c.cultivo === cultivo)
  const pack = packing.find((p) => p.empresa === empresa)
  // Sin el archivo de Logística no hay registro de envíos: no se puede
  // afirmar cuánto se exportó, así que la campaña queda fuera del cálculo.
  const evs = activas.logistica ? envios.filter((e) => e.empresa === empresa && e.cultivo === cultivo) : []
  if (!campoRaw || !pack || evs.length === 0) return null

  // El packing es por empresa: se reparte entre cultivos según kg exportados.
  const kgCultivo = kgExportados(empresa, cultivo)
  const kgEmpresa = kgExportados(empresa)
  const sharePacking = kgEmpresa > 0 ? kgCultivo / kgEmpresa : 0

  const pcf = calcularHuellaCampana(
    {
      // Producción trae el diésel de campo; Riego trae electricidad y fertilizante.
      dieselGal: activas.produccion ? campoRaw.dieselGal : 0,
      electricidadKwh: activas.riego ? campoRaw.electricidadRiegoKwh : 0,
      fertilizanteKg: activas.riego ? campoRaw.fertilizanteKg : 0,
      tipoFertilizante: 'urea',
    },
    {
      electricidadKwh: activas.finanzas ? pack.electricidadPackingKwh * sharePacking : 0,
      ratioDescartePct: activas.finanzas ? pack.ratioDescartePct : 0,
    },
    evs.map(aEnvio),
  )

  const benchmark = BENCHMARK[cultivo] ?? 0.7
  const deltaVsBenchmarkPct = Math.round(((pcf.intensidadKgPorKg - benchmark) / benchmark) * 100)

  return {
    id: `${empresa}__${cultivo}`,
    empresa, cultivo,
    hectareas: campoRaw.hectareas,
    envios: evs,
    pcf,
    benchmark,
    limiteTesco: LIMITE_TESCO[cultivo] ?? benchmark,
    deltaVsBenchmarkPct,
  }
}

// Todas las campañas del piloto (8 = 4 empresas × 2 cultivos), en función de
// qué fuentes de Configuración siguen vinculadas.
export function calcularCampanias(activas: FuentesActivas = FUENTES_TODAS_ACTIVAS): Campania[] {
  return empresas
    .flatMap((emp) => ['Palta Hass', 'Mango Kent'].map((cul) => construirCampania(emp, cul, activas)))
    .filter((c): c is Campania => c !== null)
}

// Export de compatibilidad: todas las fuentes activas (comportamiento previo,
// usado por reportes, copilot y el flujo de "Autocargar DATA").
export const campanias: Campania[] = calcularCampanias()

// ============================================================
// Agregación cooperativa (suma de todas las campañas)
// ============================================================
export type Agregado = {
  huellaTotalTon: number
  kilosExportados: number
  intensidadKgPorKg: number
  scopes: { s1: number; s2: number; s3: number }
  desglose: Record<FuenteEmision, number> // tCO2e por fuente
  desglosePct: Record<FuenteEmision, number>
  hotspot: { fuente: FuenteEmision; label: string; pct: number }
  /** kgCO2e por mecanismo fisico (formato del informe tecnico). null = sin dato. */
  desgloseMecanismo: DesgloseMecanismo
}

function agregar(camps: Campania[]): Agregado {
  const fuentes = Object.keys(FUENTE_META) as FuenteEmision[]
  const desglose = Object.fromEntries(fuentes.map((f) => [f, 0])) as Record<FuenteEmision, number>
  let kilos = 0
  const scopes = { s1: 0, s2: 0, s3: 0 }
  let desgloseMecanismo: DesgloseMecanismo = { ...MECANISMO_VACIO }

  for (const c of camps) {
    kilos += c.pcf.kilosExportados
    scopes.s1 += c.pcf.scopes.s1
    scopes.s2 += c.pcf.scopes.s2
    scopes.s3 += c.pcf.scopes.s3
    for (const f of fuentes) desglose[f] += c.pcf.desglose[f]
    desgloseMecanismo = sumarMecanismos(desgloseMecanismo, c.pcf.desgloseMecanismo)
  }

  const huellaTotalTon = +(scopes.s1 + scopes.s2 + scopes.s3).toFixed(3)
  const totalKg = huellaTotalTon * 1000
  const desglosePct = {} as Record<FuenteEmision, number>
  let hotspot = { fuente: 'transporteMaritimo' as FuenteEmision, label: '', pct: 0 }
  for (const f of fuentes) {
    desglose[f] = +desglose[f].toFixed(3)
    const pct = totalKg > 0 ? +((desglose[f] * 1000 / totalKg) * 100).toFixed(2) : 0
    desglosePct[f] = pct
    if (pct > hotspot.pct) hotspot = { fuente: f, label: FUENTE_META[f].label, pct }
  }

  return {
    huellaTotalTon,
    kilosExportados: kilos,
    intensidadKgPorKg: kilos > 0 ? +(totalKg / kilos).toFixed(4) : 0,
    scopes: { s1: +scopes.s1.toFixed(3), s2: +scopes.s2.toFixed(3), s3: +scopes.s3.toFixed(3) },
    desglose, desglosePct, hotspot, desgloseMecanismo,
  }
}

export const cooperativa: Agregado = agregar(campanias)
export const porEmpresa = (empresa: string): Agregado =>
  agregar(campanias.filter((c) => c.empresa === empresa))
export const porCultivo = (cultivo: string): Agregado =>
  agregar(campanias.filter((c) => c.cultivo === cultivo))

// Recalcula la huella real según qué fuentes siguen vinculadas en
// Configuración. Esto es lo que hace que borrar un archivo se sienta de
// verdad — el dashboard baja, no solo la fila de una tabla.
export function calcularCooperativa(activas: FuentesActivas): Agregado {
  return agregar(calcularCampanias(activas))
}

// ============================================================
// Clasificación: mapea una campaña/agregado a Metricas → evaluar()
// ------------------------------------------------------------
// La huella (intensidad, scopes) siempre fue real. El resto NO lo era:
// antes se derivaba de un hash del nombre de la empresa, incluido el nivel
// de aseguramiento externo. Eso hacía que la plataforma pudiera declarar
// que un ente acreditado había verificado el inventario cuando nadie lo
// había hecho — justo lo que un auditor detecta primero y lo que dejaría
// sin valor todo lo demás que muestra la plataforma.
//
// Ahora:
//   · cobertura     → se calcula del estado real de las fuentes vinculadas.
//   · verificacion  → SIEMPRE 'ninguna'. La plataforma no tiene forma de
//                     saber que hubo auditoría; mientras no exista un
//                     registro de verificación cargado, afirmarla es falso.
//   · materialidad  → null. Exige un análisis de incertidumbre que este
//                     inventario no hace.
//   · reduccionYoY  → null. Requiere una línea base de la campaña anterior
//                     medida con el mismo alcance; sin eso no es comparable.
//
// Consecuencia buscada: sin verificación externa los niveles A, B y C son
// inalcanzables y la clasificación cae en D · "No verificado". Esa ES la
// situación real de una empresa que autodeclara, y es coherente con el
// badge "Autodeclarado — nivel inventario" del módulo de reportes.
// ============================================================

/**
 * Cobertura de datos: % de fuentes vinculadas que quedaron legibles y
 * sincronizadas. Es lo único de este bloque que el sistema sí observa.
 */
export function coberturaDe(fuentes: { estado: string }[]): number {
  if (!fuentes.length) return 0
  const ok = fuentes.filter((f) => f.estado === 'sincronizado').length
  return Math.round((ok / fuentes.length) * 100)
}

export function metricasDe(
  intensidad: number,
  benchmark: number,
  scopes: { s1: number; s2: number; s3: number },
  cobertura = 0,
): Metricas {
  return {
    intensidad,
    benchmark,
    reduccionYoY: null,
    materialidad: null,
    cobertura,
    verificacion: 'ninguna',
    scopes,
  }
}

export function certificarCampania(c: Campania): Certificacion {
  return evaluar(metricasDe(c.pcf.intensidadKgPorKg, c.benchmark, c.pcf.scopes))
}

export function certificarCooperativa(agregado: Agregado = cooperativa, cobertura = 0): Certificacion {
  return evaluar(
    metricasDe(agregado.intensidadKgPorKg, BENCHMARK['Palta Hass'], agregado.scopes, cobertura),
  )
}

// ============================================================
// Serie mensual de emisiones
// ------------------------------------------------------------
// La huella de campana no viene fechada mes a mes: los consumos de campo y
// packing son anuales. Para dar una serie temporal honesta se reparte el
// total segun los kilos efectivamente embarcados en cada mes (el mismo
// metodo de prorrateo que ya declara el modulo de Reportes), en vez de
// dibujar una curva inventada.
// ============================================================
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export type PuntoMensual = { mes: string; emisiones: number; kilos: number }

export function serieMensual(totalTon: number): PuntoMensual[] {
  const porMes = new Map<string, number>()
  for (const e of envios) {
    const d = new Date(e.fecha)
    if (isNaN(d.getTime())) continue
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    porMes.set(clave, (porMes.get(clave) ?? 0) + e.pesoNetoKg)
  }
  const kilosTotales = [...porMes.values()].reduce((a, b) => a + b, 0)
  if (kilosTotales === 0) return []

  return [...porMes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([clave, kilos]) => {
      const [anio, mes] = clave.split('-')
      return {
        mes: `${MESES_CORTOS[Number(mes) - 1]} ${anio.slice(2)}`,
        emisiones: +((totalTon * kilos) / kilosTotales).toFixed(1),
        kilos,
      }
    })
}
