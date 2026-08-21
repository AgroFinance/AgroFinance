'use client'

// ============================================================
// AgroFinance — Generador del INFORME TÉCNICO en PDF
// ------------------------------------------------------------
// Toma el modelo serializable de reporteTecnico.ts y lo imprime en A4 con
// una estructura fija de seis secciones numeradas. Determinístico: el
// mismo dataset da siempre el mismo documento, que es lo que permite
// comparar dos exportaciones en una auditoría.
//
// Detalles que separan un PDF que se puede auditar de uno que solo se ve
// bonito:
//  · Las tablas repiten encabezado al saltar de página y no parten filas.
//  · Cada página lleva pie con el nivel de validez y la numeración.
//  · Ningún número aparece sin su factor y su fuente dentro del documento.
// ============================================================

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ReporteTecnico } from './reporteTecnico'

// --- Paleta de marca ---
export const VERDE_OSCURO: [number, number, number] = [19, 48, 31]
export const VERDE: [number, number, number] = [19, 124, 83]
export const GRIS: [number, number, number] = [80, 108, 92]
export const CREMA: [number, number, number] = [244, 246, 242]

export const MARGEN = 16
export const ANCHO = 210
export const ALTO = 297
export const UTIL = ANCHO - MARGEN * 2

// Las fuentes estándar de jsPDF son WinAnsi: subíndices, flechas y comillas
// tipográficas salen como basura. Se transliteran una sola vez, aquí.
const MAPA: [RegExp, string][] = [
  [/₀/g, '0'], [/₁/g, '1'], [/₂/g, '2'], [/₃/g, '3'], [/₄/g, '4'],
  [/⁰/g, '0'], [/¹/g, '1'], [/²/g, '2'], [/³/g, '3'],
  [/≤/g, '<='], [/≥/g, '>='], [/≈/g, '~'], [/±/g, '+/-'],
  [/[—–]/g, '-'], [/·/g, '-'], [/→/g, '->'], [/[“”]/g, '"'], [/[‘’]/g, "'"],
  [/…/g, '...'], [/ /g, ' '],
]

export function ascii(v: unknown): string {
  let s = String(v ?? '')
  for (const [re, rep] of MAPA) s = s.replace(re, rep)
  return s
}

export const num = (n: number | null, d = 2) =>
  n === null ? 'sin dato' : n.toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d })

export type Cursor = { y: number }

