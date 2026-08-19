/**
 * Motor de pre-evaluación crediticia para pymes agroexportadoras.
 *
 * IMPORTANTE: esto es una ORIENTACIÓN, no una aprobación. Ninguna entidad
 * queda obligada por este resultado; la decisión final siempre pasa por la
 * evaluación formal del banco.
 *
 * Reglas construidas sobre requisitos públicos:
 *  - Fondo AgroPerú (Agrobanco): máx. 5 ha agrícolas, sin deuda vencida con
 *    el fondo, máx. 3 acreencias en central de riesgos, pertenecer a una
 *    organización. Línea pecuaria: ingreso neto anual < 12 UIT.
 *  - AgroMujer (Agrobanco): titular mujer mayor de 20 años, ventas brutas
 *    anuales ≤ 100 UIT, hasta 10 ha conducidas.
 *  - Clasificación SBS (Res. 11356-2008): Normal / CPP (9-30 días de atraso) /
 *    Deficiente (31-60) / Dudoso (61-120) / Pérdida (+120). Rige el criterio
 *    del peor calificador.
 *  - Sustainability Linked Loans (LMA): los KPI deben ser materiales,
 *    medibles y verificables, con histórico de reporte.
 */

export const UIT_2026 = 5350 // S/ — actualizar cada año con el valor oficial

export type ClasificacionSBS = 'normal' | 'cpp' | 'deficiente' | 'dudoso' | 'perdida'
export type Destino = 'campania' | 'equipamiento' | 'infraestructura' | 'capital_trabajo'

export type PerfilCredito = {
  // Empresa
  esPersonaJuridica: boolean
  aniosOperando: number
  ventasAnualesSoles: number
  hectareas: number
  titularMujer: boolean
  edadTitular: number

  // Historial (lo que más pesa)
  clasificacionSBS: ClasificacionSBS
  numeroAcreencias: number
  deudaVencidaAgroperu: boolean

  // Garantías y asociatividad
  tieneTituloPropiedad: boolean
  perteneceOrganizacion: boolean
  valorGarantiasSoles: number

  // Exportación y sostenibilidad
  exportaUEoUK: boolean
  huellaCalculada: boolean
  huellaVerificada: boolean
  trazabilidadGPS: boolean
  certificaciones: boolean
  aniosReportandoESG: number

  // Necesidad
  montoSolicitadoSoles: number
  destino: Destino
  plazoMeses: number
}

export type Veredicto = 'califica' | 'condicionado' | 'no_califica'

export type Resultado = {
  id: string
  producto: string
  entidad: string
  veredicto: Veredicto
  tasaDesde: number
  tasaHasta: number
  montoEstimadoSoles: number
  motivos: string[]      // por qué sí
  bloqueos: string[]     // qué lo frena
  siguientePaso: string
}

const UIT = (soles: number) => soles / UIT_2026

const ORDEN_SBS: Record<ClasificacionSBS, number> = {
  normal: 0, cpp: 1, deficiente: 2, dudoso: 3, perdida: 4,
}

export const ETIQUETA_SBS: Record<ClasificacionSBS, string> = {
  normal: 'Normal — al día',
  cpp: 'CPP — atraso de 9 a 30 días',
  deficiente: 'Deficiente — atraso de 31 a 60 días',
  dudoso: 'Dudoso — atraso de 61 a 120 días',
  perdida: 'Pérdida — atraso mayor a 120 días',
}

/** Un deudor en Dudoso o Pérdida queda fuera de la banca formal. */
const historialInviable = (p: PerfilCredito) => ORDEN_SBS[p.clasificacionSBS] >= 3

/** Cobertura de garantías sobre el monto pedido. */
const cobertura = (p: PerfilCredito) =>
  p.montoSolicitadoSoles > 0 ? p.valorGarantiasSoles / p.montoSolicitadoSoles : 0

// ─────────────────────────────────────────────────────────────
// Productos
// ─────────────────────────────────────────────────────────────

