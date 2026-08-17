// ============================================================
// AgroFinance — Motor de clasificación de huella de carbono
// ------------------------------------------------------------
// Implementa un motor de reglas (rules-based) basado en la
// metodología de certificación GHG (Bureau Veritas / Verra,
// ISO 14064-3, GHG Protocol). La data cruda se simula de forma
// aleatoria en cada corrida (demo), pero el NIVEL se DERIVA de
// umbrales reales mediante una cadena de evidencia auditable:
//
//   Datos crudos → Métricas → Criterios (umbrales) → Evaluación → Nivel
//
// Escala (Guía Técnica §7.4 — Bureau Veritas / Verra):
//   Nivel A · Verificado Oro   — Materialidad <1%, Aseguramiento razonable
//   Nivel B · Verificado Plata — Materialidad <5%, Aseguramiento limitado
//   Nivel C · Auditado         — Revisión documental, medición completa
//   Nivel D · No verificado    — No cumple criterios mínimos
// ============================================================

export type Verificacion = 'razonable' | 'limitada' | 'ninguna'

// ---- Entrada: métricas de la empresa ----
// `null` significa "la plataforma no puede saberlo", y NO se sustituye por
// un valor plausible: un criterio sin dato no se puede dar por cumplido.
export type Metricas = {
  intensidad: number // kgCO2e/kg exportado (menor = mejor)
  benchmark: number // intensidad de referencia del sector
  /** % de reducción vs. campaña anterior. null sin línea base comparable. */
  reduccionYoY: number | null
  /** % de error/omisión del inventario. null: exige análisis de incertidumbre. */
  materialidad: number | null
  /** % de fuentes vinculadas y legibles. Se calcula del estado real. */
  cobertura: number
  verificacion: Verificacion // nivel de aseguramiento por ente acreditado
  scopes: { s1: number; s2: number; s3: number } // tCO2e
}

// ---- Un criterio evaluado (fila de la tabla de justificación) ----
export type Criterio = {
  nombre: string
  requerido: string
  obtenido: string
  cumple: boolean
  marginal?: boolean
}

export type Nivel = 'A' | 'B' | 'C' | 'D'

export type Certificacion = {
  nivel: Nivel
  etiqueta: string
  estrellas: number
  color: string
  estado: string
  indiceConformidad: number // 0-100, % de criterios duros cumplidos
  metricas: Metricas
  total: number // tCO2e
  criterios: Criterio[] // evaluación del nivel asignado (cadena de evidencia)
  brechaSiguiente: Criterio[] // qué falta para el siguiente nivel
  resumenKapi: string
  recomendaciones: string[]
  desbloquea: { label: string; activo: boolean }[]
  siguienteNivel: string
  cronograma: { dia: string; hito: string }[]
}

// ============================================================
// 1. Sin simulación
// ------------------------------------------------------------
// Aquí vivía un generador aleatorio (Math.random) que inventaba
// materialidad, cobertura, reducción interanual y —lo más grave— el nivel
// de ASEGURAMIENTO EXTERNO. Con eso la plataforma podía declarar
// "Aseguramiento razonable", que en ISO 14064-3 significa que un ente
// acreditado auditó el inventario, sin que existiera ninguna auditoría.
//
// Además contradecía al propio módulo de reportes, que declara el informe
// como "Autodeclarado — nivel inventario". La misma app afirmaba dos cosas
// opuestas sobre si un tercero había verificado los datos.
//
// Ahora las métricas se calculan (`metricasDe` en pilotEngine) o se
// declaran null. Nada se rellena.
// ============================================================

// ============================================================
// 2. Definición de criterios por nivel (umbrales reales)
// ============================================================
const fmtPct = (n: number | null) => (n === null ? 'sin dato' : `${n.toFixed(1)}%`)
const verifLabel: Record<Verificacion, string> = {
  razonable: 'Aseguramiento razonable',
  limitada: 'Aseguramiento limitado',
  ninguna: 'Sin verificación',
}

