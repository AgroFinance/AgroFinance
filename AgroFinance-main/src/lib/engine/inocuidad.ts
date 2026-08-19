'use client'

// ============================================================
// AgroFinance — Preparación para certificaciones de inocuidad y sistema
// ------------------------------------------------------------
// ISO 22000, FSSC 22000, BRC, BASC y SMETA salieron una y otra vez en las
// entrevistas. Los jefes de SIG no describieron el dolor como "no sé si
// cumplo", sino como algo mucho más concreto:
//
//   "Tenemos 2 horas para recopilar todos los papeles cuando cae la
//    auditoría."
//
// Por eso este módulo NO calcula ni puntúa cumplimiento, y la distinción
// importa: ISO 22000 es un sistema de gestión de inocuidad basado en HACCP
// que se audita contra evidencia documental y observación en planta. No se
// deriva de datos de consumo. Una plataforma que emitiera un "87% de
// cumplimiento ISO 22000" estaría inventando un número que ningún organismo
// certificador reconoce, y bastaría para que un auditor descarte lo demás.
//
// Lo que sí resuelve: saber, antes de que llegue el auditor, qué evidencia
// está lista, cuál venció y cuál falta — que es el trabajo contra reloj.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { sanitizar } from '@/lib/store/anotaciones'

export type EsquemaId = 'iso22000' | 'fssc22000' | 'brc' | 'basc' | 'smeta'

export type Esquema = {
  id: EsquemaId
  nombre: string
  organismo: string
  /** Qué evalúa realmente, para que no se confunda con el inventario. */
  alcance: string
  /** Periodicidad de recertificación, en meses. */
  vigenciaMeses: number
}

export const ESQUEMAS: Record<EsquemaId, Esquema> = {
  iso22000: {
    id: 'iso22000',
    nombre: 'ISO 22000',
    organismo: 'Organismo de certificación acreditado',
    alcance: 'Sistema de gestión de inocuidad alimentaria basado en HACCP. Se audita en planta, no se calcula.',
    vigenciaMeses: 36,
  },
  fssc22000: {
    id: 'fssc22000',
    nombre: 'FSSC 22000',
    organismo: 'Foundation FSSC · esquema reconocido por GFSI',
    alcance: 'ISO 22000 más los programas de prerrequisitos sectoriales y los requisitos adicionales del esquema.',
    vigenciaMeses: 36,
  },
  brc: {
    id: 'brc',
    nombre: 'BRCGS Food Safety',
    organismo: 'BRCGS · reconocido por GFSI',
    alcance: 'Norma de inocuidad que exige el retail británico y europeo. Auditoría anual con grado.',
    vigenciaMeses: 12,
  },
  basc: {
    id: 'basc',
    nombre: 'BASC',
    organismo: 'World BASC Organization',
    alcance: 'Seguridad de la cadena de suministro y control antinarcótico en comercio exterior.',
    vigenciaMeses: 12,
  },
  smeta: {
    id: 'smeta',
    nombre: 'SMETA / Sedex',
    organismo: 'Sedex',
    alcance: 'Auditoría ética: condiciones laborales, salud y seguridad, medio ambiente y ética empresarial.',
    vigenciaMeses: 12,
  },
}

export const ESQUEMAS_LISTA: Esquema[] = Object.values(ESQUEMAS)

/** Un requisito documental concreto que el auditor va a pedir. */
export type Requisito = {
  id: string
  esquemas: EsquemaId[]
  titulo: string
  detalle: string
  /**
   * true cuando AgroFinance ya produce esta evidencia con lo que tiene.
   * Es la respuesta honesta a "¿qué me resuelve la plataforma?".
   */
  cubiertoPorPlataforma: boolean
  comoLoCubre?: string
}