function fondoAgroperu(p: PerfilCredito): Resultado {
  const motivos: string[] = []
  const bloqueos: string[] = []

  if (p.hectareas <= 5) motivos.push(`Conduces ${p.hectareas} ha, dentro del tope de 5 ha del fondo`)
  else bloqueos.push(`El fondo es para predios de hasta 5 ha y declaras ${p.hectareas} ha`)

  if (p.deudaVencidaAgroperu) bloqueos.push('Tienes deuda vencida con el Fondo AgroPerú, que es causal directa de rechazo')
  else motivos.push('Sin deuda vencida con el Fondo AgroPerú')

  if (p.numeroAcreencias <= 3) motivos.push(`${p.numeroAcreencias} acreencias en central de riesgos, dentro del máximo de 3`)
  else bloqueos.push(`Se admiten hasta 3 acreencias en central de riesgos y registras ${p.numeroAcreencias}`)

  if (p.perteneceOrganizacion) motivos.push('Perteneces a una organización, requisito para el financiamiento directo')
  else bloqueos.push('El financiamiento se canaliza vía organizaciones de productores y no declaras pertenecer a una')

  if (ORDEN_SBS[p.clasificacionSBS] <= 1) motivos.push(`Clasificación SBS ${ETIQUETA_SBS[p.clasificacionSBS]}`)
  else bloqueos.push(`Tu clasificación SBS (${ETIQUETA_SBS[p.clasificacionSBS]}) exige regularizar antes de postular`)

  if (!p.tieneTituloPropiedad) bloqueos.push('Falta título de propiedad o constancia de posesión del predio')

  const veredicto: Veredicto = bloqueos.length === 0 ? 'califica' : bloqueos.length <= 1 ? 'condicionado' : 'no_califica'

  return {
    id: 'agroperu',
    producto: 'Crédito Agrícola — Fondo AgroPerú',
    entidad: 'Agrobanco',
    veredicto,
    tasaDesde: 3.5,
    tasaHasta: 9,
    montoEstimadoSoles: Math.min(p.montoSolicitadoSoles, 50 * UIT_2026),
    motivos,
    bloqueos,
    siguientePaso: 'Pide a tu organización que te incluya en el padrón nominal que se presenta a Agrobanco, y arma el expediente: DNI, título o constancia de posesión, constancia de estar organizado y la solicitud firmada.',
  }
}

function agroMujer(p: PerfilCredito): Resultado {
  const motivos: string[] = []
  const bloqueos: string[] = []
  const ventasUIT = UIT(p.ventasAnualesSoles)

  if (p.titularMujer) motivos.push('Producto dirigido a productoras agropecuarias')
  else bloqueos.push('AgroMujer está dirigido a titulares mujeres')

  if (p.edadTitular > 20) motivos.push(`Edad de la titular (${p.edadTitular}) sobre el mínimo de 20 años`)
  else bloqueos.push('La titular debe ser mayor de 20 años')

  if (ventasUIT <= 100) motivos.push(`Ventas de ${ventasUIT.toFixed(1)} UIT, dentro del tope de 100 UIT`)
  else bloqueos.push(`El tope es 100 UIT de ventas brutas y registras ${ventasUIT.toFixed(1)} UIT`)

  if (p.hectareas <= 10) motivos.push(`${p.hectareas} ha en explotación, dentro del límite de 10 ha`)
  else bloqueos.push(`El producto cubre hasta 10 ha y conduces ${p.hectareas} ha`)

  if (historialInviable(p)) bloqueos.push(`Clasificación ${ETIQUETA_SBS[p.clasificacionSBS]}: primero hay que regularizar`)

  const veredicto: Veredicto = bloqueos.length === 0 ? 'califica' : bloqueos.length <= 1 ? 'condicionado' : 'no_califica'

  return {
    id: 'agromujer',
    producto: 'Crédito AgroMujer',
    entidad: 'Agrobanco',
    veredicto,
    tasaDesde: 4,
    tasaHasta: 10,
    montoEstimadoSoles: Math.min(p.montoSolicitadoSoles, 50 * UIT_2026),
    motivos,
    bloqueos,
    siguientePaso: 'Acércate a una oficina de Agrobanco con DNI, documento del predio y sustento de ventas de la última campaña.',
  }
}

