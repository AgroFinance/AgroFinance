// ============================================================
// AgroFinance — Clasificación GHG Protocol (módulo común)
// ------------------------------------------------------------
// Una sola cadena de cálculo para TODA la plataforma:
//
//   archivo → parsearArchivo() → LineaLeida[]
//           → ghgClassify()    → LineaClasificada[]  (scope + factor + mecanismo + emisión)
//           → resumirLineas()  → ResumenClasificacion
//
// Antes esta lógica vivía duplicada dentro de la pantalla de carga de
// facturas y no salía de ahí: Configuración listaba archivos "sincronizados"
// que no movían ni un número del Dashboard. Ahora el mismo módulo alimenta
// las dos entradas (carga de facturas y vinculación de archivos) y el
// resultado es el que consumen Dashboard, Inventario y Por producto.
//
// Reglas duras:
//  · Lo que no se reconoce NO se inventa: la línea queda `ignorado` con su
//    motivo escrito, y no contamina el total.
//  · Cada emisión conserva el factor, su fuente y su versión — sin eso no
//    hay trazabilidad y el número no sirve para auditoría.
// ============================================================

import {
  FE, GWP, N_CONTENIDO, huellaFertilizante,
  type Mecanismo,
} from './emissionFactors'

// ============================================================
// 1. Catálogo de factores disponibles para asignar/corregir
// ------------------------------------------------------------
// Es la lista que puebla los desplegables de corrección de mapeo, y la
// misma tabla que se imprime en el reporte técnico y en Configuración.
// ============================================================
export type ClaveFactor =
  | 'dieselLitro' | 'dieselGalon' | 'electricidadSEIN'
  | 'ureaProduccion' | 'nitratoAmonioProduccion' | 'n2oSuelos'
  | 'cartonCorrugado' | 'filmPlastico' | 'paletMadera'
  | 'camionReefer' | 'buqueReefer'

export type FactorCatalogo = {
  clave: ClaveFactor
  label: string
  valor: number
  unidad: string
  fuente: string
  version: string
  scope: 1 | 2 | 3
  mecanismo: Mecanismo
  /** Unidad de la actividad que consume este factor (para validar la lectura). */
  unidadActividad: string
}

export const CATALOGO_FACTORES: FactorCatalogo[] = [
  {
    clave: 'dieselLitro', label: 'Diésel B5 (litros)', valor: FE.dieselLitro.valor, unidad: FE.dieselLitro.unidad,
    fuente: FE.dieselLitro.fuente, version: 'IPCC 2006 GL · DEFRA 2024', scope: 1, mecanismo: 'maquinaria', unidadActividad: 'L',
  },
  {
    clave: 'dieselGalon', label: 'Diésel B5 (galones)', valor: FE.dieselGalon.valor, unidad: FE.dieselGalon.unidad,
    fuente: FE.dieselGalon.fuente, version: 'IPCC 2006 GL · DEFRA 2024', scope: 1, mecanismo: 'maquinaria', unidadActividad: 'gal',
  },
  {
    clave: 'electricidadSEIN', label: 'Electricidad red SEIN', valor: FE.electricidadSEIN.valor, unidad: FE.electricidadSEIN.unidad,
    fuente: FE.electricidadSEIN.fuente, version: 'MINAM/COES 2025', scope: 2, mecanismo: 'riego', unidadActividad: 'kWh',
  },
  {
    clave: 'n2oSuelos', label: 'N₂O de suelos gestionados (directo + indirecto)', valor: 0.01, unidad: 'kg N₂O-N/kg N',
    fuente: 'IPCC 2019 Refinement · GWP AR6 (N₂O = 273)', version: 'IPCC 2019 · AR6', scope: 1, mecanismo: 'n2oCampo', unidadActividad: 'kg fertilizante',
  },
  {
    clave: 'ureaProduccion', label: 'Urea — producción upstream', valor: FE.ureaProduccion.valor, unidad: FE.ureaProduccion.unidad,
    fuente: FE.ureaProduccion.fuente, version: 'Ecoinvent 3.9', scope: 3, mecanismo: 'fertilizante', unidadActividad: 'kg',
  },
  {
    clave: 'nitratoAmonioProduccion', label: 'Nitrato de amonio — producción upstream', valor: FE.nitratoAmonioProduccion.valor,
    unidad: FE.nitratoAmonioProduccion.unidad, fuente: FE.nitratoAmonioProduccion.fuente, version: 'Ecoinvent 3.9',
    scope: 3, mecanismo: 'fertilizante', unidadActividad: 'kg',
  },
  {
    clave: 'cartonCorrugado', label: 'Cartón corrugado', valor: FE.cartonCorrugado.valor, unidad: FE.cartonCorrugado.unidad,
    fuente: FE.cartonCorrugado.fuente, version: 'Ecoinvent 3.9 · DEFRA 2024', scope: 3, mecanismo: 'empaque', unidadActividad: 'kg',
  },
  {
    clave: 'filmPlastico', label: 'Film plástico (LDPE)', valor: FE.filmPlastico.valor, unidad: FE.filmPlastico.unidad,
    fuente: FE.filmPlastico.fuente, version: 'Ecoinvent 3.9', scope: 3, mecanismo: 'empaque', unidadActividad: 'kg',
  },
  {
    clave: 'paletMadera', label: 'Palet de madera (EUR)', valor: FE.paletMadera.valor, unidad: FE.paletMadera.unidad,
    fuente: FE.paletMadera.fuente, version: 'Ecoinvent 3.9', scope: 3, mecanismo: 'empaque', unidadActividad: 'u',
  },
  {
    clave: 'camionReefer', label: 'Camión refrigerado', valor: FE.camionReefer.valor, unidad: FE.camionReefer.unidad,
    fuente: FE.camionReefer.fuente, version: 'GLEC v3 · ISO 14083:2023', scope: 3, mecanismo: 'flete', unidadActividad: 't·km',
  },
  {
    clave: 'buqueReefer', label: 'Buque portacontenedor reefer', valor: FE.buqueReefer.valor, unidad: FE.buqueReefer.unidad,
    fuente: FE.buqueReefer.fuente, version: 'GLEC v3 · ISO 14083:2023', scope: 3, mecanismo: 'flete', unidadActividad: 't·km',
  },
]

