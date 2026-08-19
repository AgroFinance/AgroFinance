// ============================================================
// AgroFinance — Benchmarks de intensidad, por alcance geográfico
// ------------------------------------------------------------
// Antes existía UN solo benchmark ("EU") fijo por cultivo, y cada pantalla
// calculaba por su cuenta si estábamos por encima o por debajo — con signos
// contradictorios entre el KPI y la tarjeta de comprador.
//
// Este módulo es la ÚNICA fuente de verdad de dos cosas:
//   1. Qué referencias de intensidad existen y cuál es su límite de sistema.
//   2. Cómo se calcula y se etiqueta el desvío contra una referencia.
//
// Regla dura: un alcance sin referencia publicada se declara `null`. No se
// rellena con un valor plausible; la UI muestra "sin dato de referencia".
// ============================================================

export type AlcanceBenchmark = 'peru' | 'region' | 'eu' | 'mundo'

/** Límite del sistema de una referencia — determina si es comparable. */
export type LimiteSistema = 'cradle-to-farm-gate' | 'cradle-to-gate' | 'corporativo'

export const LIMITE_LABEL: Record<LimiteSistema, string> = {
  'cradle-to-farm-gate': 'Cuna a puerta de finca',
  'cradle-to-gate': 'Cuna a puerta (incl. transporte a destino)',
  corporativo: 'Inventario corporativo',
}

export const ALCANCES: { id: AlcanceBenchmark; label: string }[] = [
  { id: 'peru', label: 'Perú' },
  { id: 'region', label: 'Región' },
  { id: 'eu', label: 'EU' },
  { id: 'mundo', label: 'Mundo' },
]

export type ReferenciaBenchmark = {
  /** kgCO₂e/kg de producto. `null` = no existe referencia publicada. */
  valor: number | null
  fuente: string | null
  limite: LimiteSistema | null
}

const SIN_DATO: ReferenciaBenchmark = { valor: null, fuente: null, limite: null }

/**
 * Referencias por cultivo y alcance. Solo entra aquí lo que tiene fuente
 * citable; el resto queda en null a propósito.
 */
export const BENCHMARKS: Record<string, Record<AlcanceBenchmark, ReferenciaBenchmark>> = {
  'Palta Hass': {
    peru: SIN_DATO,
    region: SIN_DATO,
    eu: { valor: 0.68, fuente: 'Referencia sectorial UE — palta fresca importada', limite: 'cradle-to-gate' },
    mundo: SIN_DATO,
  },
  'Mango Kent': {
    // Valor publicado en el informe técnico de huella de producto de mango
    // peruano (CarbonCloud, 14/10/2024). Es real, pero su límite de sistema
    // llega solo a la puerta de finca: NO es comparable de forma directa
    // contra una intensidad cradle-to-gate que incluye el flete a Europa.
    peru: {
      valor: 0.35,
      fuente: 'Informe técnico de huella de producto — Mango Perú (14/10/2024)',
      limite: 'cradle-to-farm-gate',
    },
    region: SIN_DATO,
    eu: { valor: 0.62, fuente: 'Referencia sectorial UE — mango fresco importado', limite: 'cradle-to-gate' },
    mundo: SIN_DATO,
  },
}

/** Límite del sistema con el que AgroFinance calcula la intensidad de producto. */
export const LIMITE_PROPIO: LimiteSistema = 'cradle-to-gate'

export type EstadoAlcance = 'disponible' | 'sin-dato' | 'limite-distinto'

export function estadoAlcance(cultivo: string, alcance: AlcanceBenchmark): EstadoAlcance {
  const ref = BENCHMARKS[cultivo]?.[alcance]
  if (!ref || ref.valor === null) return 'sin-dato'
  if (ref.limite !== LIMITE_PROPIO) return 'limite-distinto'
  return 'disponible'
}

export const MOTIVO_ALCANCE: Record<EstadoAlcance, string> = {
  disponible: '',
  'sin-dato': 'sin dato de referencia',
  'limite-distinto': 'referencia con otro límite del sistema — no comparable',
}

export function referenciaDe(cultivo: string, alcance: AlcanceBenchmark): ReferenciaBenchmark {
  return BENCHMARKS[cultivo]?.[alcance] ?? SIN_DATO
}

/** Primer alcance utilizable de un cultivo (el default del selector). */
export function alcancePorDefecto(cultivo: string): AlcanceBenchmark {
  const ok = ALCANCES.find((a) => estadoAlcance(cultivo, a.id) === 'disponible')
  return ok?.id ?? 'eu'
}

// ============================================================
// Desvío vs. benchmark — helper PURO y única fuente de verdad
// ------------------------------------------------------------
// Convención: positivo = la intensidad está POR ENCIMA de la referencia
// (peor desempeño relativo). Ningún componente vuelve a calcular el signo
// por su cuenta: el KPI y la tarjeta de comprador consumen esto mismo.
//
//   deviationVsBenchmark(0.78, 0.68) → { pct: 15, etiqueta: 'por encima', signo: '+' }
// ============================================================
export type Desvio = {
  /** Magnitud absoluta en %, redondeada. null si no se puede calcular. */
  pct: number | null
  /** % con signo: positivo = por encima de la referencia. */
  pctConSigno: number | null
  etiqueta: 'por encima' | 'por debajo' | 'en línea' | 'sin dato'
  signo: '+' | '−' | ''
  /** Texto listo para UI: "+15% por encima". */
  texto: string
  /** true cuando estar por encima es la lectura desfavorable. */
  desfavorable: boolean
}

export const SIN_DESVIO: Desvio = {
  pct: null, pctConSigno: null, etiqueta: 'sin dato', signo: '', texto: 'sin dato', desfavorable: false,
}

export function deviationVsBenchmark(intensidad: number | null, benchmark: number | null): Desvio {
  if (intensidad === null || benchmark === null || !isFinite(intensidad) || !isFinite(benchmark) || benchmark === 0) {
    return SIN_DESVIO
  }
  const bruto = ((intensidad - benchmark) / benchmark) * 100
  const redondeado = Math.round(bruto)
  if (redondeado === 0) {
    return { pct: 0, pctConSigno: 0, etiqueta: 'en línea', signo: '', texto: 'en línea con la referencia', desfavorable: false }
  }
  const porEncima = redondeado > 0
  const abs = Math.abs(redondeado)
  return {
    pct: abs,
    pctConSigno: redondeado,
    etiqueta: porEncima ? 'por encima' : 'por debajo',
    signo: porEncima ? '+' : '−',
    texto: `${porEncima ? '+' : '−'}${abs}% ${porEncima ? 'por encima' : 'por debajo'}`,
    desfavorable: porEncima,
  }
}

export const DISCLAIMER_BENCHMARK =
  'Un valor mayor no implica peor desempeño; la intensidad depende de las condiciones de producción.'