function creditoPymeComercial(p: PerfilCredito): Resultado {
  const motivos: string[] = []
  const bloqueos: string[] = []
  const cob = cobertura(p)

  if (ORDEN_SBS[p.clasificacionSBS] === 0) motivos.push('Clasificación Normal: es el perfil que la banca privada evalúa sin restricciones')
  else if (ORDEN_SBS[p.clasificacionSBS] === 1) motivos.push('Clasificación CPP: evaluable, aunque con tasa más alta')
  else if (ORDEN_SBS[p.clasificacionSBS] === 2) bloqueos.push('En Deficiente la banca privada exige garantía real que cubra holgadamente el crédito')
  else bloqueos.push(`Clasificación ${ETIQUETA_SBS[p.clasificacionSBS]}: la banca formal no coloca en esta categoría`)

  if (p.aniosOperando >= 2) motivos.push(`${p.aniosOperando} años de operación acreditada`)
  else bloqueos.push('La mayoría de bancos pide al menos 2 años de actividad para una línea comercial')

  if (cob >= 1.4) motivos.push(`Garantías por ${cob.toFixed(1)}x el monto solicitado`)
  else if (cob >= 1) motivos.push(`Garantías por ${cob.toFixed(1)}x el monto: ajustado pero evaluable`)
  else bloqueos.push(`Las garantías cubren ${cob.toFixed(1)}x el monto; se suele pedir 1.4x o más`)

  if (p.esPersonaJuridica) motivos.push('Persona jurídica: facilita la evaluación con estados financieros')

  const veredicto: Veredicto = bloqueos.length === 0 ? 'califica' : bloqueos.length <= 1 ? 'condicionado' : 'no_califica'
  const recargo = ORDEN_SBS[p.clasificacionSBS] * 4

  return {
    id: 'pyme',
    producto: 'Crédito comercial pyme / capital de trabajo',
    entidad: 'Banca privada (BCP, BBVA, cajas)',
    veredicto,
    tasaDesde: 12 + recargo,
    tasaHasta: 22 + recargo,
    montoEstimadoSoles: Math.round(Math.min(p.montoSolicitadoSoles, p.valorGarantiasSoles / 1.4)),
    motivos,
    bloqueos,
    siguientePaso: 'Prepara estados financieros de los 2 últimos ejercicios, declaración anual de renta y el detalle de tus contratos de exportación.',
  }
}

function creditoVerde(p: PerfilCredito): Resultado {
  const motivos: string[] = []
  const bloqueos: string[] = []

  if (p.destino === 'equipamiento' || p.destino === 'infraestructura')
    motivos.push('El destino calza con inversión elegible para líneas verdes (eficiencia, riego, energía)')
  else bloqueos.push('Las líneas verdes financian inversión con impacto ambiental medible, no capital de trabajo puro')

  if (p.huellaCalculada) motivos.push('Ya tienes tu huella de carbono calculada, que es la línea base que piden')
  else bloqueos.push('Necesitas una línea base de huella de carbono para sustentar el impacto')

  if (p.certificaciones) motivos.push('Cuentas con certificaciones que respaldan la gestión ambiental')

  if (ORDEN_SBS[p.clasificacionSBS] <= 1) motivos.push('Historial crediticio dentro de lo aceptable')
  else bloqueos.push(`Clasificación ${ETIQUETA_SBS[p.clasificacionSBS]}: bloquea el acceso a la línea`)

  const veredicto: Veredicto = bloqueos.length === 0 ? 'califica' : bloqueos.length <= 1 ? 'condicionado' : 'no_califica'

  return {
    id: 'verde',
    producto: 'Línea de crédito verde / inversión sostenible',
    entidad: 'COFIDE y banca intermediaria',
    veredicto,
    tasaDesde: 8,
    tasaHasta: 14,
    montoEstimadoSoles: p.montoSolicitadoSoles,
    motivos,
    bloqueos,
    siguientePaso: 'Documenta la inversión y el ahorro de emisiones esperado; con eso el banco intermediario tramita la línea ante COFIDE.',
  }
}

