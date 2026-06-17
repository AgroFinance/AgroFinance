// Módulo de exportación: genera PDF real (jsPDF) y Excel real (SheetJS)

import type { SessionUser } from '@/contexts/AuthContext'

// ─── tipos compartidos ────────────────────────────────────────────────────────
export interface ExportData {
  empresa: string
  campania: string
  usuario: string
  fecha: string
  huellaTotal: number
  intensidad: number
  reduccionPct: number
  benchmark: number
  ahorro: number
  scopes: { nombre: string; descripcion: string; valor: number; pct: number }[]
  emisionesMensuales: { mes: string; emisiones: number; benchmark: number }[]
  topFuentes: { fuente: string; emisiones: number; pct: number; scope: string }[]
  compliance: { nombre: string; region: string; estado: string }[]
  metodologia: string
}

// ─── PDF ──────────────────────────────────────────────────────────────────────
export async function exportarPDF(data: ExportData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 16

  // Paleta
  const verde = [19, 48, 31] as [number, number, number]
  const verdeClaro = [43, 164, 112] as [number, number, number]
  const gris = [80, 108, 92] as [number, number, number]
  const grisClaro = [244, 246, 242] as [number, number, number]

  // ── Encabezado ──
  doc.setFillColor(...verde)
  doc.rect(0, 0, W, 36, 'F')

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('AGROFINANCE', margin, 14)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 210, 180)
  doc.text('CARBON INTELLIGENCE · REPORTE ESG', margin, 20)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(`${data.empresa}`, margin, 29)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 210, 180)
  doc.text(`Campaña ${data.campania} · Generado ${data.fecha} · ${data.usuario}`, margin, 34)

  let y = 46

  // ── KPIs ──
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...verde)
  doc.text('Indicadores clave', margin, y)
  y += 6

  const kpis = [
    { label: 'Huella total', value: `${data.huellaTotal.toLocaleString('es-PE')} tCO₂e` },
    { label: 'Intensidad', value: `${data.intensidad.toFixed(2)} kgCO₂e/kg` },
    { label: 'Reducción YoY', value: `${data.reduccionPct}%` },
    { label: 'Benchmark sector', value: `${data.benchmark.toFixed(2)} kgCO₂e/kg` },
    { label: 'Ahorro potencial', value: `US$ ${data.ahorro.toLocaleString('es-PE')}/año` },
  ]

  const kpiW = (W - margin * 2 - 8) / kpis.length
  kpis.forEach((k, i) => {
    const x = margin + i * (kpiW + 2)
    doc.setFillColor(...grisClaro)
    doc.roundedRect(x, y, kpiW, 20, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gris)
    doc.text(k.label.toUpperCase(), x + 3, y + 6)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...verde)
    doc.text(k.value, x + 3, y + 14)
  })
  y += 28

  // ── Inventario GHG por Scope ──
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...verde)
  doc.text('Inventario GHG Protocol — Scopes 1, 2 y 3', margin, y)
  y += 4

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Alcance', 'Descripción', 'tCO₂e', '% Total']],
    body: data.scopes.map(s => [s.nombre, s.descripcion, s.valor.toLocaleString('es-PE'), `${s.pct}%`]),
    headStyles: { fillColor: verde, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [40, 60, 50] },
    alternateRowStyles: { fillColor: grisClaro },
    columnStyles: { 0: { cellWidth: 28 }, 2: { halign: 'right', cellWidth: 26 }, 3: { halign: 'right', cellWidth: 22 } },
  })
  y = (doc as any).lastAutoTable.finalY + 8

  // ── Top fuentes de emisión ──
  if (y > 240) { doc.addPage(); y = 20 }
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...verde)
  doc.text('Top fuentes de emisión', margin, y)
  y += 4

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Fuente', 'Scope', 'tCO₂e', '% Total']],
    body: data.topFuentes.map(f => [f.fuente, f.scope, f.emisiones.toLocaleString('es-PE'), `${f.pct}%`]),
    headStyles: { fillColor: verdeClaro, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [40, 60, 50] },
    alternateRowStyles: { fillColor: grisClaro },
    columnStyles: { 1: { cellWidth: 20 }, 2: { halign: 'right', cellWidth: 26 }, 3: { halign: 'right', cellWidth: 22 } },
  })
  y = (doc as any).lastAutoTable.finalY + 8

  // ── Evolución mensual ──
  if (y > 220) { doc.addPage(); y = 20 }
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...verde)
  doc.text('Evolución mensual de emisiones (tCO₂e)', margin, y)
  y += 4

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Mes', 'Emisiones', 'Benchmark', 'Δ vs Benchmark']],
    body: data.emisionesMensuales.map(e => [
      e.mes,
      e.emisiones.toLocaleString('es-PE'),
      e.benchmark.toLocaleString('es-PE'),
      `${e.emisiones < e.benchmark ? '▼' : '▲'} ${Math.abs(e.emisiones - e.benchmark).toLocaleString('es-PE')}`,
    ]),
    headStyles: { fillColor: verde, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [40, 60, 50] },
    alternateRowStyles: { fillColor: grisClaro },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
  })
  y = (doc as any).lastAutoTable.finalY + 8

  // ── Cumplimiento regulatorio ──
  if (y > 220) { doc.addPage(); y = 20 }
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...verde)
  doc.text('Estado de cumplimiento regulatorio', margin, y)
  y += 4

  const estadoLabel: Record<string, string> = {
    listo: '✓ Listo', proceso: '◐ En proceso', pendiente: '○ Pendiente',
  }
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Marco / Regulación', 'Región', 'Estado']],
    body: data.compliance.map(c => [c.nombre, c.region, estadoLabel[c.estado] ?? c.estado]),
    headStyles: { fillColor: verde, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [40, 60, 50] },
    alternateRowStyles: { fillColor: grisClaro },
  })
  y = (doc as any).lastAutoTable.finalY + 8

  // ── Metodología ──
  if (y > 255) { doc.addPage(); y = 20 }
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...gris)
  const lines = doc.splitTextToSize(`Metodología: ${data.metodologia}`, W - margin * 2)
  doc.text(lines, margin, y)
  y += lines.length * 4 + 4

  // ── Pie de página (todas las páginas) ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(...verde)
    doc.rect(0, 287, W, 10, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 210, 180)
    doc.text('AgroFinance · Carbon Intelligence · agrofinance.github.io', margin, 293)
    doc.text(`Página ${i} de ${totalPages}`, W - margin - 20, 293)
  }

  doc.save(`Reporte_ESG_${data.empresa.replace(/\s+/g, '_')}_${data.campania}.pdf`)
}

