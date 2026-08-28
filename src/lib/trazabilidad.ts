// ============================================================
// AgroFinance — Trazabilidad de la huella (drill-down auditable)
// ------------------------------------------------------------
// Para cada fuente del Top-5 reconstruye la cadena de evidencia que
// exige un banco (BBVA/BCP) o una verificadora (Bureau Veritas/SGS):
//
//   indicador  →  cálculo (actividad × factor = emisión)
//              →  registros de origen (facturas / recibos / B-L)
//              →  archivo de la empresa del que se leyó
//
// "Con un clic, ver de dónde sale el indicador y poder defenderlo."
// AgroFinance LEE los Excel que la empresa ya usa; no los modifica.
//
// Antes esto se armaba enteramente sobre pilotData (nombres de empresa y
// registros ficticios) sin importar qué hubiera cargado el usuario de
// verdad — mostraba "AgroMype del Norte" y cifras inventadas encima de
// una huella real. Ahora se construye desde `FuenteDatos.lineas`, las
// mismas LineaClasificada[] que ghgClassify ya calculó para cada archivo
// (demo activo o subido por el usuario) — el mismo dato que alimenta el
// total del dashboard, no una copia paralela.
// ============================================================

import { FUENTE_META, type FuenteEmision, type Mecanismo } from './emissionFactors'
import type { FuenteDatos } from './datosPrueba'
import { archivosDeUsuario } from './huellaConsolidada'
import type { LineaClasificada } from './ghgClassify'

const fmt = (n: number) => Math.round(n).toLocaleString('es-PE')

export type CalcLinea = {
  concepto: string
  actividad: number
  actividadUnidad: string
  factor: number
  factorUnidad: string
  emisionKg: number
}

export type Registro = {
  fecha: string
  referencia: string
  proveedor: string
  cantidad: string
}

export type Trazabilidad = {
  fuente: FuenteEmision
  titulo: string
  scope: 1 | 2 | 3
  emisionTon: number // valor que aparece en el dashboard (asignado a exportación)
  lineas: CalcLinea[]
  factorFuente: string
  asignacionNota?: string // si el bruto difiere del asignado (descarte, ISO 14044)
  archivo: string
  archivoNota: string
  columnasLeidas: string[] // columnas que la plataforma leyó del archivo
  registrosTotal: number
  registros: Registro[] // muestra de los registros de origen
}

const ARCHIVO_NOTA = 'AgroFinance no modifica tus archivos — solo los lee.'

/** Mecanismo → fuente de emisión equivalente — mismo mapeo que
 *  FUENTE_DE_MECANISMO en huellaConsolidada.ts (duplicado a propósito
 *  para no crear un import circular entre ambos módulos). */
const FUENTE_DE_MECANISMO: Record<Mecanismo, FuenteEmision> = {
  riego: 'electricidadRiego',
  n2oCampo: 'fertilizante',
  fertilizante: 'fertilizante',
  maquinaria: 'dieselCampo',
  packing: 'packingEnergia',
  empaque: 'materiales',
  flete: 'transporteMaritimo',
  pesticidas: 'fertilizante',
  refrigerante: 'refrigerante',
}

export function trazabilidadDe(fuente: FuenteEmision, fuentes: FuenteDatos[]): Trazabilidad {
  // Mismo criterio de "cuenta para el total" que consolidar() en
  // huellaConsolidada.ts: demo activo (sin error) + archivos reales
  // sincronizados.
  const demoActivas = fuentes.filter((f) => f.isDemo && f.estado !== 'error')
  const activas = [...demoActivas, ...archivosDeUsuario(fuentes)]

  const matches: { f: FuenteDatos; l: LineaClasificada }[] = []
  for (const f of activas) {
    for (const l of f.lineas ?? []) {
      if (l.estado !== 'leido' || !l.mecanismo || l.emisionKg == null) continue
      if (FUENTE_DE_MECANISMO[l.mecanismo] !== fuente) continue
      matches.push({ f, l })
    }
  }

  const emisionTotalKg = matches.reduce((s, { l }) => s + (l.emisionKg ?? 0), 0)

  // Una fila de cálculo por cada combinación real (mecanismo + unidad) —
  // no se promedian unidades distintas (kg de urea, kg de cartón, kWh...)
  // en una sola línea ficticia.
  const grupos = new Map<string, { concepto: string; actividad: number; unidad: string; emisionKg: number }>()
  for (const { l } of matches) {
    const clave = `${l.mecanismo}::${l.unidad}`
    const actual = grupos.get(clave) ?? { concepto: l.campoLeido, actividad: 0, unidad: l.unidad, emisionKg: 0 }
    actual.actividad += l.valor ?? 0
    actual.emisionKg += l.emisionKg ?? 0
    grupos.set(clave, actual)
  }
  const lineas: CalcLinea[] = Array.from(grupos.values()).map((g) => ({
    concepto: g.concepto,
    actividad: g.actividad,
    actividadUnidad: g.unidad || '—',
    factor: g.actividad > 0 ? +(g.emisionKg / g.actividad).toFixed(4) : 0,
    factorUnidad: `kgCO₂e/${g.unidad || 'u'}`,
    emisionKg: g.emisionKg,
  }))

  const registros: Registro[] = matches.slice(0, 30).map(({ f, l }) => ({
    fecha: f.actualizado,
    referencia: `${l.hoja} · fila ${l.fila}`,
    proveedor: f.archivo,
    cantidad: `${fmt(l.valor ?? 0)} ${l.unidad || ''}`.trim(),
  }))

  const archivos = Array.from(new Set(matches.map(({ f }) => f.archivo)))
  const columnasLeidas = Array.from(new Set(matches.map(({ l }) => l.campoLeido)))
  const factoresFuente = Array.from(new Set(matches.map(({ l }) => l.factorFuente).filter((x): x is string => !!x)))
  const scope = (matches[0]?.l.scopeAsignado ?? FUENTE_META[fuente].scope ?? 1) as 1 | 2 | 3

  return {
    fuente,
    titulo: FUENTE_META[fuente].label,
    scope,
    emisionTon: +(emisionTotalKg / 1000).toFixed(3),
    lineas,
    factorFuente: factoresFuente.join(' · ') || '—',
    archivo: archivos.join(', ') || 'Sin archivo vinculado',
    archivoNota: matches.length ? ARCHIVO_NOTA : 'Se activa al vincular o cargar un archivo con esta fuente.',
    columnasLeidas,
    registrosTotal: matches.length,
    registros,
  }
}
