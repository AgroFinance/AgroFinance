// ============================================================
// AgroFinance — Datos de análisis (PRIMER PILOTO, data real)
// ------------------------------------------------------------
// Ya NO son valores fijos: se DERIVAN del motor del piloto
// (pilotEngine → emissionFactors) sobre la data real de DATA/*.csv.
// La cooperativa = agregado de las 4 mypes; los productos = agregado
// por cultivo (Palta Hass / Mango Kent). La UI de /analisis no cambia.
// ============================================================

import {
  cooperativa, porCultivo, campanias, calcularCampanias, BENCHMARK, LIMITE_TESCO,
  type Agregado, type Campania, type FuentesActivas,
} from './pilotEngine'
import {
  FUENTE_META, MECANISMO_VACIO, sumarMecanismos,
  type FuenteEmision, type DesgloseMecanismo,
} from './emissionFactors'
import { deviationVsBenchmark } from './benchmarks'

// Paleta consistente con el dashboard (Scope 1/2/3)
export const C = {
  s1: '#137C53', // emerald
  s2: '#3D7FB0', // blue
  s3: '#D2A24A', // amber
  accent: '#10B981',
  gray: 'rgba(80,108,92,0.25)',
}
const colorScope = (s: 1 | 2 | 3) => (s === 1 ? C.s1 : s === 2 ? C.s2 : C.s3)

const nEmpresas = new Set(campanias.map((c) => c.empresa)).size

export const empresa = {
  nombre: `Cooperativa piloto · ${nEmpresas} mypes agroexportadoras`,
  sector: 'Agroexportación de superfoods frescos (palta y mango)',
  campania: '2026-2027',
  paisDestino: 'Países Bajos · España · Reino Unido',
  huellaTotal: Math.round(cooperativa.huellaTotalTon), // tCO2e
}

export type Scope = {
  id: number
  nombre: string
  descripcion: string
  valor: number
  pct: number
  color: string
  fuentes: string[]
}

// Parametrizadas sobre un Agregado: por defecto usan la cooperativa completa
// (comportamiento previo), pero /analisis las recalcula en vivo con
// `calcularCooperativa(activas)` cuando el usuario desvincula una fuente en
// Configuración — así el Scope realmente baja, no solo la tabla de archivos.
export function construirScopes(coop: Agregado): Scope[] {
  const totalTon = coop.huellaTotalTon
  const pctDe = (v: number) => (totalTon > 0 ? Math.round((v / totalTon) * 100) : 0)
  return [
    {
      id: 1, nombre: 'Scope 1', descripcion: 'Combustión y suelo (directo)',
      valor: Math.round(coop.scopes.s1), pct: pctDe(coop.scopes.s1), color: C.s1,
      fuentes: ['Diésel maquinaria agrícola', 'N₂O de fertilizantes nitrogenados (IPCC 2019)'],
    },
    {
      id: 2, nombre: 'Scope 2', descripcion: 'Electricidad SEIN',
      valor: Math.round(coop.scopes.s2), pct: pctDe(coop.scopes.s2), color: C.s2,
      fuentes: ['Riego tecnificado', 'Prefrío y packing · Factor MINAM/COES SEIN'],
    },
    {
      id: 3, nombre: 'Scope 3', descripcion: 'Cadena de valor',
      valor: Math.round(coop.scopes.s3), pct: pctDe(coop.scopes.s3), color: C.s3,
      fuentes: ['Flete marítimo refrigerado (reefer)', 'Empaque', 'Producción de fertilizante', 'Transporte terrestre'],
    },
  ]
}

export function construirTopFuentes(coop: Agregado) {
  return (Object.keys(coop.desglose) as FuenteEmision[])
    .map((f) => ({ f, ton: coop.desglose[f], pct: coop.desglosePct[f] }))
    .filter((x) => x.ton > 0)
    .sort((a, b) => b.ton - a.ton)
    .slice(0, 5)
    .map((x, i) => ({
      n: i + 1,
      fuenteKey: x.f, // clave para la trazabilidad (drill-down)
      fuente: FUENTE_META[x.f].label,
      emisiones: Math.round(x.ton),
      pct: Math.round(x.pct),
      scope: `S${FUENTE_META[x.f].scope}`,
      color: colorScope(FUENTE_META[x.f].scope),
    }))
}

export const scopes: Scope[] = construirScopes(cooperativa)
export const topFuentes = construirTopFuentes(cooperativa)

export const metodologia =
  'Calculado bajo ISO 14067:2018 + GHG Protocol Product. Factores: IPCC 2019 (N₂O suelos) · ISO 14083/GLEC (transporte reefer) · Ecoinvent · MINAM/COES SEIN. GWP IPCC AR6.'

export type Producto = {
  id: string
  nombre: string
  volumen: number
  huellaTotal: number
  intensidad: number
  benchmark: number
  deltaPct: number
  scope: { s1: number; s2: number; s3: number }
  tendencia: { campania: string; intensidad: number }[]
  limiteTesco: number
  notaTesco: string
  /** kg efectivamente exportados — base de la intensidad por kg. */
  kilosExportados: number
  /** kgCO2e por mecanismo fisico (riego, N2O, fertilizante, ...). */
  desgloseMecanismo: DesgloseMecanismo
  /** Campania anterior de la serie, para el comparativo interanual. */
  periodoAnterior: string
  periodoActual: string
}