function criteriosNivelA(m: Metricas): Criterio[] {
  return [
    { nombre: 'Materialidad del inventario', requerido: '< 1%', obtenido: fmtPct(m.materialidad), cumple: m.materialidad !== null && m.materialidad < 1 },
    { nombre: 'Aseguramiento externo', requerido: 'Razonable', obtenido: verifLabel[m.verificacion], cumple: m.verificacion === 'razonable' },
    { nombre: 'Reducción interanual', requerido: '≥ 5%', obtenido: fmtPct(m.reduccionYoY), cumple: m.reduccionYoY !== null && m.reduccionYoY >= 5 },
    { nombre: 'Intensidad vs. benchmark', requerido: `≤ ${m.benchmark}`, obtenido: `${m.intensidad} kgCO₂e/kg`, cumple: m.intensidad <= m.benchmark },
    { nombre: 'Cobertura de datos', requerido: '≥ 95%', obtenido: `${m.cobertura}%`, cumple: m.cobertura >= 95 },
  ]
}

function criteriosNivelB(m: Metricas): Criterio[] {
  return [
    { nombre: 'Materialidad del inventario', requerido: '< 5%', obtenido: fmtPct(m.materialidad), cumple: m.materialidad !== null && m.materialidad < 5 },
    { nombre: 'Aseguramiento externo', requerido: 'Limitado o superior', obtenido: verifLabel[m.verificacion], cumple: m.verificacion !== 'ninguna' },
    { nombre: 'Cobertura de datos', requerido: '≥ 80%', obtenido: `${m.cobertura}%`, cumple: m.cobertura >= 80 },
    { nombre: 'Intensidad vs. benchmark', requerido: `≤ ${(m.benchmark * 1.1).toFixed(2)}`, obtenido: `${m.intensidad} kgCO₂e/kg`, cumple: m.intensidad <= m.benchmark * 1.1 },
  ]
}

// La 2ª estrella del programa nacional se llama "Verificación" y eso es
// literal: exige auditoría de un ente acreditado. Antes este nivel se
// alcanzaba solo con cobertura de datos, y su texto igual afirmaba que la
// huella estaba "verificada por un ente acreditado" — una declaración
// falsa que un auditor detecta de inmediato. El criterio de aseguramiento
// tiene que estar aquí para que el nivel signifique lo que dice.
function criteriosNivelC(m: Metricas): Criterio[] {
  return [
    { nombre: 'Cobertura de datos (medición)', requerido: '≥ 60%', obtenido: `${m.cobertura}%`, cumple: m.cobertura >= 60 },
    { nombre: 'Inventario GHG Protocol', requerido: 'Scope 1+2+3 calculado', obtenido: 'Scope 1+2+3 calculado', cumple: true },
    { nombre: 'Aseguramiento externo', requerido: 'Limitado o superior', obtenido: verifLabel[m.verificacion], cumple: m.verificacion !== 'ninguna' },
  ]
}

const cumpleTodos = (cs: Criterio[]) => cs.every((c) => c.cumple)