export function generarInformeTecnico(r: ReporteTecnico) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const cur: Cursor = { y: 0 }

  // ------------------------------------------------------------
  // Página 1 — portada / resumen ejecutivo
  // ------------------------------------------------------------
  doc.setFillColor(...VERDE_OSCURO)
  doc.rect(0, 0, ANCHO, 62, 'F')

  doc.setTextColor(150, 220, 185)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('INFORME TECNICO DE HUELLA DE CARBONO', MARGEN, 20)

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(21)
  doc.text(ascii(r.meta.titulo), MARGEN, 32, { maxWidth: UTIL })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(ascii(`${r.meta.empresa} - Campana ${r.meta.campania}`), MARGEN, 42)
  doc.setFontSize(8.5)
  doc.setTextColor(190, 214, 200)
  doc.text(ascii(`Emitido el ${r.meta.emitido} - AgroFinance AI`), MARGEN, 49)
  doc.text(
    ascii('Elaborado conforme a ISO 14067:2018 y GHG Protocol Product Life Cycle Accounting and Reporting Standard'),
    MARGEN, 55, { maxWidth: UTIL },
  )

  // Cifras de cabecera
  cur.y = 76
  const cajas: [string, string, string][] = [
    ['Huella total', num(r.resultados.huellaTotalTon, 2), 'tCO2e'],
    ['Intensidad', num(r.resultados.intensidad, 3), 'kgCO2e/kg'],
    ['Volumen exportado', (r.resultados.kilosExportados / 1000).toLocaleString('es-PE', { maximumFractionDigits: 0 }), 't'],
  ]
  const anchoCaja = (UTIL - 8) / 3
  cajas.forEach(([label, valor, unidad], i) => {
    const x = MARGEN + i * (anchoCaja + 4)
    doc.setFillColor(...CREMA)
    doc.roundedRect(x, cur.y, anchoCaja, 24, 2.5, 2.5, 'F')
    doc.setTextColor(...GRIS)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(ascii(label.toUpperCase()), x + 5, cur.y + 7)
    doc.setTextColor(...VERDE)
    doc.setFontSize(14)
    doc.text(ascii(valor), x + 5, cur.y + 16)
    doc.setTextColor(...GRIS)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(ascii(unidad), x + 5, cur.y + 21)
  })
  cur.y += 32

  // Badge de nivel de validez — visible sin buscarlo (RNF-5.1)
  doc.setFillColor(255, 244, 214)
  doc.setDrawColor(210, 162, 74)
  doc.roundedRect(MARGEN, cur.y, UTIL, 9, 2, 2, 'FD')
  doc.setTextColor(140, 95, 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(ascii(`NIVEL DE VALIDEZ: ${r.meta.nivelValidez.toUpperCase()}`), MARGEN + 4, cur.y + 6)
  cur.y += 13

  doc.setTextColor(...GRIS)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  const notaValidez = doc.splitTextToSize(ascii(r.meta.notaValidez), UTIL)
  doc.text(notaValidez, MARGEN, cur.y + 4)
  cur.y += notaValidez.length * 4 + 8

  // Distribución por alcance
  doc.setTextColor(...VERDE_OSCURO)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Resumen por alcance GHG Protocol', MARGEN, cur.y)
  autoTable(doc, {
    startY: cur.y + 3,
    margin: { left: MARGEN, right: MARGEN },
    head: [['Alcance', 'Definicion', 'tCO2e', '% del total']],
    body: (['s1', 's2', 's3'] as const).map((k, i) => {
      const v = r.resultados.scopes[k]
      const pct = r.resultados.huellaTotalTon > 0 ? (v / r.resultados.huellaTotalTon) * 100 : 0
      return [
        `Scope ${i + 1}`,
        ['Emisiones directas (combustion y suelo)', 'Electricidad adquirida (red SEIN)', 'Cadena de valor (insumos, empaque, flete)'][i],
        num(v, 2),
        `${num(pct, 1)}%`,
      ]
    }),
    foot: [['TOTAL', '', num(r.resultados.huellaTotalTon, 2), '100,0%']],
    ...estiloTabla(),
  })

  // ------------------------------------------------------------
  // Indice — el informe de referencia se lee de corrido, pero un auditor
  // necesita saltar directo a "factores de emision" o a "resultados".
  // ------------------------------------------------------------
  doc.addPage()
  cur.y = MARGEN + 6
  titulo(doc, cur, 'Indice')
  const indice: [string, string][] = [
    ['1', 'Objetivo del estudio'],
    ['1.1', 'Huella climatica de la agricultura'],
    ['1.2', 'Analisis de ciclo de vida atribucional'],
    ['1.3', 'Partes interesadas'],
    ['2', 'Alcance del estudio'],
    ['2.1', 'Unidad de analisis'],
    ['2.2', 'Limites del sistema'],
    ['2.3', 'Mecanismos incluidos'],
    ['2.4', 'Mecanismos excluidos'],
    ['2.5', 'Periodo de captura'],
    ['2.6', 'Almacenamiento de carbono en productos'],
    ['2.7', 'Indicador de huella climatica'],
    ['2.8', 'Asignacion'],
    ['2.9', 'Modelos y datos'],
    ['2.10', 'Cambio de uso de suelo'],
    ['3', 'Datos de actividad'],
    ['4', 'Factores de emision'],
    ['5', 'Resultados'],
    ['6', 'Gasto ambiental del periodo'],
    ['7', 'Contribucion documentada a los ODS'],
    ['8', 'Referencias y fuentes de datos'],
    ['A', 'Anexo. Estado de preparacion para auditoria'],
  ]
  doc.setFontSize(9)
  for (const [n, t] of indice) {
    const nivel2 = n.includes('.')
    doc.setFont('helvetica', nivel2 ? 'normal' : 'bold')
    doc.setTextColor(...(nivel2 ? GRIS : VERDE_OSCURO))
    doc.text(n, MARGEN + (nivel2 ? 6 : 0), cur.y)
    doc.text(ascii(t), MARGEN + (nivel2 ? 20 : 12), cur.y)
    cur.y += nivel2 ? 5 : 6.5
  }
  cur.y += 4
  nota(doc, cur, r.queEsEsteDocumento)

  // ------------------------------------------------------------
  // 1. Objetivo del estudio
  // ------------------------------------------------------------
  doc.addPage()
  cur.y = MARGEN + 6
  titulo(doc, cur, '1. Objetivo del estudio')
  parrafo(doc, cur, '', r.objetivo.proposito)
  parrafo(doc, cur, '1.1 Huella climatica de la agricultura', r.objetivo.huellaClimaticaAgricultura)
  parrafo(doc, cur, '1.2 Analisis de ciclo de vida atribucional', r.objetivo.enfoque)
  parrafo(doc, cur, '1.3 Partes interesadas', r.objetivo.audiencia)

  // ------------------------------------------------------------
  // 2. Alcance del estudio
  // ------------------------------------------------------------
  titulo(doc, cur, '2. Alcance del estudio')
  parrafo(doc, cur, '2.1 Unidad de analisis', r.limites.unidadAnalisis)
  parrafo(doc, cur, `2.2 Limites del sistema: ${r.limites.limiteSistema}`, `${r.limites.limiteLabel}. ${r.limites.descripcion}`)

  subtitulo(doc, cur, '2.3 Mecanismos incluidos')
  lista(doc, cur, r.limites.mecanismosIncluidos)
  subtitulo(doc, cur, '2.4 Mecanismos excluidos')
  lista(doc, cur, r.limites.mecanismosExcluidos)

  parrafo(
    doc, cur, '2.5 Periodo de captura',
    `Desde ${r.periodo.desde} hasta ${r.periodo.hasta}. ${r.periodo.cerrado
      ? 'Periodo cerrado: cubre la campana completa.'
      : 'Ventana parcial: las emisiones anuales se prorratean segun los kilos enviados dentro del periodo, y asi queda declarado.'}`,
  )
  parrafo(doc, cur, '2.6 Almacenamiento de carbono en productos', r.limites.almacenamientoCarbono)
  parrafo(doc, cur, '2.7 Indicador de huella climatica', r.periodo.indicador)
  parrafo(doc, cur, '2.8 Asignacion', r.periodo.metodoAsignacion)
  parrafo(doc, cur, '2.9 Modelos y datos', r.limites.modelosYDatos)
  parrafo(doc, cur, '2.10 Cambio de uso de suelo', r.limites.cambioUsoSuelo)

  // ------------------------------------------------------------
  // 3. Datos de actividad
  // ------------------------------------------------------------
  doc.addPage()
  cur.y = MARGEN + 6
  titulo(doc, cur, '3. Datos de actividad')
  nota(doc, cur, 'Consumos leidos de los archivos vinculados. Un valor "sin dato" significa que la fuente alimenta el motor de campana sin detalle linea a linea; nunca es un cero de relleno.')
  autoTable(doc, {
    startY: cur.y,
    margin: { left: MARGEN, right: MARGEN },
    head: [['Parametro', 'Valor', 'Unidad', 'Archivo de origen']],
    body: r.activityData.map((a) => [ascii(a.input), a.valor === null ? 'sin dato' : num(a.valor, 2), ascii(a.unidad), ascii(a.origen)]),
    columnStyles: { 1: { halign: 'right' } },
    ...estiloTabla(),
  })
  cur.y = finTabla(doc) + 8

  // ------------------------------------------------------------
  // 4. Factores de emision
  // ------------------------------------------------------------
  titulo(doc, cur, '4. Factores de emision')
  nota(doc, cur, 'Misma tabla que Configuracion muestra en pantalla. Cada factor declara su fuente y su version.')
  autoTable(doc, {
    startY: cur.y,
    margin: { left: MARGEN, right: MARGEN },
    head: [['Parametro', 'Valor', 'Unidad', 'Fuente', 'Version', 'Alcance']],
    body: r.factores.map((f) => [
      ascii(f.factor), num(f.valor, 3), ascii(f.unidad), ascii(f.fuente), ascii(f.version), `S${f.scope} - ${ascii(f.mecanismo)}`,
    ]),
    columnStyles: { 1: { halign: 'right' } },
    ...estiloTabla(7),
  })
  cur.y = finTabla(doc) + 6
  nota(doc, cur, r.periodo.metodoN2O)
  nota(doc, cur, r.periodo.nota)

  // ------------------------------------------------------------
  // 5. Resultados
  // ------------------------------------------------------------
  doc.addPage()
  cur.y = MARGEN + 6
  titulo(doc, cur, '5. Resultados')
  nota(doc, cur, `La huella del inventario es ${num(r.resultados.intensidad, 3)} kgCO2e/kg. La tabla muestra el resultado separado por mecanismo, ordenado de mayor a menor. Los mecanismos sin dato primario se declaran como tales en vez de estimarse.`)
  autoTable(doc, {
    startY: cur.y,
    margin: { left: MARGEN, right: MARGEN },
    head: [['Mecanismo', 'Impacto climatico', 'Porcentaje del total']],
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

  for (const p of r.resultados.productos) {
    if (cur.y > ALTO - 80) { doc.addPage(); cur.y = MARGEN + 6 }
    subtitulo(doc, cur, `Resultado por producto: ${p.producto}`)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRIS)
    doc.text(
      ascii(
        `Intensidad ${num(p.intensidad, 3)} kgCO2e/kg - ${(p.kilosExportados / 1000).toLocaleString('es-PE', { maximumFractionDigits: 0 })} t exportadas - ` +
        `huella ${num(p.huellaTotalTon, 0)} tCO2e`,
      ),
      MARGEN, cur.y,
    )
    cur.y += 5
    doc.text(
      ascii(
        p.benchmark.valor === null
          ? `Referencia ${p.benchmark.alcance}: sin dato de referencia publicado.`
          : `Referencia ${p.benchmark.alcance}: ${num(p.benchmark.valor, 2)} kgCO2e/kg (${p.benchmark.fuente}) - resultado ${p.benchmark.desvio}.`,
      ),
      MARGEN, cur.y, { maxWidth: UTIL },
    )
    cur.y += 5
    doc.text(ascii(`Variacion vs. campana ${p.periodoAnterior}: ${p.deltaInteranualPct > 0 ? '+' : ''}${p.deltaInteranualPct}%`), MARGEN, cur.y)
    cur.y += 3

    autoTable(doc, {
      startY: cur.y,
      margin: { left: MARGEN, right: MARGEN },
      head: [['Mecanismo', 'Impacto climatico', 'Porcentaje del total']],
      body: p.mecanismos.map((m) => [
        ascii(m.label),
        m.intensidad === null ? 'sin dato' : `${num(m.intensidad, 4)} kgCO2e/kg`,
        m.pct === null ? 'sin dato' : `${num(m.pct, 2)}%`,
      ]),
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      ...estiloTabla(7.5),
    })
    cur.y = finTabla(doc) + 5

    // Notas del analista: solo aparecen si existen (RF-4.3 / RNF-4.2)
    if (p.sustento) parrafo(doc, cur, 'Sustento de la comparacion contra la referencia', p.sustento)
    if (p.notaVarianza) parrafo(doc, cur, 'Explicacion de la variacion interanual', p.notaVarianza)
    cur.y += 3
  }

  nota(doc, cur, r.resultados.disclaimerBenchmark)

  // ------------------------------------------------------------
  // 6. Gasto ambiental — el indicador monetario que pide el holding
  // ------------------------------------------------------------
  doc.addPage()
  cur.y = MARGEN + 6
  titulo(doc, cur, '6. Gasto ambiental del periodo')

  if (!r.gastoAmbiental.hayDatos) {
    nota(doc, cur,
      'Sin partidas de gasto ambiental registradas para este periodo. El indicador monetario se declara SIN DATO: ' +
      'no debe leerse como ausencia de inversion.')
  } else {
    const g = r.gastoAmbiental
    autoTable(doc, {
      startY: cur.y,
      margin: { left: MARGEN, right: MARGEN },
      head: [['Indicador', 'Valor']],
      body: [
        ['Inversion total del periodo', `S/ ${g.totalPEN.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`],
        ['Intensidad de inversion', g.solesPorTon === null ? 'sin dato' : `S/ ${g.solesPorTon.toLocaleString('es-PE')} por tCO2e`],
        ['Partidas registradas', String(g.partidas)],
        ['Partidas sin documento de respaldo', String(g.sinRespaldo)],
        ['Tipo de cambio declarado', `S/ ${g.tipoCambio} por US$ 1`],
      ],
      columnStyles: { 0: { cellWidth: 78 } },
      ...estiloTabla(8),
    })
    cur.y = finTabla(doc) + 6

    subtitulo(doc, cur, '6.1 Distribucion por categoria')
    autoTable(doc, {
      startY: cur.y,
      margin: { left: MARGEN, right: MARGEN },
      head: [['Categoria', 'Partidas', 'Monto (S/)', '%']],
      body: r.gastoAmbiental.porCategoria.map((c) => [
        ascii(c.categoria),
        String(c.partidas),
        c.totalPEN.toLocaleString('es-PE', { minimumFractionDigits: 2 }),
        `${c.pct}%`,
      ]),
      columnStyles: { 1: { cellWidth: 20 }, 2: { cellWidth: 32 }, 3: { cellWidth: 16 } },
      ...estiloTabla(8),
    })
    cur.y = finTabla(doc) + 6

    if (r.gastoAmbiental.obligacionesSinGasto.length) {
      nota(doc, cur,
        'Obligaciones ambientales recurrentes sin partida en el periodo: ' +
        r.gastoAmbiental.obligacionesSinGasto.join(', ') + '.')
    }
    nota(doc, cur, r.gastoAmbiental.nota)
  }

  // ------------------------------------------------------------
  // 7. ODS — evidencia, explicitamente NO cumplimiento
  // ------------------------------------------------------------
  doc.addPage()
  cur.y = MARGEN + 6
  titulo(doc, cur, '7. Contribucion documentada a los ODS')

  if (!r.ods.hayDatos) {
    nota(doc, cur, 'Sin indicadores con dato cuantificado en este periodo.')
  } else {
    parrafo(doc, cur, '',
      `De los ${r.ods.totalIndicadores} indicadores evaluados, ${r.ods.indicadoresConEvidencia} cuentan con dato ` +
      'cuantificado y trazable dentro del inventario.')
    autoTable(doc, {
      startY: cur.y,
      margin: { left: MARGEN, right: MARGEN },
      head: [['Objetivo', 'Meta', 'Indicador', 'Estado', 'Dato que lo sustenta']],
      body: r.ods.filas.map((f) => [
        ascii(f.ods), f.meta, ascii(f.indicador), ascii(f.estado), ascii(f.dato),
      ]),
      columnStyles: { 0: { cellWidth: 34 }, 1: { cellWidth: 12 }, 3: { cellWidth: 26 } },
      ...estiloTabla(7.5),
    })
    cur.y = finTabla(doc) + 6
  }
  nota(doc, cur, r.ods.nota)

  // ------------------------------------------------------------
  // 8. Referencias y fuentes de datos
  // ------------------------------------------------------------
  doc.addPage()
  cur.y = MARGEN + 6
  titulo(doc, cur, '8. Referencias y fuentes de datos')
  lista(doc, cur, r.referencias)

  // ------------------------------------------------------------
  // Anexo — checklist de auditoria
  // ------------------------------------------------------------
  titulo(doc, cur, 'Anexo. Estado de preparacion para auditoria')
  autoTable(doc, {
    startY: cur.y,
    margin: { left: MARGEN, right: MARGEN },
    head: [['Estado', 'Requisito', 'Detalle']],
    body: r.checklist.map((c) => [c.cumplido ? 'Cumplido' : 'Pendiente', ascii(c.titulo), ascii(c.detalle)]),
    columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 52 } },
    ...estiloTabla(7.5),
  })


  pieDePagina(doc, r)
  return doc
}

