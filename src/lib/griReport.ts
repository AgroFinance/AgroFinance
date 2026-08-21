'use client'

// ============================================================
// AgroFinance — Reporte GRI (GRI 2: General Disclosures 2021 +
// GRI 305: Emissions 2016)
// ------------------------------------------------------------
// No es el mismo documento que el informe técnico ISO 14067: un reporte
// GRI se organiza por CÓDIGO DE DIVULGACIÓN (2-1, 305-1, 305-4...), no por
// objetivo/alcance/resultados. Un revisor GRI busca el número de
// divulgación, no una narrativa libre — por eso cada sección lleva su
// código GRI real y solo declara los datos que la organización reporta
// realmente (sin dato = "no reportado", nunca un cero de relleno).
//
// Fuente de los códigos: GRI 305: Emissions 2016 (Disclosures 305-1 a
// 305-7) y GRI 2: General Disclosures 2021 (perfil de la organización).
// Se usa el mismo modelo serializable (ReporteTecnico) que alimenta el
// informe técnico y el resto de exports, para que los tres documentos
// nunca se contradigan entre sí.
// ============================================================

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ReporteTecnico } from './reporteTecnico'
import {
  ascii, num, titulo, subtitulo, parrafo, nota, estiloTabla, finTabla, pieDePagina,
  VERDE_OSCURO, VERDE, GRIS, CREMA, MARGEN, ANCHO, UTIL, ALTO, type Cursor,
} from './pdfTecnico'