// ============================================================
// 3. Árbol de decisión (Guía §9.3): asigna el nivel más alto
//    cuyos criterios se cumplen en su totalidad.
// ============================================================
const perfiles: Record<Nivel, Omit<Certificacion,
  'metricas' | 'total' | 'criterios' | 'brechaSiguiente' | 'indiceConformidad'>> = {
  A: {
    nivel: 'A', etiqueta: '4★ Carbono Neutral', estrellas: 4, color: '#137C53',
    estado: 'Mide · Verifica · Reduce · Compensa',
    resumenKapi:
      'Tu huella de producto (ISO 14067) está **verificada y reduciéndose**, y compensas el remanente con **bonos de carbono**. Alcanzas la **4ª estrella del MINAM (Neutralización)**: puedes poner el sello **Carbono Neutral** en tus cajas y negociar un **precio premium por kilo** con los supermercados europeos (Tesco, Albert Heijn, Lidl).',
    recomendaciones: [
      'Mantén tu portafolio de bonos de carbono de la Amazonía peruana para conservar la neutralidad cada campaña.',
      'Usa el sello Carbono Neutral en tu ficha técnica para negociar margen premium con tu comprador europeo.',
      'Renueva tu verificación ISO 14067 con la certificadora aliada (SGS / Bureau Veritas) antes del cierre de campaña.',
    ],
    desbloquea: [
      { label: 'Sello Carbono Neutral (precio premium)', activo: true },
      { label: 'Supermercados UE · Net-Zero', activo: true },
      { label: 'Banca verde · BBVA SLL', activo: true },
    ],
    siguienteNivel: 'Mantener las 4★: conservar reducción y compensar el remanente cada campaña.',
    cronograma: [
      { dia: 'Día 1–3', hito: 'Confirmar compra de bonos de carbono (Amazonía) por el remanente de la campaña' },
      { dia: 'Día 7', hito: 'Renovar verificación ISO 14067 con la certificadora aliada' },
      { dia: 'Día 15', hito: 'Emitir ficha técnica con sello Carbono Neutral para el comprador europeo' },
    ],
  },
  B: {
    nivel: 'B', etiqueta: '3★ Reducción', estrellas: 3, color: '#3D7FB0',
    estado: 'Mide · Verifica · Reduce',
    resumenKapi:
      'Tu huella está **verificada** y demuestras **reducción interanual** de tu intensidad (kgCO₂e/kg). Alcanzas la **3ª estrella del MINAM (Reducción)**. Para la **4ª estrella (Carbono Neutral)** te falta compensar el remanente con bonos de carbono — ahí desbloqueas el sello premium.',
    recomendaciones: [
      'Tu mayor hotspot es el **flete marítimo refrigerado (reefer)** Callao/Paita→Rotterdam: consolida contenedores al 100% de capacidad para bajar el kgCO₂e/kg.',
      'Reduce el **N₂O de fertilizantes nitrogenados** ajustando la dosis de urea/nitrato por hectárea (fuente crítica de Scope 1).',
      'Cotiza un portafolio de **bonos de carbono de la Amazonía peruana** para neutralizar el remanente y subir a 4★.',
    ],
    desbloquea: [
      { label: 'Supermercados UE (huella declarada)', activo: true },
      { label: 'Banca verde · BBVA SLL', activo: true },
      { label: 'Sello Carbono Neutral', activo: false },
    ],
    siguienteNivel: 'Compensar el remanente con bonos de carbono para alcanzar la 4ª estrella (Carbono Neutral).',
    cronograma: [
      { dia: 'Día 1–5', hito: 'Calcular el remanente a compensar tras la reducción de la campaña' },
      { dia: 'Día 12', hito: 'Seleccionar proyecto de bonos de carbono (Amazonía) certificado' },
      { dia: 'Día 25', hito: 'Compensar y solicitar la 4ª estrella (Neutralización) al MINAM' },
    ],
  },
  C: {
    nivel: 'C', etiqueta: '2★ Verificación', estrellas: 2, color: '#D2A24A',
    estado: 'Mide · Verifica',
    resumenKapi:
      'Tu huella de producto (ISO 14067) está **medida y verificada cuantitativamente** por un ente acreditado. Alcanzas la **2ª estrella del MINAM (Verificación)** — con esto los supermercados europeos aceptan tu declaración de huella. Para la **3ª estrella (Reducción)** debes demostrar que bajaste tu intensidad vs. la campaña anterior.',
    recomendaciones: [
      'Define tu línea base de intensidad (kgCO₂e/kg) para poder demostrar reducción la próxima campaña.',
      'Ataca tus dos hotspots: **reefer marítimo** (llena el contenedor) y **energía del packing** (LED + regular el túnel de prefrío).',
      'Cambia luminarias del packing a LED y optimiza la ruta terrestre al puerto para evidenciar la 3★.',
    ],
    desbloquea: [
      { label: 'Supermercados UE (huella declarada)', activo: true },
      { label: 'Certificación MINAM 2★', activo: true },
      { label: 'Banca verde · BBVA SLL', activo: false },
    ],
    siguienteNivel: 'Demostrar reducción de tu intensidad vs. la campaña anterior para alcanzar la 3ª estrella.',
    cronograma: [
      { dia: 'Día 1–7', hito: 'Registrar línea base de intensidad de la campaña actual' },
      { dia: 'Día 15', hito: 'Implementar 2 acciones de reducción (reefer + LED packing)' },
      { dia: 'Día 30', hito: 'Re-calcular huella y postular la 3ª estrella (Reducción) al MINAM' },
    ],
  },
  D: {
    nivel: 'D', etiqueta: '1★ Medición', estrellas: 1, color: '#D2A24A',
    estado: 'Mide',
    resumenKapi:
      'AgroFinance calculó tu **huella de carbono de producto (ISO 14067)** en intensidad kgCO₂e/kg — ese es el paso más difícil para una mype, y ya lo tienes. Alcanzas la **1ª estrella del MINAM (Medición)** y puedes declarar tu huella al supermercado europeo. Para la **2ª estrella (Verificación)** necesitas la auditoría de un ente acreditado y completar tus fuentes de datos.',
    recomendaciones: [
      'Centraliza tus datos por área (campo, packing, envíos) — súbelos todos para reducir la incertidumbre del cálculo.',
      'Reserva tu auditoría de verificación con la certificadora aliada (SGS / Bureau Veritas) para la 2ª estrella.',
      'Tu mayor hotspot suele ser el **flete marítimo refrigerado**: empieza por consolidar contenedores al 100%.',
    ],
    desbloquea: [
      { label: 'Huella ISO 14067 declarada', activo: true },
      { label: 'Certificación MINAM 1★', activo: true },
      { label: 'Verificación acreditada 2★', activo: false },
    ],
    siguienteNivel: 'Completar tus fuentes de datos y verificar con un ente acreditado para alcanzar la 2ª estrella.',
    cronograma: [
      { dia: 'Día 1–3', hito: 'Reunir y subir archivos de campo, packing y envíos' },
      { dia: 'Día 7', hito: 'Generar la ficha técnica de huella (ISO 14067) para el comprador' },
      { dia: 'Día 14', hito: 'Agendar auditoría de verificación con la certificadora aliada' },
    ],
  },
}

