'use client'

// ============================================================
// AgroFinance — Mapeo a Objetivos de Desarrollo Sostenible (RF-C8)
// ------------------------------------------------------------
// Sale de una observación en entrevista con un jefe de SIG con 15 años en
// agroindustria: la plataforma ya recibe combustibles, energía, residuos,
// fertilizantes y logística. Con eso ya tiene la base para decirle a la
// empresa qué ODS puede sustentar con dato duro — sin pedirle nada nuevo.
//
//   "Adicional a lo que ya te estoy mostrando, mira, tienes para el tema
//    de los ODS tales cosas que sí cumple tu operación."
//
// REGLA QUE NO SE NEGOCIA: este módulo NO declara cumplimiento.
// Un ODS no se "cumple" porque se midió combustible. Lo que este módulo
// dice es algo más chico y mucho más defendible: qué indicadores tiene la
// empresa RESPALDADOS CON DATO para reportar contra cada objetivo, y
// cuáles le faltan. Un auditor que lea "cumple ODS 13" cierra el informe;
// uno que lea "evidencia cuantificada para la meta 13.2, con trazabilidad
// al archivo de origen" lo acepta. La diferencia es el producto.
// ============================================================

import type { HuellaConsolidada } from './huellaConsolidada'
import type { FuenteDatos } from './datosPrueba'
import type { ResumenGasto } from './gastoAmbiental'
import type { Mecanismo } from './emissionFactors'

export type EstadoEvidencia = 'con-evidencia' | 'parcial' | 'sin-dato'

export const ESTADO_LABEL: Record<EstadoEvidencia, string> = {
  'con-evidencia': 'Con evidencia cuantificada',
  parcial: 'Evidencia parcial',
  'sin-dato': 'Sin dato en la plataforma',
}

export type ContextoODS = {
  huella: HuellaConsolidada
  fuentes: FuenteDatos[]
  gasto: ResumenGasto
  /** m³ del inventario hídrico; null si el módulo de agua no tiene datos. */
  aguaM3: number | null
  /** Acciones del plan de reducción con inversión declarada. */
  accionesReduccion: number
}

export type IndicadorODS = {
  /** Meta oficial del ODS (ej. "13.2"). */
  meta: string
  descripcion: string
  /** Qué dato de la plataforma lo sustenta. */
  evidencia: (c: ContextoODS) => { estado: EstadoEvidencia; dato: string | null }
}

export type ObjetivoODS = {
  numero: number
  titulo: string
  color: string
  /** Por qué este ODS aplica a una agroexportadora. */
  pertinencia: string
  indicadores: IndicadorODS[]
}

const tieneMecanismo = (h: HuellaConsolidada, m: Mecanismo) => (h.desgloseMecanismo[m] ?? 0) > 0

const ton = (kg: number) => `${(kg / 1000).toFixed(2)} tCO₂e`