export function generarInformeGRI(r: ReporteTecnico) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const cur: Cursor = { y: 0 }

  // --- Portada ---
  doc.setFillColor(...VERDE_OSCURO)
  doc.rect(0, 0, ANCHO, 52, 'F')
  doc.setTextColor(150, 220, 185)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('REPORTE DE SOSTENIBILIDAD - GRI STANDARDS', MARGEN, 18)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(19)
  doc.text(ascii(`Divulgaciones GRI 2 y GRI 305 - ${r.meta.empresa}`), MARGEN, 30, { maxWidth: UTIL })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(190, 214, 200)
  doc.text(ascii(`Campana ${r.meta.campania} - Emitido el ${r.meta.emitido}`), MARGEN, 40)
  doc.text('Preparado con referencia a: GRI 2: General Disclosures 2021 y GRI 305: Emissions 2016', MARGEN, 46, { maxWidth: UTIL })

  cur.y = 62
  doc.setTextColor(...GRIS)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  const declaracion = doc.splitTextToSize(
    ascii(
      'Declaracion de uso: este reporte ha sido elaborado con referencia a los GRI Standards seleccionados que ' +
      'se listan en cada seccion. No constituye una declaracion "in accordance with GRI Standards" en el sentido ' +
      'formal (esa figura exige cobertura de la totalidad de los Universal Standards y un proceso de materialidad ' +
      'documentado que esta plataforma no automatiza). GRI 1: Foundation 2021 no se reporta como divulgacion ' +
      'independiente: es el estandar que fija los principios de reporte, no una tabla de datos.',
    ),
    UTIL,
  )
  doc.text(declaracion, MARGEN, cur.y)
  cur.y += declaracion.length * 3.8 + 10

  // --- 2-1 a 2-5: perfil de la organización (GRI 2: General Disclosures) ---
  titulo(doc, cur, 'GRI 2: General Disclosures 2021')
  autoTable(doc, {
    startY: cur.y,
    margin: { left: MARGEN, right: MARGEN },
    head: [['Codigo', 'Divulgacion', 'Respuesta']],
    body: [
      ['2-1', 'Detalles de la organizacion', ascii(`${r.meta.empresa}. Sector agroexportador. Peru.`)],
      ['2-2', 'Entidades incluidas en el reporte', 'Operacion agricola y de packing de la empresa reportante. No incluye subsidiarias ni joint ventures.'],
      ['2-3', 'Periodo, frecuencia y punto de contacto', ascii(`Periodo: ${r.periodo.desde} a ${r.periodo.hasta}. Frecuencia: anual. ${r.periodo.cerrado ? 'Periodo cerrado.' : 'Periodo parcial, prorrateado.'}`)],
      ['2-4', 'Reexpresion de informacion', 'No aplica: primer reporte generado por la plataforma para este periodo.'],
      ['2-5', 'Verificacion externa', r.meta.nivelValidez.includes('Autodeclarado') ? 'No verificado por tercero independiente en este periodo (ver nivel de validez).' : 'Verificado por tercero independiente.'],
    ],
    columnStyles: { 0: { cellWidth: 16 }, 1: { cellWidth: 46 } },
    ...estiloTabla(8),
  })
  cur.y = finTabla(doc) + 8

  // ------------------------------------------------------------
  // GRI 305: Emissions 2016 — las siete divulgaciones reales del estándar
  // ------------------------------------------------------------
  doc.addPage()
  cur.y = MARGEN + 6
  titulo(doc, cur, 'GRI 305: Emissions 2016')
  nota(doc, cur, 'Divulgaciones 305-1 a 305-5, con los datos que el motor de calculo de la plataforma produce. 305-6 y 305-7 se declaran "no reportado" cuando no hay dato primario: GRI exige declarar la ausencia, no omitir la fila.')

  parrafo(
    doc, cur, '305-1  Emisiones directas de GEI (Alcance 1)',
    `${num(r.resultados.scopes.s1, 2)} tCO2e en el periodo. Incluye combustion de diesel en maquinaria agricola y emisiones de N2O de suelos gestionados (directas e indirectas por volatilizacion y lixiviacion, metodo IPCC 2019 Tier 1). Gases: CO2, N2O. GWP de referencia: AR6 (100 anos).`,
  )
  parrafo(
    doc, cur, '305-2  Emisiones indirectas de GEI por energia (Alcance 2)',
    `${num(r.resultados.scopes.s2, 2)} tCO2e en el periodo. Electricidad adquirida de la red SEIN para riego tecnificado y para prefrio/packing. Enfoque: location-based (factor de emision de la red nacional, MINAM/COES).`,
  )
  parrafo(
    doc, cur, '305-3  Otras emisiones indirectas de GEI (Alcance 3)',
    `${num(r.resultados.scopes.s3, 2)} tCO2e en el periodo. Categorias reportadas: produccion upstream de fertilizantes, produccion de materiales de empaque (carton, film, palets) y transporte terrestre/maritimo refrigerado hasta destino. No incluye categorias aguas abajo del punto de venta (uso, fin de vida).`,
  )

  const intensidadRow = [
    ascii('Intensidad de emisiones GEI'),
    `${num(r.resultados.intensidad, 4)} kgCO2e/kg`,
    'Producto exportado (fruta fresca), incluye Alcance 1, 2 y 3',
  ]
  subtitulo(doc, cur, '305-4  Intensidad de emisiones de GEI')
  autoTable(doc, {
    startY: cur.y,
    margin: { left: MARGEN, right: MARGEN },
    head: [['Metrica', 'Valor', 'Metrica de organizacion especifica usada']],
    body: [intensidadRow],
    ...estiloTabla(8),
  })
  cur.y = finTabla(doc) + 8

  parrafo(
    doc, cur, '305-5  Reduccion de emisiones de GEI',
    r.resultados.productos.length && r.resultados.productos.some((p) => p.deltaInteranualPct !== 0)
      ? `Variacion interanual por producto: ${r.resultados.productos.map((p) => `${ascii(p.producto)} ${p.deltaInteranualPct > 0 ? '+' : ''}${p.deltaInteranualPct}%`).join('; ')}. Año base: campana anterior de cada producto.`
      : 'No hay variacion interanual reportada para el periodo: no se declara reduccion sin dato de linea base que la sustente.',
  )
  parrafo(
    doc, cur, '305-6  Emisiones de sustancias que agotan la capa de ozono (SAO)',
    'No reportado: la operacion no declara consumo de refrigerantes ni de otras sustancias controladas por el Protocolo de Montreal en los archivos vinculados.',
  )
  parrafo(
    doc, cur, '305-7  NOx, SOx y otras emisiones significativas al aire',
    'No reportado: fuera del alcance del inventario actual, centrado en gases de efecto invernadero (GRI 305-1 a 305-5).',
  )

  // --- Emisiones por mecanismo, como respaldo de 305-1/2/3 ---
  doc.addPage()
  cur.y = MARGEN + 6
  titulo(doc, cur, 'Detalle de calculo — respaldo de 305-1 a 305-3')
  nota(doc, cur, 'Desglose por mecanismo de emision. Mismo dato que alimenta el informe tecnico ISO 14067/GHG Protocol: las cifras de este reporte y las del informe tecnico nunca deberian divergir, porque derivan del mismo motor de calculo.')
  autoTable(doc, {
    startY: cur.y,
    margin: { left: MARGEN, right: MARGEN },
    head: [['Mecanismo', 'Impacto climatico', '% del total']],
    body: r.resultados.mecanismos.map((m) => [
      ascii(m.label),
      m.intensidad === null ? 'sin dato' : `${num(m.intensidad, 4)} kgCO2e/kg`,
      m.pct === null ? 'sin dato' : `${num(m.pct, 2)}%`,
    ]),
    foot: [['Total', `${num(r.resultados.intensidad, 4)} kgCO2e/kg`, '100,00%']],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    ...estiloTabla(),
  })
  cur.y = finTabla(doc) + 8

  subtitulo(doc, cur, 'Factores de emision aplicados')
  autoTable(doc, {
    startY: cur.y,
    margin: { left: MARGEN, right: MARGEN },
    head: [['Factor', 'Valor', 'Unidad', 'Fuente', 'Version']],
    body: r.factores.map((f) => [ascii(f.factor), num(f.valor, 3), ascii(f.unidad), ascii(f.fuente), ascii(f.version)]),
    ...estiloTabla(7),
  })
  cur.y = finTabla(doc) + 6

  nota(doc, cur, 'Metodo de asignacion, GWP e indicador: ' + r.periodo.metodoAsignacion)
  nota(doc, cur, r.periodo.indicador)

  pieDePagina(doc, { meta: { empresa: r.meta.empresa, nivelValidez: 'GRI 2 + GRI 305 - ' + r.meta.nivelValidez } })
  return doc
}