// Agregado por cultivo a partir de un set concreto de campanias (permite
// recalcular cuando el usuario desvincula una fuente en Configuracion).
function agregarCultivo(camps: Campania[], cultivo: string): Agregado {
  const sel = camps.filter((c) => c.cultivo === cultivo)
  const scopes = { s1: 0, s2: 0, s3: 0 }
  let kilos = 0
  let desgloseMecanismo: DesgloseMecanismo = { ...MECANISMO_VACIO }
  for (const c of sel) {
    scopes.s1 += c.pcf.scopes.s1
    scopes.s2 += c.pcf.scopes.s2
    scopes.s3 += c.pcf.scopes.s3
    kilos += c.pcf.kilosExportados
    desgloseMecanismo = sumarMecanismos(desgloseMecanismo, c.pcf.desgloseMecanismo)
  }
  const totalKg = (scopes.s1 + scopes.s2 + scopes.s3) * 1000
  const base = porCultivo(cultivo)
  return {
    ...base,
    huellaTotalTon: +(totalKg / 1000).toFixed(3),
    kilosExportados: kilos,
    intensidadKgPorKg: kilos > 0 ? +(totalKg / kilos).toFixed(4) : 0,
    scopes,
    desgloseMecanismo,
  }
}

const PERIODO_ACTUAL = '2026-27'
const PERIODO_ANTERIOR = '2025-26'

function productoDe(cultivo: string, id: string, camps?: Campania[]): Producto {
  const ag = camps ? agregarCultivo(camps, cultivo) : porCultivo(cultivo)
  const total = ag.scopes.s1 + ag.scopes.s2 + ag.scopes.s3
  const pp = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0)
  const intensidad = +ag.intensidadKgPorKg.toFixed(2)
  const benchmark = BENCHMARK[cultivo]
  const limite = LIMITE_TESCO[cultivo]

  // Tendencia ilustrativa: serie descendente que termina en la intensidad real
  const tendencia = [
    { campania: '2023-24', intensidad: +(intensidad * 1.18).toFixed(2) },
    { campania: PERIODO_ANTERIOR, intensidad: +(intensidad * 1.08).toFixed(2) },
    { campania: PERIODO_ACTUAL, intensidad },
  ]
  const deltaPct = Math.round(((intensidad - tendencia[1].intensidad) / tendencia[1].intensidad) * 100)

  // Mismo helper que el KPI de la ficha de producto: si el retailer pide un
  // techo y estamos por encima, ambos lugares lo dicen igual (antes uno
  // mostraba "-15% debajo" y el otro "15% por encima" para el mismo numero).
  const vsLimite = deviationVsBenchmark(intensidad, limite)

  return {
    id, nombre: cultivo,
    volumen: Math.round(ag.kilosExportados / 1000), // toneladas exportadas
    huellaTotal: Math.round(total), // tCO2e
    intensidad, benchmark, deltaPct,
    scope: { s1: pp(ag.scopes.s1), s2: pp(ag.scopes.s2), s3: pp(ag.scopes.s3) },
    tendencia,
    limiteTesco: limite,
    notaTesco: vsLimite.pct === null
      ? `Tesco requiere ≤ ${limite} kgCO₂e/kg — sin dato de intensidad para comparar`
      : `Tesco requiere ≤ ${limite} kgCO₂e/kg — estás ${vsLimite.texto} del límite`,
    kilosExportados: ag.kilosExportados,
    desgloseMecanismo: ag.desgloseMecanismo,
    periodoActual: PERIODO_ACTUAL,
    periodoAnterior: PERIODO_ANTERIOR,
  }
}

export const productos: Producto[] = [
  productoDe('Palta Hass', 'palta'),
  productoDe('Mango Kent', 'mango'),
]

/** Productos recalculados segun que fuentes siguen vinculadas. */
export function construirProductos(activas: FuentesActivas): Producto[] {
  const camps = calcularCampanias(activas)
  return [productoDe('Palta Hass', 'palta', camps), productoDe('Mango Kent', 'mango', camps)]
}


export type Banco = {
  id: string
  banco: string
  producto: string
  lineaAprobable: number
  beneficio: string
  ahorroAnual: number
  estado: string
  progreso: number
}

export const bancos: Banco[] = [
  {
    id: 'bbva', banco: 'BBVA', producto: 'Sustainability-Linked Loan',
    lineaAprobable: 5000000, beneficio: '−35 bps si reduce emisiones 8% en 12 meses',
    ahorroAnual: 17500, estado: 'Documentación 80% lista', progreso: 80,
  },
  {
    id: 'bcp', banco: 'BCP', producto: 'Capital de trabajo verde',
    lineaAprobable: 3500000, beneficio: '−25 bps con reporte ISO 14064',
    ahorroAnual: 8750, estado: 'Esperando auditoría externa', progreso: 45,
  },
  {
    id: 'agrobanco', banco: 'AgroBanco', producto: 'Crédito Verde Agroexportador',
    lineaAprobable: 2000000, beneficio: 'Tasa fija 6.5% vs 8.2% estándar (−170 bps)',
    ahorroAnual: 34000, estado: 'Listo para enviar', progreso: 100,
  },
]

export const fmtInt = (n: number) => n.toLocaleString('es-PE')
export const fmtDec = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtUSD = (n: number) => '$' + n.toLocaleString('en-US')