export const REQUISITOS: Requisito[] = [
  {
    id: 'politica',
    esquemas: ['iso22000', 'fssc22000', 'brc'],
    titulo: 'Política de inocuidad firmada por la dirección',
    detalle: 'Documento vigente, firmado y comunicado al personal.',
    cubiertoPorPlataforma: false,
  },
  {
    id: 'haccp',
    esquemas: ['iso22000', 'fssc22000', 'brc'],
    titulo: 'Plan HACCP con análisis de peligros',
    detalle: 'Diagrama de flujo validado, puntos críticos de control y límites definidos.',
    cubiertoPorPlataforma: false,
  },
  {
    id: 'ppr',
    esquemas: ['iso22000', 'fssc22000'],
    titulo: 'Programas de prerrequisitos (PPR)',
    detalle: 'Limpieza, control de plagas, agua potable, higiene del personal y mantenimiento.',
    cubiertoPorPlataforma: false,
  },
  {
    id: 'trazabilidad',
    esquemas: ['iso22000', 'fssc22000', 'brc', 'basc'],
    titulo: 'Trazabilidad de lote y prueba de retiro',
    detalle: 'Rastrear un lote hacia adelante y hacia atrás dentro del tiempo que exige la norma.',
    cubiertoPorPlataforma: true,
    comoLoCubre:
      'El inventario ya rastrea cada consumo hasta el archivo, hoja y fila de origen. Esa cadena sirve como evidencia del lado de insumos y logística; la trazabilidad de producto en planta sigue siendo del sistema de calidad.',
  },
  {
    id: 'proveedores',
    esquemas: ['iso22000', 'fssc22000', 'brc', 'smeta'],
    titulo: 'Evaluación y aprobación de proveedores',
    detalle: 'Criterios de homologación y registro de desempeño de cada proveedor crítico.',
    cubiertoPorPlataforma: true,
    comoLoCubre:
      'El registro de gasto ambiental guarda proveedor y documento de respaldo por partida, que es parte de la evidencia de homologación.',
  },
  {
    id: 'monitoreos',
    esquemas: ['iso22000', 'fssc22000', 'smeta'],
    titulo: 'Monitoreos ambientales y de agua vigentes',
    detalle: 'Informes anuales con firma del profesional a cargo, dentro de vigencia.',
    cubiertoPorPlataforma: true,
    comoLoCubre:
      'La categoría "Monitoreos ambientales" del registro de gasto avisa cuando el periodo va sin partida cargada.',
  },
  {
    id: 'residuos',
    esquemas: ['iso22000', 'smeta'],
    titulo: 'Manejo y disposición de residuos',
    detalle: 'Declaración anual de residuos sólidos y trimestral de peligrosos, con EO-RS autorizada.',
    cubiertoPorPlataforma: true,
    comoLoCubre:
      'Ambas obligaciones están en el registro de gasto ambiental como categorías con aviso de periodo vacío.',
  },
  {
    id: 'capacitacion',
    esquemas: ['iso22000', 'fssc22000', 'brc', 'basc', 'smeta'],
    titulo: 'Capacitación del personal con registro de asistencia',
    detalle: 'Plan anual ejecutado, con evaluación de eficacia.',
    cubiertoPorPlataforma: false,
  },
  {
    id: 'auditoria-interna',
    esquemas: ['iso22000', 'fssc22000', 'brc', 'basc', 'smeta'],
    titulo: 'Auditoría interna y revisión por la dirección',
    detalle: 'Ciclo completo con hallazgos, acciones correctivas y cierre verificado.',
    cubiertoPorPlataforma: false,
  },
  {
    id: 'desempeno-ambiental',
    esquemas: ['smeta'],
    titulo: 'Desempeño ambiental cuantificado',
    detalle: 'Consumo de energía, agua y emisiones del periodo, con metodología declarada.',
    cubiertoPorPlataforma: true,
    comoLoCubre:
      'Es exactamente lo que produce el informe técnico: inventario por alcance, factores con fuente y versión, y periodo de captura.',
  },
]

// ============================================================
// Estado declarado por la empresa
// ------------------------------------------------------------
// La plataforma no puede observar si existe un plan HACCP firmado. Lo
// declara la empresa y queda con su documento de respaldo, que es lo que
// se le muestra al auditor.
// ============================================================
export type EstadoRequisito = 'listo' | 'en-proceso' | 'no-aplica' | 'pendiente'

export const ESTADO_REQ_LABEL: Record<EstadoRequisito, string> = {
  listo: 'Evidencia lista',
  'en-proceso': 'En preparación',
  'no-aplica': 'No aplica',
  pendiente: 'Sin evidencia',
}

export type DeclaracionRequisito = {
  estado: EstadoRequisito
  /** Documento, código o ubicación donde vive la evidencia. */
  respaldo: string
  /** ISO date de vencimiento, cuando aplica. */
  vence: string
}