export const factorPorClave = (c: ClaveFactor): FactorCatalogo =>
  CATALOGO_FACTORES.find((f) => f.clave === c) as FactorCatalogo

// ============================================================
// 2. Línea leída de un archivo (salida del parser)
// ============================================================
export type LineaLeida = {
  /** Identificador estable dentro del archivo: hoja + fila + columna. */
  id: string
  /** Nombre del campo tal como aparece en el archivo. */
  campoLeido: string
  /** Valor numérico leído; null si la celda no era numérica. */
  valor: number | null
  unidad: string
  /** Hoja / sección de origen (para la trazabilidad clic-a-fuente). */
  hoja: string
  fila: number
  /** true si la celda venía en una hoja o fila oculta del libro. */
  oculto?: boolean
  /** Texto crudo, útil cuando la lectura falla y hay que mostrar el motivo. */
  crudo?: string
}

export type EstadoLinea = 'leido' | 'ignorado'

export type LineaClasificada = LineaLeida & {
  estado: EstadoLinea
  motivoIgnorado: string | null
  scopeAsignado: 1 | 2 | 3 | null
  factorAsignado: ClaveFactor | null
  factorValor: number | null
  factorUnidad: string | null
  factorFuente: string | null
  factorVersion: string | null
  mecanismo: Mecanismo | null
  /** kgCO₂e — null cuando la línea está ignorada. */
  emisionKg: number | null
  /** Lo que la máquina asignó antes de cualquier corrección humana (RNF-3.3). */
  original: {
    scopeAsignado: 1 | 2 | 3 | null
    factorAsignado: ClaveFactor | null
    emisionKg: number | null
  }
  /** true cuando un usuario cambió el mapeo respecto de `original`. */
  corregido: boolean
  /** true cuando un usuario revisó y dio por buena la fila. */
  confirmado: boolean
}

// ============================================================
// 3. Reglas de reconocimiento — nombre de campo/unidad → factor
// ------------------------------------------------------------
// Deliberadamente conservadoras: ante la duda, la línea se ignora con
// motivo antes que asignarle un factor equivocado.
// ============================================================
type Regla = { factor: ClaveFactor; palabras: RegExp; unidades?: RegExp }

