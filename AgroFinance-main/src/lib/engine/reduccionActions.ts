// ============================================================
// AgroFinance — Motor de acciones de reducción
// ------------------------------------------------------------
// Cada acción reduce un % real de una fuente de emisión concreta
// (las mismas fuentes del motor de huella en emissionFactors.ts /
// pilotEngine.ts). El tCO2e de cada acción se calcula sobre el
// desglose real de la cooperativa, no un número fijo — así la
// tabla y la barra de meta se mueven si cambian los datos subidos.
// ============================================================

import { cooperativa, type Agregado } from '@/lib/engine/pilotEngine'
import { FUENTE_META, type FuenteEmision } from '@/lib/engine/emissionFactors'

export type Categoria = 'Transporte' | 'Fertilizantes' | 'Empaque' | 'Energía' | 'Residuos'

export type AccionReduccion = {
  id: string
  categoria: Categoria
  titulo: string
  detalle: string
  fuente: FuenteEmision
  scope: 1 | 2 | 3
  pctReduccionFuente: number // % que esta acción quita de esa fuente
  inversionAnualUSD: number | null // null = sin inversión (capex/año o costo operativo)
  inversionLabel: string
  periodo: string
}

// Catálogo — % de reducción y costos son estimaciones de mercado
// aplicadas sobre el tCO2e real de cada fuente para esta campaña.
// `scope` no se declara aquí: se deriva de la fuente en construirAcciones(),
// para que exista una sola fuente de verdad sobre a qué alcance pertenece
// cada emisión (FUENTE_META) y no se pueda declarar un scope contradictorio.
const CATALOGO: Omit<AccionReduccion, 'scope'>[] = [
  {
    id: 'reefer-densidad',
    categoria: 'Transporte',
    titulo: 'Optimizar densidad de carga del contenedor reefer',
    detalle: 'Flete marítimo refrigerado',
    fuente: 'transporteMaritimo',
    pctReduccionFuente: 8,
    inversionAnualUSD: null,
    inversionLabel: 'Sin inversión',
    periodo: '2026-2031',
  },
  {
    id: 'naviera-biocombustible',
    categoria: 'Transporte',
    titulo: 'Naviera con mezcla de biocombustible en ruta Callao-Rotterdam',
    detalle: 'Flete marítimo refrigerado',
    fuente: 'transporteMaritimo',
    pctReduccionFuente: 10,
    inversionAnualUSD: 18000,
    inversionLabel: 'US$18,000/año',
    periodo: '2026-2031',
  },
  {
    id: 'fertilizante-liberacion',
    categoria: 'Fertilizantes',
    titulo: 'Fertilizante de liberación controlada para bajar N₂O',
    detalle: 'Fertilizantes nitrogenados',
    fuente: 'fertilizante',
    pctReduccionFuente: 15,
    inversionAnualUSD: 12000,
    inversionLabel: 'US$12,000/año',
    periodo: '2026-2031',
  },
  {
    id: 'carton-reciclado',
    categoria: 'Empaque',
    titulo: 'Cartón con contenido reciclado y film de menor gramaje',
    detalle: 'Empaque',
    fuente: 'materiales',
    pctReduccionFuente: 12,
    inversionAnualUSD: 4000,
    inversionLabel: 'US$4,000/año',
    periodo: '2026-2031',
  },
  {
    id: 'diesel-b20',
    categoria: 'Energía',
    titulo: 'Diésel B20 y mantenimiento predictivo de maquinaria',
    detalle: 'Diésel maquinaria agrícola',
    fuente: 'dieselCampo',
    pctReduccionFuente: 10,
    inversionAnualUSD: 8000,
    inversionLabel: 'US$8,000/año',
    periodo: '2026-2031',
  },
  {
    id: 'riego-sein',
    categoria: 'Energía',
    titulo: 'Conectar riego tecnificado a red SEIN, retirando grupos electrógenos',
    detalle: 'Electricidad riego',
    fuente: 'electricidadRiego',
    pctReduccionFuente: 20,
    inversionAnualUSD: 60000,
    inversionLabel: 'US$60,000 capex',
    periodo: '2026-2031',
  },
  {
    id: 'fertirriego-precision',
    categoria: 'Fertilizantes',
    titulo: 'Fertirriego de precisión con sensores de humedad de suelo',
    detalle: 'Fertilizantes nitrogenados',
    fuente: 'fertilizante',
    pctReduccionFuente: 10,
    inversionAnualUSD: 45000,
    inversionLabel: 'US$45,000 capex',
    periodo: '2026-2031',
  },
  {
    id: 'biodigestor-packing',
    categoria: 'Residuos',
    titulo: 'Biodigestor para residuos orgánicos de planta de packing',
    detalle: 'Electricidad packing (prefrío)',
    fuente: 'packingEnergia',
    pctReduccionFuente: 8,
    inversionAnualUSD: 85000,
    inversionLabel: 'US$85,000 capex',
    periodo: '2026-2031',
  },
]

export function construirAcciones(agregado: Agregado = cooperativa): AccionReduccion[] {
  return CATALOGO.map((a) => {
    const scope = FUENTE_META[a.fuente].scope
    return { ...a, scope } as AccionReduccion
  })
    .sort((a, b) => reduccionTon(b, agregado) - reduccionTon(a, agregado))
}

// tCO2e que aporta una acción, sobre el desglose real de la fuente
export function reduccionTon(a: AccionReduccion, agregado: Agregado = cooperativa): number {
  const fuenteTon = agregado.desglose[a.fuente] ?? 0
  return +(fuenteTon * (a.pctReduccionFuente / 100)).toFixed(1)
}

export function reduccionPct(a: AccionReduccion, agregado: Agregado = cooperativa): number {
  const totalTon = agregado.huellaTotalTon
  if (totalTon <= 0) return 0
  return +((reduccionTon(a, agregado) / totalTon) * 100).toFixed(2)
}

// Meta comprometida con el banco (misma que en analyticsData.bancos[0])
export const METALL = {
  banco: 'BBVA',
  pctObjetivo: 8, // reducir 8% de la huella en 12 meses
  bpsDescuento: 35,
  lineaAprobableUSD: 5000000,
}

// Selección greedy: ordena por tCO2e/US$ (mejor costo-beneficio primero,
// las de "sin inversión" van primero) hasta cruzar el umbral del banco.
export function armarPlanKapi(acciones: AccionReduccion[], agregado: Agregado = cooperativa): Set<string> {
  const totalTon = agregado.huellaTotalTon
  const metaTon = totalTon * (METALL.pctObjetivo / 100)
  const ranked = [...acciones].sort((a, b) => {
    const costoA = a.inversionAnualUSD ?? 0
    const costoB = b.inversionAnualUSD ?? 0
    const ratioA = costoA === 0 ? Infinity : reduccionTon(a, agregado) / costoA
    const ratioB = costoB === 0 ? Infinity : reduccionTon(b, agregado) / costoB
    return ratioB - ratioA
  })
  const seleccion = new Set<string>()
  let acumulado = 0
  for (const a of ranked) {
    if (acumulado >= metaTon) break
    seleccion.add(a.id)
    acumulado += reduccionTon(a, agregado)
  }
  return seleccion
}