export function evaluar(m: Metricas): Certificacion {
  const cA = criteriosNivelA(m)
  const cB = criteriosNivelB(m)
  const cC = criteriosNivelC(m)

  let nivel: Nivel
  let criterios: Criterio[]
  let brechaSiguiente: Criterio[]

  if (cumpleTodos(cA)) {
    nivel = 'A'; criterios = cA; brechaSiguiente = []
  } else if (cumpleTodos(cB)) {
    nivel = 'B'; criterios = cB; brechaSiguiente = cA.filter((c) => !c.cumple)
  } else if (cumpleTodos(cC)) {
    nivel = 'C'; criterios = cC; brechaSiguiente = cB.filter((c) => !c.cumple)
  } else {
    nivel = 'D'; criterios = cC; brechaSiguiente = cC.filter((c) => !c.cumple)
  }

  // Índice de conformidad = % de criterios duros cumplidos en el nivel asignado
  const cumplidos = criterios.filter((c) => c.cumple).length
  const indiceConformidad = Math.round((cumplidos / criterios.length) * 100)

  const total = m.scopes.s1 + m.scopes.s2 + m.scopes.s3

  return {
    ...perfiles[nivel],
    metricas: m,
    total,
    criterios,
    brechaSiguiente,
    indiceConformidad,
  }
}
