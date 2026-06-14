// ============================================================
// AgroFinance — Datos de análisis (PRIMER PILOTO, data real)
// ------------------------------------------------------------
// Ya NO son valores fijos: se DERIVAN del motor del piloto
// (pilotEngine → emissionFactors) sobre la data real de DATA/*.csv.
// La cooperativa = agregado de las 4 mypes; los productos = agregado
// por cultivo (Palta Hass / Mango Kent). La UI de /analisis no cambia.
// ============================================================

import {
  cooperativa, porCultivo, campanias, BENCHMARK, LIMITE_TESCO,
} from './pilotEngine'
import { FUENTE_META, type FuenteEmision } from './emissionFactors'

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
  campania: '2026',
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

const totalTon = cooperativa.huellaTotalTon
const pctDe = (v: number) => Math.round((v / totalTon) * 100)

export const scopes: Scope[] = [
  {
    id: 1, nombre: 'Scope 1', descripcion: 'Combustión y suelo (directo)',
    valor: Math.round(cooperativa.scopes.s1), pct: pctDe(cooperativa.scopes.s1), color: C.s1,
    fuentes: ['Diésel maquinaria agrícola', 'N₂O de fertilizantes nitrogenados (IPCC 2019)'],
  },
  {
    id: 2, nombre: 'Scope 2', descripcion: 'Electricidad SEIN',
    valor: Math.round(cooperativa.scopes.s2), pct: pctDe(cooperativa.scopes.s2), color: C.s2,
    fuentes: ['Riego tecnificado', 'Prefrío y packing · Factor MINAM/COES SEIN'],
  },
  {
    id: 3, nombre: 'Scope 3', descripcion: 'Cadena de valor',
    valor: Math.round(cooperativa.scopes.s3), pct: pctDe(cooperativa.scopes.s3), color: C.s3,
    fuentes: ['Flete marítimo refrigerado (reefer)', 'Empaque', 'Producción de fertilizante', 'Transporte terrestre'],
  },
]

// Top-5 fuentes reales (desglose del motor), ordenadas por impacto
export const topFuentes = (Object.keys(cooperativa.desglose) as FuenteEmision[])
  .map((f) => ({ f, ton: cooperativa.desglose[f], pct: cooperativa.desglosePct[f] }))
  .sort((a, b) => b.ton - a.ton)
  .slice(0, 5)
  .map((x, i) => ({
    n: i + 1,
    fuente: FUENTE_META[x.f].label,
    emisiones: Math.round(x.ton),
    pct: Math.round(x.pct),
    scope: `S${FUENTE_META[x.f].scope}`,
    color: colorScope(FUENTE_META[x.f].scope),
  }))

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
}

function productoDe(cultivo: string, id: string): Producto {
  const ag = porCultivo(cultivo)
  const total = ag.scopes.s1 + ag.scopes.s2 + ag.scopes.s3
  const pp = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0)
  const intensidad = +ag.intensidadKgPorKg.toFixed(2)
  const benchmark = BENCHMARK[cultivo]
  const limite = LIMITE_TESCO[cultivo]

  // Tendencia ilustrativa: serie descendente que termina en la intensidad real
  const tendencia = [
    { campania: '2023-24', intensidad: +(intensidad * 1.18).toFixed(2) },
    { campania: '2024-25', intensidad: +(intensidad * 1.08).toFixed(2) },
    { campania: '2025-26', intensidad },
  ]
  const deltaPct = Math.round(((intensidad - tendencia[1].intensidad) / tendencia[1].intensidad) * 100)
  const margen = Math.round((1 - intensidad / limite) * 100)

  return {
    id, nombre: cultivo,
    volumen: Math.round(ag.kilosExportados / 1000), // toneladas exportadas
    huellaTotal: Math.round(total), // tCO2e
    intensidad, benchmark, deltaPct,
    scope: { s1: pp(ag.scopes.s1), s2: pp(ag.scopes.s2), s3: pp(ag.scopes.s3) },
    tendencia,
    limiteTesco: limite,
    notaTesco:
      margen >= 0
        ? `Tesco requiere ≤ ${limite} kgCO₂e/kg — estás ${margen}% por debajo del límite`
        : `Tesco requiere ≤ ${limite} kgCO₂e/kg — estás ${Math.abs(margen)}% por encima: prioriza reducción`,
  }
}

export const productos: Producto[] = [
  productoDe('Palta Hass', 'palta'),
  productoDe('Mango Kent', 'mango'),
]

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
    ahorroAnual: 43750, estado: 'Documentación 80% lista', progreso: 80,
  },
  {
    id: 'bcp', banco: 'BCP', producto: 'Capital de trabajo verde',
    lineaAprobable: 3500000, beneficio: '−25 bps con reporte ISO 14064',
    ahorroAnual: 21875, estado: 'Esperando auditoría externa', progreso: 45,
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