// ------------------------------------------------------------
// Utilidades de composición
// ------------------------------------------------------------
export function estiloTabla(fontSize = 8) {
  return {
    styles: { fontSize, cellPadding: 2, overflow: 'linebreak' as const, textColor: [60, 70, 62] as [number, number, number] },
    headStyles: { fillColor: VERDE, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const, fontSize },
    footStyles: { fillColor: CREMA, textColor: VERDE_OSCURO, fontStyle: 'bold' as const },
    alternateRowStyles: { fillColor: [250, 251, 249] as [number, number, number] },
    // Encabezado repetido en cada pagina y filas que no se parten (RNF-1.2)
    showHead: 'everyPage' as const,
    rowPageBreak: 'avoid' as const,
    margin: { top: MARGEN, bottom: MARGEN + 6 },
  }
}

export const finTabla = (doc: jsPDF) => ((doc as any).lastAutoTable?.finalY ?? MARGEN) as number

export function saltoSiHaceFalta(doc: jsPDF, cur: Cursor, alto: number) {
  if (cur.y + alto > ALTO - MARGEN - 8) {
    doc.addPage()
    cur.y = MARGEN + 6
  }
}

export function titulo(doc: jsPDF, cur: Cursor, texto: string) {
  saltoSiHaceFalta(doc, cur, 22)
  cur.y += 4
  doc.setDrawColor(...VERDE)
  doc.setLineWidth(0.6)
  doc.line(MARGEN, cur.y - 4, MARGEN + 14, cur.y - 4)
  doc.setTextColor(...VERDE_OSCURO)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(ascii(texto), MARGEN, cur.y + 3)
  cur.y += 10
}