// ─── Excel ────────────────────────────────────────────────────────────────────
export async function exportarExcel(data: ExportData): Promise<void> {
  const XLSX = await import('xlsx')

  const wb = XLSX.utils.book_new()

  // Hoja 1: Resumen
  const resumen = [
    ['AGROFINANCE · REPORTE ESG', ''],
    ['Empresa', data.empresa],
    ['Campaña', data.campania],
    ['Usuario', data.usuario],
    ['Fecha de generación', data.fecha],
    [''],
    ['INDICADORES CLAVE', ''],
    ['Huella Total (tCO₂e)', data.huellaTotal],
    ['Intensidad (kgCO₂e/kg)', data.intensidad],
    ['Reducción YoY (%)', data.reduccionPct],
    ['Benchmark sector (kgCO₂e/kg)', data.benchmark],
    ['Ahorro potencial crédito verde (USD/año)', data.ahorro],
    [''],
    ['INVENTARIO GHG PROTOCOL'],
    ['Alcance', 'Descripción', 'tCO₂e', '% Total'],
    ...data.scopes.map(s => [s.nombre, s.descripcion, s.valor, s.pct / 100]),
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(resumen)
  ws1['!cols'] = [{ wch: 36 }, { wch: 40 }, { wch: 16 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen')

  // Hoja 2: Evolución mensual
  const mensual = [
    ['Mes', 'Emisiones (tCO₂e)', 'Benchmark (tCO₂e)', 'Diferencia'],
    ...data.emisionesMensuales.map(e => [e.mes, e.emisiones, e.benchmark, e.emisiones - e.benchmark]),
  ]
  const ws2 = XLSX.utils.aoa_to_sheet(mensual)
  ws2['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Emisiones Mensuales')

  // Hoja 3: Top fuentes
  const fuentes = [
    ['Fuente', 'Scope', 'tCO₂e', '% Total'],
    ...data.topFuentes.map(f => [f.fuente, f.scope, f.emisiones, f.pct / 100]),
  ]
  const ws3 = XLSX.utils.aoa_to_sheet(fuentes)
  ws3['!cols'] = [{ wch: 36 }, { wch: 10 }, { wch: 14 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ws3, 'Top Fuentes')

  // Hoja 4: Cumplimiento
  const cumpl = [
    ['Marco / Regulación', 'Región', 'Estado'],
    ...data.compliance.map(c => [c.nombre, c.region, c.estado]),
  ]
  const ws4 = XLSX.utils.aoa_to_sheet(cumpl)
  ws4['!cols'] = [{ wch: 30 }, { wch: 28 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, ws4, 'Cumplimiento')

  XLSX.writeFile(wb, `Datos_ESG_${data.empresa.replace(/\s+/g, '_')}_${data.campania}.xlsx`)
}
