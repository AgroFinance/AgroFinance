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

// ---- Entrada: métricas crudas de la empresa (simuladas) ----
export type Metricas = {
  intensidad: number // kgCO2e/kg exportado (menor = mejor)
  benchmark: number // intensidad de referencia del sector
  reduccionYoY: number // % de reducción vs. campaña anterior (mayor = mejor)
  materialidad: number // % de error/omisión del inventario (menor = mejor)
  cobertura: number // % de fuentes de datos completas y trazables
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
// 1. Simulación de data cruda (aleatoria, rangos realistas)
// ============================================================
const rnd = (min: number, max: number) => min + Math.random() * (max - min)
const noise = (s: number) => (Math.random() - 0.5) * 2 * s

// Genera un perfil de data COHERENTE a partir de un "seed" de madurez q∈[0,1]:
// una empresa con datos maduros tiende a ser buena en todos los indicadores.
// Esto produce una distribución equilibrada de niveles A/B/C/D al pasar por
// el motor de reglas, sin tocar los umbrales (que se mantienen reales).
export function generarMetricas(): Metricas {
  const q = Math.random()

  const intensidad = +(0.52 * (1.22 - 0.52 * q) + noise(0.03)).toFixed(2)
  const reduccionYoY = +(-1 + 13 * q + noise(1.5)).toFixed(1)
  const materialidad = +Math.max(0.3, 5.6 - 6.2 * q + noise(0.6)).toFixed(1)
  const cobertura = Math.round(Math.min(100, Math.max(50, 52 + 50 * q + noise(4))))
  const verificacion: Verificacion =
    q > 0.7 + noise(0.05) ? 'razonable' : q > 0.4 + noise(0.05) ? 'limitada' : 'ninguna'

  // El total y los scopes varían; Scope 3 domina (~55%) en agroexportación
  const total = Math.round(rnd(13000, 23000))
  const s3 = Math.round(total * rnd(0.5, 0.6))
  const s1 = Math.round((total - s3) * rnd(0.58, 0.68))
  const s2 = total - s3 - s1

  return {
    benchmark: 0.52,
    intensidad,
    reduccionYoY,
    materialidad,
    cobertura,
    verificacion,
    scopes: { s1, s2, s3 },
  }
}

// ============================================================
// 2. Definición de criterios por nivel (umbrales reales)
// ============================================================
const fmtPct = (n: number) => `${n.toFixed(1)}%`
const verifLabel: Record<Verificacion, string> = {
  razonable: 'Aseguramiento razonable',
  limitada: 'Aseguramiento limitado',
  ninguna: 'Sin verificación',
}

function criteriosNivelA(m: Metricas): Criterio[] {
  return [
    { nombre: 'Materialidad del inventario', requerido: '< 1%', obtenido: fmtPct(m.materialidad), cumple: m.materialidad < 1 },
    { nombre: 'Aseguramiento externo', requerido: 'Razonable', obtenido: verifLabel[m.verificacion], cumple: m.verificacion === 'razonable' },
    { nombre: 'Reducción interanual', requerido: '≥ 5%', obtenido: fmtPct(m.reduccionYoY), cumple: m.reduccionYoY >= 5 },
    { nombre: 'Intensidad vs. benchmark', requerido: `≤ ${m.benchmark}`, obtenido: `${m.intensidad} kgCO₂e/kg`, cumple: m.intensidad <= m.benchmark },
    { nombre: 'Cobertura de datos', requerido: '≥ 95%', obtenido: `${m.cobertura}%`, cumple: m.cobertura >= 95 },
  ]
}

function criteriosNivelB(m: Metricas): Criterio[] {
  return [
    { nombre: 'Materialidad del inventario', requerido: '< 5%', obtenido: fmtPct(m.materialidad), cumple: m.materialidad < 5 },
    { nombre: 'Aseguramiento externo', requerido: 'Limitado o superior', obtenido: verifLabel[m.verificacion], cumple: m.verificacion !== 'ninguna' },
    { nombre: 'Cobertura de datos', requerido: '≥ 80%', obtenido: `${m.cobertura}%`, cumple: m.cobertura >= 80 },
    { nombre: 'Intensidad vs. benchmark', requerido: `≤ ${(m.benchmark * 1.1).toFixed(2)}`, obtenido: `${m.intensidad} kgCO₂e/kg`, cumple: m.intensidad <= m.benchmark * 1.1 },
  ]
}

function criteriosNivelC(m: Metricas): Criterio[] {
  return [
    { nombre: 'Cobertura de datos (medición)', requerido: '≥ 60%', obtenido: `${m.cobertura}%`, cumple: m.cobertura >= 60 },
    { nombre: 'Inventario GHG Protocol', requerido: 'Scope 1+2+3 calculado', obtenido: 'Scope 1+2+3 calculado', cumple: true },
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

// Atajo: genera data aleatoria y la clasifica con el motor de reglas
export function clasificar(): Certificacion {
  return evaluar(generarMetricas())
}