const REGLAS: Regla[] = [
  { factor: 'dieselGalon', palabras: /(diesel|diésel|petroleo|combustible|d2|b5).*(gal)|(gal).*(diesel|diésel)/i, unidades: /^(gal|galon|galones|gl)$/i },
  { factor: 'dieselLitro', palabras: /diesel|diésel|petroleo|combustible|\bd2\b|\bb5\b/i, unidades: /^(l|lt|ltr|litro|litros)$/i },
  { factor: 'electricidadSEIN', palabras: /electric|energia|energía|kwh|sein|consumo.*luz|riego.*kwh|packing.*kwh/i, unidades: /^(kwh|kw-h|mwh)$/i },
  { factor: 'ureaProduccion', palabras: /urea/i, unidades: /^(kg|kilos|kilogramos|t|tn|ton)$/i },
  { factor: 'nitratoAmonioProduccion', palabras: /nitrato.*amonio|nitroamonio|\ban\b/i, unidades: /^(kg|kilos|t|tn|ton)$/i },
  { factor: 'n2oSuelos', palabras: /fertiliz|nitrogenado|abono|\bn\b.*aplicado/i, unidades: /^(kg|kilos|t|tn|ton)$/i },
  { factor: 'cartonCorrugado', palabras: /carton|cartón|caja|corrugad/i, unidades: /^(kg|kilos|u|und|unidad|cajas)$/i },
  { factor: 'filmPlastico', palabras: /film|plastico|plástico|ldpe|stretch|esquinero/i, unidades: /^(kg|kilos)$/i },
  { factor: 'paletMadera', palabras: /palet|pallet|parihuela/i, unidades: /^(u|und|unidad|unidades|palets)$/i },
  { factor: 'camionReefer', palabras: /camion|camión|terrestre|flete.*tierra|distancia.*camion/i, unidades: /^(t.?km|tkm|km)$/i },
  { factor: 'buqueReefer', palabras: /maritim|marítim|buque|naviera|reefer|flete.*mar|distancia.*mar/i, unidades: /^(t.?km|tkm|km)$/i },
]

const ES_PACKING = /packing|empaque|prefrio|prefrío|camara|cámara|frio|frío|planta/i

const normalizarUnidad = (u: string) => (u || '').trim().replace(/\./g, '')

/** Intenta reconocer qué factor aplica a una línea. null = no reconocida. */
export function reconocerFactor(campoLeido: string, unidad: string): ClaveFactor | null {
  const campo = campoLeido || ''
  const uni = normalizarUnidad(unidad)
  // Primero las reglas cuya unidad coincide: la unidad es la señal más fuerte.
  for (const r of REGLAS) {
    if (r.unidades && r.unidades.test(uni) && r.palabras.test(campo)) return r.factor
  }
  // Si la línea DECLARA una unidad y ninguna regla la aceptó, no se fuerza un
  // factor por el solo parecido del nombre: una cantidad en litros no puede
  // cobrar el factor de electricidad (kWh), ni unas horas de bombeo el de
  // energía. Atribuir mal es peor que declarar la línea ignorada.
  // Debe seguir igual que reconocer_factor en functions/engine (test_parity).
  if (uni) return null
  // Sin unidad declarada el nombre del campo es la única señal disponible
  // (columnas tipo "diesel_consumido" en planillas de campo).
  for (const r of REGLAS) {
    if (r.palabras.test(campo)) return r.factor
  }
  return null
}

// ============================================================
// 4. Cálculo de emisión de una línea
// ------------------------------------------------------------
// El N₂O de suelos no es una multiplicación simple: se calcula con el
// método IPCC 2019 (N puro → N₂O directo + indirecto → GWP AR6). Se
// resuelve aquí para que la corrección de mapeo también lo respete.
// ============================================================
export function emisionDeLinea(factor: ClaveFactor, valor: number): number {
  if (factor === 'n2oSuelos') {
    const f = huellaFertilizante(valor, 'urea')
    return f.n2oDirecto + f.n2oIndirecto + f.co2Urea
  }
  return valor * factorPorClave(factor).valor
}

// Documenta el método usado, para el informe técnico.
export const METODO_N2O = `N₂O de suelos: N puro = kg fertilizante × ${N_CONTENIDO.urea} · EF1 = 0,01 kg N₂O-N/kg N · GWP AR6 N₂O = ${GWP.N2O}`