// ============================================================
// Catálogo — solo los ODS que una agroexportadora puede sustentar con los
// datos que esta plataforma efectivamente captura. No se listan los 17:
// declarar un objetivo sin ningún indicador detrás es exactamente el
// "greenwashing de portada" que un verificador castiga.
// ============================================================
export const OBJETIVOS: ObjetivoODS[] = [
  {
    numero: 6,
    titulo: 'Agua limpia y saneamiento',
    color: '#26BDE2',
    pertinencia:
      'El riego tecnificado es el mayor consumo de agua de la operación y la autoridad nacional del agua ' +
      'exige sustentar el uso licenciado.',
    indicadores: [
      {
        meta: '6.4',
        descripcion: 'Uso eficiente del agua y extracción sostenible',
        evidencia: (c) =>
          c.aguaM3 !== null && c.aguaM3 > 0
            ? { estado: 'con-evidencia', dato: `${c.aguaM3.toLocaleString('es-PE')} m³ inventariados` }
            : { estado: 'sin-dato', dato: null },
      },
      {
        meta: '6.3',
        descripcion: 'Tratamiento de efluentes y reducción de vertidos',
        evidencia: (c) => {
          const g = c.gasto.porCategoria.find((x) => x.categoria === 'agua')
          return g && g.partidas > 0
            ? { estado: 'con-evidencia', dato: `S/ ${g.totalPEN.toLocaleString('es-PE')} invertidos` }
            : { estado: 'sin-dato', dato: null }
        },
      },
    ],
  },
  {
    numero: 7,
    titulo: 'Energía asequible y no contaminante',
    color: '#FCC30B',
    pertinencia:
      'El consumo eléctrico de riego y de planta de empaque concentra el Alcance 2 del inventario.',
    indicadores: [
      {
        meta: '7.3',
        descripcion: 'Mejora de la eficiencia energética',
        evidencia: (c) => {
          const riego = c.huella.desgloseMecanismo.riego ?? 0
          const packing = c.huella.desgloseMecanismo.packing ?? 0
          const total = riego + packing
          if (total <= 0) return { estado: 'sin-dato', dato: null }
          const inv = c.gasto.porCategoria.find((x) => x.categoria === 'eficiencia')
          return inv && inv.partidas > 0
            ? { estado: 'con-evidencia', dato: `${ton(total)} de consumo eléctrico · S/ ${inv.totalPEN.toLocaleString('es-PE')} en eficiencia` }
            : { estado: 'parcial', dato: `${ton(total)} medidos, sin inversión en eficiencia declarada` }
        },
      },
    ],
  },
  {
    numero: 8,
    titulo: 'Trabajo decente y crecimiento económico',
    color: '#A21942',
    pertinencia:
      'La exportación agrícola sostiene empleo formal en zona rural; el desacople entre crecimiento y ' +
      'huella es el indicador que piden los fondos.',
    indicadores: [
      {
        meta: '8.4',
        descripcion: 'Desacoplar el crecimiento económico de la degradación ambiental',
        evidencia: (c) =>
          c.huella.intensidadKgPorKg > 0
            ? {
                estado: 'con-evidencia',
                dato: `Intensidad ${c.huella.intensidadKgPorKg.toFixed(3)} kgCO₂e/kg exportado`,
              }
            : { estado: 'sin-dato', dato: null },
      },
    ],
  },
  {
    numero: 12,
    titulo: 'Producción y consumo responsables',
    color: '#BF8B2E',
    pertinencia:
      'Empaque, residuos sólidos y residuos peligrosos son obligación declarativa anual y trimestral ' +
      'ante la autoridad ambiental.',
    indicadores: [
      {
        meta: '12.4',
        descripcion: 'Gestión de residuos y productos químicos',
        evidencia: (c) => {
          const res = c.gasto.porCategoria.find((x) => x.categoria === 'residuos')
          const pel = c.gasto.porCategoria.find((x) => x.categoria === 'residuosPeligrosos')
          const n = (res?.partidas ?? 0) + (pel?.partidas ?? 0)
          if (n === 0) return { estado: 'sin-dato', dato: null }
          const ambas = (res?.partidas ?? 0) > 0 && (pel?.partidas ?? 0) > 0
          return {
            estado: ambas ? 'con-evidencia' : 'parcial',
            dato: ambas
              ? `${n} partidas de gestión de residuos con respaldo`
              : 'Falta una de las dos declaraciones (comunes y peligrosos)',
          }
        },
      },
      {
        meta: '12.5',
        descripcion: 'Reducción de generación de desechos',
        evidencia: (c) =>
          tieneMecanismo(c.huella, 'empaque')
            ? { estado: 'con-evidencia', dato: `${ton(c.huella.desgloseMecanismo.empaque ?? 0)} de materiales de empaque` }
            : { estado: 'sin-dato', dato: null },
      },
      {
        meta: '12.6',
        descripcion: 'Adopción de prácticas sostenibles e informes de sostenibilidad',
        evidencia: (c) =>
          c.fuentes.filter((f) => f.estado === 'sincronizado').length >= 3
            ? { estado: 'con-evidencia', dato: 'Inventario multi-área con trazabilidad al archivo de origen' }
            : { estado: 'parcial', dato: 'Inventario incompleto: faltan áreas por vincular' },
      },
    ],
  },
  {
    numero: 13,
    titulo: 'Acción por el clima',
    color: '#3F7E44',
    pertinencia:
      'Es el objetivo central del inventario: sin huella cuantificada no hay acceso a crédito verde ni a ' +
      'los requisitos de comprador europeo.',
    indicadores: [
      {
        meta: '13.2',
        descripcion: 'Incorporar medidas de cambio climático en políticas y planificación',
        evidencia: (c) =>
          c.huella.tieneDatos
            ? {
                estado: 'con-evidencia',
                dato: `Inventario GHG completo: ${c.huella.huellaTotalTon.toLocaleString('es-PE')} tCO₂e en Alcances 1, 2 y 3`,
              }
            : { estado: 'sin-dato', dato: null },
      },
      {
        meta: '13.3',
        descripcion: 'Mejora de la capacidad institucional frente al clima',
        evidencia: (c) => {
          const cap = c.gasto.porCategoria.find((x) => x.categoria === 'capacitacion')
          if (c.accionesReduccion > 0 && cap && cap.partidas > 0) {
            return { estado: 'con-evidencia', dato: `${c.accionesReduccion} acciones de reducción + capacitación declarada` }
          }
          if (c.accionesReduccion > 0) {
            return { estado: 'parcial', dato: `${c.accionesReduccion} acciones de reducción, sin capacitación declarada` }
          }
          return { estado: 'sin-dato', dato: null }
        },
      },
    ],
  },
  {
    numero: 15,
    titulo: 'Vida de ecosistemas terrestres',
    color: '#56C02B',
    pertinencia:
      'El manejo de suelo y de fertilizantes nitrogenados determina la degradación del suelo, y la ausencia ' +
      'de cambio de uso de suelo es requisito del reglamento europeo de deforestación.',
    indicadores: [
      {
        meta: '15.3',
        descripcion: 'Lucha contra la degradación del suelo',
        evidencia: (c) => {
          const n2o = c.huella.desgloseMecanismo.n2oCampo ?? 0
          const fert = c.huella.desgloseMecanismo.fertilizante ?? 0
          return n2o > 0 || fert > 0
            ? { estado: 'con-evidencia', dato: `${ton(n2o + fert)} de manejo de suelo y fertilización` }
            : { estado: 'sin-dato', dato: null }
        },
      },
      {
        meta: '15.2',
        descripcion: 'Gestión sostenible y fin de la deforestación',
        evidencia: (c) =>
          c.huella.tieneDatos
            ? { estado: 'con-evidencia', dato: 'Sin cambio de uso de suelo declarado en el periodo (criterio EUDR)' }
            : { estado: 'sin-dato', dato: null },
      },
    ],
  },
]