export type EstadoInocuidad = {
  requisitos: Record<string, DeclaracionRequisito>
}

export const INOCUIDAD_VACIA: EstadoInocuidad = { requisitos: {} }

const STORAGE_KEY = 'agrofinance_inocuidad'
const EVENTO = 'agrofinance:inocuidad-cambio'

export function leerInocuidad(): EstadoInocuidad {
  if (typeof window === 'undefined') return INOCUIDAD_VACIA
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return INOCUIDAD_VACIA
    const p = JSON.parse(raw)
    return { requisitos: p?.requisitos ?? {} }
  } catch {
    return INOCUIDAD_VACIA
  }
}

export function guardarInocuidad(e: EstadoInocuidad) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(e))
  window.dispatchEvent(new Event(EVENTO))
}

export const declaracionDe = (estado: EstadoInocuidad, id: string): DeclaracionRequisito =>
  estado.requisitos[id] ?? { estado: 'pendiente', respaldo: '', vence: '' }

/** true cuando la evidencia declaró fecha de vencimiento y ya pasó. */
export function estaVencido(d: DeclaracionRequisito, hoy = new Date()): boolean {
  if (!d.vence) return false
  const f = new Date(d.vence)
  if (isNaN(f.getTime())) return false
  return f < hoy
}

export type ResumenEsquema = {
  esquema: Esquema
  total: number
  listos: number
  enProceso: number
  pendientes: number
  noAplica: number
  vencidos: number
  /** % de requisitos aplicables con evidencia lista y vigente. */
  pctListo: number
}

export function resumirEsquema(
  esquemaId: EsquemaId, estado: EstadoInocuidad, hoy = new Date(),
): ResumenEsquema {
  const reqs = REQUISITOS.filter((r) => r.esquemas.includes(esquemaId))
  let listos = 0
  let enProceso = 0
  let pendientes = 0
  let noAplica = 0
  let vencidos = 0

  for (const r of reqs) {
    const d = declaracionDe(estado, r.id)
    const venc = estaVencido(d, hoy)
    if (venc) vencidos++
    if (d.estado === 'no-aplica') noAplica++
    else if (d.estado === 'listo' && !venc) listos++
    else if (d.estado === 'en-proceso') enProceso++
    else pendientes++
  }

  const aplicables = reqs.length - noAplica
  return {
    esquema: ESQUEMAS[esquemaId],
    total: reqs.length,
    listos,
    enProceso,
    pendientes,
    noAplica,
    vencidos,
    pctListo: aplicables > 0 ? Math.round((listos / aplicables) * 100) : 0,
  }
}

export const resumirTodos = (estado: EstadoInocuidad, hoy = new Date()): ResumenEsquema[] =>
  ESQUEMAS_LISTA.map((e) => resumirEsquema(e.id, estado, hoy))

export function useInocuidad() {
  const [estado, setEstado] = useState<EstadoInocuidad>(INOCUIDAD_VACIA)

  useEffect(() => {
    setEstado(leerInocuidad())
    const on = () => setEstado(leerInocuidad())
    window.addEventListener(EVENTO, on)
    window.addEventListener('storage', on)
    return () => {
      window.removeEventListener(EVENTO, on)
      window.removeEventListener('storage', on)
    }
  }, [])

  const declarar = useCallback((id: string, d: Partial<DeclaracionRequisito>) => {
    setEstado((prev) => {
      const actual = prev.requisitos[id] ?? {
        estado: 'pendiente' as EstadoRequisito, respaldo: '', vence: '',
      }
      const next: EstadoInocuidad = {
        requisitos: {
          ...prev.requisitos,
          [id]: {
            estado: d.estado ?? actual.estado,
            respaldo: sanitizar(d.respaldo ?? actual.respaldo, 160),
            vence: d.vence ?? actual.vence,
          },
        },
      }
      guardarInocuidad(next)
      return next
    })
  }, [])

  return { estado, declarar }
}

/** Nota que impide leer esta pantalla como un certificado. */
export const NOTA_INOCUIDAD =
  'Esta sección no certifica ni evalúa cumplimiento. ISO 22000 y los demás esquemas se auditan en planta contra ' +
  'evidencia documental por un organismo acreditado. Lo que se registra aquí es el estado de preparación que ' +
  'declara la propia empresa, para tener la evidencia ubicada antes de la auditoría y no reunirla contra reloj.'
