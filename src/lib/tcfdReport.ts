'use client'

// ============================================================
// AgroFinance — Reporte TCFD (Task Force on Climate-related
// Financial Disclosures)
// ------------------------------------------------------------
// Estructura real del framework: 11 divulgaciones recomendadas bajo
// 4 pilares — Gobernanza (a-b), Estrategia (a-c), Gestion de riesgos
// (a-c) y Metricas y objetivos (a-c). TCFD se disolvio en 2023 y sus
// recomendaciones fueron incorporadas a IFRS S2 (ISSB), pero el
// framework de 4 pilares sigue siendo el formato que piden bancos y
// fondos — es justamente el documento que evalua la elegibilidad para
// un Sustainability Linked Loan.
//
// A diferencia del informe tecnico (que es un calculo), TCFD pide
// narrativa de gobernanza y de riesgo financiero. Donde la plataforma no
// tiene ese dato capturado (comites de gobierno corporativo, escenarios
// climaticos formales), se declara "no reportado" en vez de inventarse
// una respuesta — la Metricas y objetivos (pilar 4) es lo unico que sale
// directo del motor de calculo y es igual de solido que en los otros
// reportes.
// ============================================================

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ReporteTecnico } from './reporteTecnico'
import {
  ascii, num, titulo, subtitulo, parrafo, nota, estiloTabla, finTabla, pieDePagina,
  VERDE_OSCURO, GRIS, MARGEN, ANCHO, UTIL, type Cursor,
} from './pdfTecnico'