// ============================================================
// Evaluación
// ============================================================
export type IndicadorEvaluado = {
  meta: string
  descripcion: string
  estado: EstadoEvidencia
  dato: string | null
}

export type ObjetivoEvaluado = {
  objetivo: ObjetivoODS
  indicadores: IndicadorEvaluado[]
  conEvidencia: number
  parciales: number
  sinDato: number
  /** Estado agregado del objetivo, por el mejor indicador que lo sustenta. */
  estado: EstadoEvidencia
}

export function evaluarODS(c: ContextoODS): ObjetivoEvaluado[] {
  return OBJETIVOS.map((objetivo) => {
    const indicadores: IndicadorEvaluado[] = objetivo.indicadores.map((i) => {
      const r = i.evidencia(c)
      return { meta: i.meta, descripcion: i.descripcion, estado: r.estado, dato: r.dato }
    })
    const conEvidencia = indicadores.filter((i) => i.estado === 'con-evidencia').length
    const parciales = indicadores.filter((i) => i.estado === 'parcial').length
    const sinDato = indicadores.filter((i) => i.estado === 'sin-dato').length
    const estado: EstadoEvidencia =
      conEvidencia > 0 ? 'con-evidencia' : parciales > 0 ? 'parcial' : 'sin-dato'
    return { objetivo, indicadores, conEvidencia, parciales, sinDato, estado }
  })
}

export type ResumenODS = {
  objetivos: ObjetivoEvaluado[]
  /** ODS con al menos un indicador respaldado con dato. */
  sustentados: number
  totalObjetivos: number
  indicadoresConEvidencia: number
  totalIndicadores: number
  tieneDatos: boolean
}

export function resumirODS(c: ContextoODS): ResumenODS {
  const objetivos = evaluarODS(c)
  const totalIndicadores = objetivos.reduce((n, o) => n + o.indicadores.length, 0)
  const indicadoresConEvidencia = objetivos.reduce((n, o) => n + o.conEvidencia, 0)
  return {
    objetivos,
    sustentados: objetivos.filter((o) => o.estado === 'con-evidencia').length,
    totalObjetivos: objetivos.length,
    indicadoresConEvidencia,
    totalIndicadores,
    tieneDatos: indicadoresConEvidencia > 0,
  }
}

/**
 * Nota que acompaña al bloque de ODS en el informe. Existe para que nadie
 * lea la tabla como un certificado de cumplimiento.
 */
export const NOTA_ODS =
  'Esta sección no declara cumplimiento de los Objetivos de Desarrollo Sostenible. Indica qué indicadores ' +
  'de cada objetivo cuentan con dato cuantificado y trazable dentro del inventario, y cuáles todavía no. ' +
  'La contribución a un ODS se evalúa con criterios que exceden el alcance de un inventario de carbono.'