function sll(p: PerfilCredito): Resultado {
  const motivos: string[] = []
  const bloqueos: string[] = []
  const ventasUIT = UIT(p.ventasAnualesSoles)

  if (p.exportaUEoUK) motivos.push('Exportas a UE/UK, donde el comprador exige evidencia ambiental')
  else bloqueos.push('El SLL se estructura sobre todo con exportadores a mercados que exigen desempeño ambiental')

  if (ventasUIT >= 300) motivos.push(`Escala de ${ventasUIT.toFixed(0)} UIT en ventas, suficiente para justificar la estructuración`)
  else bloqueos.push(`Con ${ventasUIT.toFixed(0)} UIT de ventas el costo de estructurar un SLL no se justifica (se suele ver desde ~300 UIT)`)

  if (p.huellaVerificada) motivos.push('Huella verificada por tercero: es el KPI auditable que exige el estándar')
  else bloqueos.push('El KPI debe ser verificable por un tercero independiente, no autodeclarado')

  if (p.aniosReportandoESG >= 3) motivos.push(`${p.aniosReportandoESG} años reportando ESG, que da la línea base histórica que pide el estándar`)
  else bloqueos.push(`El estándar espera ~3 años de histórico de reporte y llevas ${p.aniosReportandoESG}`)

  if (p.trazabilidadGPS) motivos.push('Trazabilidad GPS de parcelas: sustenta el cumplimiento EUDR')

  const veredicto: Veredicto = bloqueos.length === 0 ? 'califica' : bloqueos.length <= 2 ? 'condicionado' : 'no_califica'

  return {
    id: 'sll',
    producto: 'Sustainability Linked Loan (SLL)',
    entidad: 'BBVA, BCP y banca corporativa',
    veredicto,
    // El SLL no es una tasa aparte: es la tasa comercial con descuento por meta.
    tasaDesde: 10,
    tasaHasta: 18,
    montoEstimadoSoles: p.montoSolicitadoSoles,
    motivos,
    bloqueos,
    siguientePaso: 'Define 1 o 2 KPI (por ejemplo kgCO₂e por kg exportado) con metas anuales y consigue verificación externa. Ese documento es la base para negociar el descuento en tasa.',
  }
}

// ─────────────────────────────────────────────────────────────

const PRIORIDAD: Record<Veredicto, number> = { califica: 0, condicionado: 1, no_califica: 2 }

export function evaluarCredito(p: PerfilCredito): {
  resultados: Resultado[]
  alertaHistorial: string | null
  recomendado: Resultado | null
} {
  const resultados = [fondoAgroperu(p), agroMujer(p), creditoPymeComercial(p), creditoVerde(p), sll(p)]
    .sort((a, b) => PRIORIDAD[a.veredicto] - PRIORIDAD[b.veredicto] || a.tasaDesde - b.tasaDesde)

  const alertaHistorial = historialInviable(p)
    ? `Tu clasificación en la SBS es ${ETIQUETA_SBS[p.clasificacionSBS]}. Mientras siga así ninguna entidad formal va a colocarte un crédito, sin importar cuántas hectáreas o garantías tengas. El primer paso es regularizar la deuda atrasada y esperar a que la central de riesgos actualice tu categoría.`
    : null

  const recomendado = resultados.find(r => r.veredicto === 'califica') ?? null

  return { resultados, alertaHistorial, recomendado }
}