// ============================================================
// 5. Clasificación
// ============================================================
export function clasificarLinea(l: LineaLeida): LineaClasificada {
  const base = {
    ...l,
    factorUnidad: null as string | null,
    factorFuente: null as string | null,
    factorVersion: null as string | null,
    corregido: false,
    confirmado: false,
  }

  const ignorar = (motivo: string): LineaClasificada => ({
    ...base,
    estado: 'ignorado',
    motivoIgnorado: motivo,
    scopeAsignado: null,
    factorAsignado: null,
    factorValor: null,
    mecanismo: null,
    emisionKg: null,
    original: { scopeAsignado: null, factorAsignado: null, emisionKg: null },
  })

  if (l.valor === null || !isFinite(l.valor)) return ignorar('La celda no contiene un valor numérico legible')
  if (l.valor === 0) return ignorar('Consumo declarado en cero — no aporta emisión')
  if (l.valor < 0) return ignorar('Valor negativo: probable nota de crédito o ajuste contable')
  if (l.oculto) return ignorar('Celda en hoja o fila oculta del libro — excluida del cálculo')

  const factor = reconocerFactor(l.campoLeido, l.unidad)
  if (!factor) return ignorar(`Campo "${l.campoLeido}" no corresponde a un consumo con factor de emisión asignable`)

  const meta = factorPorClave(factor)
  const emisionKg = +emisionDeLinea(factor, l.valor).toFixed(3)
  // El factor electrico es el mismo, pero el mecanismo no: un consumo de
  // planta de empaque no es riego. Se distingue por la descripcion, que es
  // el unico dato que lo dice.
  const mecanismo = factor === 'electricidadSEIN' && ES_PACKING.test(l.campoLeido)
    ? ('packing' as Mecanismo)
    : meta.mecanismo

  return {
    ...base,
    estado: 'leido',
    motivoIgnorado: null,
    scopeAsignado: meta.scope,
    factorAsignado: factor,
    factorValor: meta.valor,
    factorUnidad: meta.unidad,
    factorFuente: meta.fuente,
    factorVersion: meta.version,
    mecanismo,
    emisionKg,
    original: { scopeAsignado: meta.scope, factorAsignado: factor, emisionKg },
  }
}

/** Punto de entrada del módulo: filas parseadas → filas clasificadas. */
export function ghgClassify(filas: LineaLeida[]): LineaClasificada[] {
  return filas.map(clasificarLinea)
}

/**
 * Reasigna el factor de una línea conservando lo que la máquina había
 * decidido. No destructivo: `original` nunca se toca (RNF-3.3).
 */
export function reasignarFactor(l: LineaClasificada, factor: ClaveFactor): LineaClasificada {
  const meta = factorPorClave(factor)
  const emisionKg = l.valor === null ? null : +emisionDeLinea(factor, l.valor).toFixed(3)
  return {
    ...l,
    estado: 'leido',
    motivoIgnorado: null,
    scopeAsignado: meta.scope,
    factorAsignado: factor,
    factorValor: meta.valor,
    factorUnidad: meta.unidad,
    factorFuente: meta.fuente,
    factorVersion: meta.version,
    mecanismo: meta.mecanismo,
    emisionKg,
    corregido: factor !== l.original.factorAsignado,
  }
}

/** Deshace una corrección y vuelve al mapeo automático (RNF-3.4). */
export function revertirLinea(l: LineaClasificada): LineaClasificada {
  if (l.original.factorAsignado === null) {
    return { ...l, ...clasificarLinea(l), corregido: false, confirmado: false }
  }
  return { ...reasignarFactor(l, l.original.factorAsignado), corregido: false, confirmado: false }
}

// ============================================================
// 6. Resumen agregado de un archivo
// ============================================================
export type ResumenClasificacion = {
  leidas: number
  ignoradas: number
  emisionKg: number
  emisionTon: number
  scopes: { s1: number; s2: number; s3: number } // tCO₂e
  porMecanismo: Partial<Record<Mecanismo, number>> // kgCO₂e
}

export function resumirLineas(lineas: LineaClasificada[]): ResumenClasificacion {
  let emisionKg = 0
  let leidas = 0
  let ignoradas = 0
  const scopesKg = { s1: 0, s2: 0, s3: 0 }
  const porMecanismo: Partial<Record<Mecanismo, number>> = {}

  for (const l of lineas) {
    if (l.estado === 'ignorado' || l.emisionKg === null) {
      ignoradas++
      continue
    }
    leidas++
    emisionKg += l.emisionKg
    if (l.scopeAsignado === 1) scopesKg.s1 += l.emisionKg
    else if (l.scopeAsignado === 2) scopesKg.s2 += l.emisionKg
    else if (l.scopeAsignado === 3) scopesKg.s3 += l.emisionKg
    if (l.mecanismo) porMecanismo[l.mecanismo] = (porMecanismo[l.mecanismo] ?? 0) + l.emisionKg
  }

  return {
    leidas,
    ignoradas,
    emisionKg: +emisionKg.toFixed(3),
    emisionTon: +(emisionKg / 1000).toFixed(4),
    scopes: {
      s1: +(scopesKg.s1 / 1000).toFixed(4),
      s2: +(scopesKg.s2 / 1000).toFixed(4),
      s3: +(scopesKg.s3 / 1000).toFixed(4),
    },
    porMecanismo,
  }
}