export function subtitulo(doc: jsPDF, cur: Cursor, texto: string) {
  saltoSiHaceFalta(doc, cur, 14)
  doc.setTextColor(...VERDE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(ascii(texto), MARGEN, cur.y)
  cur.y += 6
}

export function parrafo(doc: jsPDF, cur: Cursor, etiqueta: string, texto: string) {
  const lineas = doc.splitTextToSize(ascii(texto), UTIL)
  saltoSiHaceFalta(doc, cur, lineas.length * 4 + 10)
  doc.setTextColor(...VERDE_OSCURO)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(ascii(etiqueta), MARGEN, cur.y)
  cur.y += 4.5
  doc.setTextColor(...GRIS)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(lineas, MARGEN, cur.y)
  cur.y += lineas.length * 4 + 5
}

export function nota(doc: jsPDF, cur: Cursor, texto: string) {
  const lineas = doc.splitTextToSize(ascii(texto), UTIL)
  saltoSiHaceFalta(doc, cur, lineas.length * 3.8 + 6)
  doc.setTextColor(...GRIS)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.text(lineas, MARGEN, cur.y)
  doc.setFont('helvetica', 'normal')
  cur.y += lineas.length * 3.8 + 4
}

export function lista(doc: jsPDF, cur: Cursor, items: string[]) {
  doc.setTextColor(...GRIS)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  for (const it of items) {
    const lineas = doc.splitTextToSize(ascii(it), UTIL - 6)
    saltoSiHaceFalta(doc, cur, lineas.length * 4 + 2)
    doc.setTextColor(...VERDE)
    doc.text('-', MARGEN, cur.y)
    doc.setTextColor(...GRIS)
    doc.text(lineas, MARGEN + 4, cur.y)
    cur.y += lineas.length * 4 + 1
  }
  cur.y += 4
}

export function pieDePagina(doc: jsPDF, r: { meta: { empresa: string; nivelValidez: string } }) {
  const paginas = doc.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    doc.setDrawColor(220, 228, 222)
    doc.setLineWidth(0.3)
    doc.line(MARGEN, ALTO - 12, ANCHO - MARGEN, ALTO - 12)
    doc.setTextColor(...GRIS)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(ascii(`${r.meta.empresa} - ${r.meta.nivelValidez}`), MARGEN, ALTO - 7)
    doc.text(`${p} / ${paginas}`, ANCHO - MARGEN, ALTO - 7, { align: 'right' })
  }
}
