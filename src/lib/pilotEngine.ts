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

import { campos, packing, envios, empresas, type EnvioRow } from './pilotData'
import {
  calcularHuellaCampana, FUENTE_META,
  type Envio, type ResultadoPCF, type FuenteEmision,
} from './emissionFactors'
import { evaluar, type Certificacion, type Metricas, type Verificacion } from './certification'

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

function construirCampania(empresa: string, cultivo: string): Campania | null {
  const campo = campos.find((c) => c.empresa === empresa && c.cultivo === cultivo)
  const pack = packing.find((p) => p.empresa === empresa)
  const evs = envios.filter((e) => e.empresa === empresa && e.cultivo === cultivo)
  if (!campo || !pack || evs.length === 0) return null

  // El packing es por empresa: se reparte entre cultivos según kg exportados.
  const kgCultivo = kgExportados(empresa, cultivo)
  const kgEmpresa = kgExportados(empresa)
  const sharePacking = kgEmpresa > 0 ? kgCultivo / kgEmpresa : 0

  const pcf = calcularHuellaCampana(
    {
      dieselGal: campo.dieselGal,
      electricidadKwh: campo.electricidadRiegoKwh,
      fertilizanteKg: campo.fertilizanteKg,
      tipoFertilizante: 'urea',
    },
    {
      electricidadKwh: pack.electricidadPackingKwh * sharePacking,
      ratioDescartePct: pack.ratioDescartePct,
    },
    evs.map(aEnvio),
  )

  const benchmark = BENCHMARK[cultivo] ?? 0.7
  const deltaVsBenchmarkPct = Math.round(((pcf.intensidadKgPorKg - benchmark) / benchmark) * 100)

  return {
    id: `${empresa}__${cultivo}`,
    empresa, cultivo,
    hectareas: campo.hectareas,
    envios: evs,
    pcf,
    benchmark,
    limiteTesco: LIMITE_TESCO[cultivo] ?? benchmark,
    deltaVsBenchmarkPct,
  }
}

// Todas las campañas del piloto (8 = 4 empresas × 2 cultivos)
export const campanias: Campania[] = empresas
  .flatMap((emp) => ['Palta Hass', 'Mango Kent'].map((cul) => construirCampania(emp, cul)))
  .filter((c): c is Campania => c !== null)

// ============================================================
// Agregación cooperativa (suma de todas las campañas)
// ============================================================
export type Agregado = {
  huellaTotalTon: number
  kilosExportados: number
  intensidadKgPorKg: number
  scopes: { s1: number; s2: number; s3: number }
  desglose: Record<FuenteEmision, number> // tCO₂e por fuente
  desglosePct: Record<FuenteEmision, number>
  hotspot: { fuente: FuenteEmision; label: string; pct: number }
}

function agregar(camps: Campania[]): Agregado {
  const fuentes = Object.keys(FUENTE_META) as FuenteEmision[]
  const desglose = Object.fromEntries(fuentes.map((f) => [f, 0])) as Record<FuenteEmision, number>
  let kilos = 0
  const scopes = { s1: 0, s2: 0, s3: 0 }

  for (const c of camps) {
    kilos += c.pcf.kilosExportados
    scopes.s1 += c.pcf.scopes.s1
    scopes.s2 += c.pcf.scopes.s2
    scopes.s3 += c.pcf.scopes.s3
    for (const f of fuentes) desglose[f] += c.pcf.desglose[f]
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
    desglose, desglosePct, hotspot,
  }
}

export const cooperativa: Agregado = agregar(campanias)
export const porEmpresa = (empresa: string): Agregado =>
  agregar(campanias.filter((c) => c.empresa === empresa))
export const porCultivo = (cultivo: string): Agregado =>
  agregar(campanias.filter((c) => c.cultivo === cultivo))

// ============================================================
// Clasificación: mapea una campaña/agregado a Metricas → evaluar()
// ------------------------------------------------------------
// La huella (intensidad, scopes) es REAL. El aseguramiento externo y
// la reducción interanual no vienen en la data de campo, así que se
// derivan de forma determinista por empresa (perfil de madurez) para
// que el piloto sea reproducible y muestre niveles variados.
// ============================================================
function seed(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return (h % 1000) / 1000 // 0..1 determinista
}

export function metricasDe(
  intensidad: number, benchmark: number, scopes: { s1: number; s2: number; s3: number }, key: string,
): Metricas {
  const q = seed(key) // madurez determinista 0..1
  const verificacion: Verificacion = q > 0.66 ? 'razonable' : q > 0.33 ? 'limitada' : 'ninguna'
  return {
    intensidad,
    benchmark,
    reduccionYoY: +(2 + q * 9).toFixed(1), // 2..11 %
    materialidad: +(4.5 - q * 4).toFixed(1), // 4.5..0.5 %
    cobertura: Math.round(82 + q * 16), // 82..98 % (data de piloto bastante completa)
    verificacion,
    scopes,
  }
}

export function certificarCampania(c: Campania): Certificacion {
  return evaluar(metricasDe(c.pcf.intensidadKgPorKg, c.benchmark, c.pcf.scopes, c.id))
}

export function certificarCooperativa(): Certificacion {
  return evaluar(
    metricasDe(cooperativa.intensidadKgPorKg, BENCHMARK['Palta Hass'], cooperativa.scopes, 'COOPERATIVA'),
  )
}