export function generarInformeTCFD(r: ReporteTecnico) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const cur: Cursor = { y: 0 }

  // --- Portada ---
  doc.setFillColor(...VERDE_OSCURO)
  doc.rect(0, 0, ANCHO, 52, 'F')
  doc.setTextColor(150, 220, 185)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('DIVULGACIONES FINANCIERAS RELACIONADAS AL CLIMA - TCFD', MARGEN, 18)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(19)
  doc.text(ascii(`Reporte TCFD - ${r.meta.empresa}`), MARGEN, 30, { maxWidth: UTIL })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(190, 214, 200)
  doc.text(ascii(`Campana ${r.meta.campania} - Emitido el ${r.meta.emitido}`), MARGEN, 40)
  doc.text('Estructurado segun las 11 divulgaciones recomendadas por el TCFD (incorporadas a IFRS S2 / ISSB)', MARGEN, 46, { maxWidth: UTIL })

  cur.y = 62
  doc.setTextColor(...GRIS)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  const declaracion = doc.splitTextToSize(
    ascii(
      'Alcance de este documento: el pilar "Metricas y objetivos" se calcula con el mismo motor de datos que el ' +
      'informe tecnico ISO 14067 y el reporte GRI, y por lo tanto es dato verificable. Los pilares de Gobernanza, ' +
      'Estrategia y Gestion de riesgos requieren informacion que hoy no se captura en la plataforma (estructura de ' +
      'comites, escenarios climaticos formales, proceso de identificacion de riesgos): se declaran como ' +
      '"no reportado" en lugar de completarse con texto generico, siguiendo el mismo principio de integridad del ' +
      'dato que rige el resto de la plataforma.',
    ),
    UTIL,
  )
  doc.text(declaracion, MARGEN, cur.y)
  cur.y += declaracion.length * 3.8 + 10

  const pilar = (n: string, t: string) => { titulo(doc, cur, `${n}. ${t}`) }
  const noReportado = (etiqueta: string, motivo: string) =>
    parrafo(doc, cur, etiqueta, `No reportado. ${motivo}`)

  // ------------------------------------------------------------
  // Pilar 1 — Gobernanza (a, b)
  // ------------------------------------------------------------
  pilar('1', 'Gobernanza')
  noReportado(
    '1a. Supervision del directorio sobre riesgos y oportunidades climaticas',
    'La plataforma no captura estructura de gobierno corporativo (comites, frecuencia de revision del directorio).',
  )
  noReportado(
    '1b. Rol de la gerencia en la evaluacion y gestion de riesgos y oportunidades climaticas',
    'No hay un modulo de gobernanza climatica vinculado; esta divulgacion se completa fuera de la plataforma.',
  )

  // ------------------------------------------------------------
  // Pilar 2 — Estrategia (a, b, c)
  // ------------------------------------------------------------
  pilar('2', 'Estrategia')
  parrafo(
    doc, cur, '2a. Riesgos y oportunidades climaticas identificados a corto, mediano y largo plazo',
    'Riesgo regulatorio identificado por el motor de cumplimiento de la plataforma: ' +
      'exigencias de trazabilidad y reduccion de huella de CSRD/EUDR (Union Europea), Tesco Sustainability Network ' +
      '(Reino Unido) e ISO 14064 (verificacion internacional). Oportunidad identificada: acceso a tasa preferencial ' +
      'via Sustainability Linked Loan condicionado a huella verificada.',
  )
  noReportado(
    '2b. Impacto de los riesgos y oportunidades climaticas en el negocio, estrategia y planificacion financiera',
    'Requiere modelamiento financiero de escenarios que la plataforma no automatiza.',
  )
  noReportado(
    '2c. Resiliencia de la estrategia bajo distintos escenarios climaticos (incl. un escenario de 2 grados C o menos)',
    'El analisis de escenarios climaticos formales (ej. NGFS, IEA) no esta implementado en esta version.',
  )

  // ------------------------------------------------------------
  // Pilar 3 — Gestión de riesgos (a, b, c)
  // ------------------------------------------------------------
  doc.addPage()
  cur.y = MARGEN + 6
  pilar('3', 'Gestion de riesgos')
  parrafo(
    doc, cur, '3a. Procesos para identificar y evaluar riesgos climaticos',
    'La plataforma identifica automaticamente el estado de cumplimiento frente a marcos regulatorios activos ' +
      '(ver tabla de progreso de cumplimiento en el Dashboard) a partir de los datos de actividad vinculados.',
  )
  noReportado(
    '3b. Procesos para gestionar riesgos climaticos',
    'El proceso de gestion de riesgo (mas alla de la medicion) se define a nivel de gerencia, fuera del alcance de la plataforma.',
  )
  parrafo(
    doc, cur, '3c. Integracion de la identificacion, evaluacion y gestion de riesgos climaticos en la gestion general de riesgos',
    'Parcial: la huella medida alimenta directamente la evaluacion de elegibilidad para credito verde (Sustainability Linked Loan), lo que integra el riesgo climatico a una decision financiera concreta.',
  )

  // ------------------------------------------------------------
  // Pilar 4 — Métricas y objetivos (a, b, c) — esto sí sale del motor real
  // ------------------------------------------------------------
  doc.addPage()
  cur.y = MARGEN + 6
  pilar('4', 'Metricas y objetivos')
  nota(doc, cur, 'Unico pilar calculado directamente por el motor de datos de la plataforma: mismas cifras que el informe tecnico ISO 14067 y el reporte GRI 305.')

  parrafo(
    doc, cur, '4a. Metricas usadas para evaluar riesgos y oportunidades climaticas',
    `Huella de carbono total (tCO2e), intensidad de emisiones (kgCO2e/kg de producto) y desglose por Alcance 1/2/3, calculados segun GHG Protocol Product Life Cycle Accounting and Reporting Standard.`,
  )

  autoTable(doc, {
    startY: cur.y,
    margin: { left: MARGEN, right: MARGEN },
    head: [['Metrica', 'Valor', 'Unidad']],
    body: [
      ['Emisiones Alcance 1', num(r.resultados.scopes.s1, 2), 'tCO2e'],
      ['Emisiones Alcance 2', num(r.resultados.scopes.s2, 2), 'tCO2e'],
      ['Emisiones Alcance 3', num(r.resultados.scopes.s3, 2), 'tCO2e'],
      ['Huella total', num(r.resultados.huellaTotalTon, 2), 'tCO2e'],
      ['Intensidad de emisiones', num(r.resultados.intensidad, 4), 'kgCO2e/kg de producto'],
      ['Volumen exportado', (r.resultados.kilosExportados / 1000).toLocaleString('es-PE', { maximumFractionDigits: 0 }), 't'],
    ],
    ...estiloTabla(8.5),
  })
  cur.y = finTabla(doc) + 8

  parrafo(
    doc, cur, '4b. Emisiones de Alcance 1, Alcance 2 y, de corresponder, Alcance 3, y los riesgos relacionados',
    'Ver tabla anterior. El riesgo financiero directamente asociado es la elegibilidad y el margen (bps) de la ' +
      'linea de credito Sustainability Linked Loan, que se descuenta en funcion de esta huella verificada.',
  )

  const productosConDelta = r.resultados.productos.filter((p) => p.deltaInteranualPct !== 0)
  parrafo(
    doc, cur, '4c. Objetivos usados para gestionar riesgos y oportunidades climaticas, y desempeno contra el objetivo',
    productosConDelta.length
      ? `Variacion interanual por producto: ${productosConDelta.map((p) => `${ascii(p.producto)} ${p.deltaInteranualPct > 0 ? '+' : ''}${p.deltaInteranualPct}% vs. ${ascii(p.periodoAnterior)}`).join('; ')}.`
      : 'No hay un objetivo cuantitativo de reduccion formalmente registrado en la plataforma para este periodo.',
  )

  if (r.resultados.productos.length) {
    subtitulo(doc, cur, 'Intensidad por producto vs. referencia de mercado')
    autoTable(doc, {
      startY: cur.y,
      margin: { left: MARGEN, right: MARGEN },
      head: [['Producto', 'Intensidad', 'Referencia', 'Resultado']],
      body: r.resultados.productos.map((p) => [
        ascii(p.producto),
        `${num(p.intensidad, 3)} kgCO2e/kg`,
        p.benchmark.valor === null ? 'sin dato de referencia' : `${num(p.benchmark.valor, 2)} kgCO2e/kg (${ascii(p.benchmark.alcance)})`,
        ascii(p.benchmark.desvio),
      ]),
      ...estiloTabla(7.5),
    })
    cur.y = finTabla(doc) + 6
  }

  nota(doc, cur, r.resultados.disclaimerBenchmark)

  pieDePagina(doc, { meta: { empresa: r.meta.empresa, nivelValidez: 'TCFD (4 pilares) - ' + r.meta.nivelValidez } })
  return doc
}
