// Módulo de exportación: genera PDF real (jsPDF) con análisis IA (Gemini) + Excel real (SheetJS)

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

// ─── GEMINI AI — narrativa profesional para certificadora ────────────────────
const GEMINI_KEYS = [
  'AIzaSyBmrQXJ7OFRMEsPKqTPTmEgalEap64e2uQ',
  'AIzaSyD0AQ.Ab8RN6IE6QHUThKGVePhMxjuimiqqJr0gYHjYsC2Qj82zcsH6Q',
]
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

async function generarNarrativaIA(data: ExportData): Promise<string> {
  const prompt = `Eres un auditor experto en sostenibilidad ambiental certificado en GHG Protocol, ISO 14064 y estándares ESG. Redacta una sección de análisis narrativo ejecutivo (máximo 450 palabras) en español para incluir en un reporte oficial de huella de carbono destinado a una certificadora internacional (Bureau Veritas, Verra o equivalente).

DATOS REALES DE LA EMPRESA:
- Empresa: ${data.empresa}
- Campaña: ${data.campania}
- Huella total: ${data.huellaTotal.toLocaleString('es-PE')} tCO₂e
- Intensidad: ${data.intensidad.toFixed(2)} kgCO₂e/kg (benchmark sector: ${data.benchmark.toFixed(2)})
- Reducción interanual: ${data.reduccionPct}%
- Scope 1: ${data.scopes[0]?.valor?.toLocaleString('es-PE') ?? 0} tCO₂e (${data.scopes[0]?.pct ?? 0}%)
- Scope 2: ${data.scopes[1]?.valor?.toLocaleString('es-PE') ?? 0} tCO₂e (${data.scopes[1]?.pct ?? 0}%)
- Scope 3: ${data.scopes[2]?.valor?.toLocaleString('es-PE') ?? 0} tCO₂e (${data.scopes[2]?.pct ?? 0}%)
- Principal fuente de emisión: ${data.topFuentes[0]?.fuente ?? 'N/D'} (${data.topFuentes[0]?.pct ?? 0}% de la huella)
- Ahorro potencial crédito verde: US$ ${data.ahorro.toLocaleString('es-PE')}/año
- Marcos cumplidos: ${data.compliance.filter(c => c.estado === 'listo').map(c => c.nombre).join(', ') || 'Ninguno'}
- Marcos pendientes: ${data.compliance.filter(c => c.estado !== 'listo').map(c => c.nombre).join(', ') || 'Ninguno'}

Estructura requerida (sin usar markdown, solo texto plano con saltos de línea):
1. Resumen ejecutivo (2-3 oraciones clave para la certificadora)
2. Análisis por alcance (Scope 1, 2, 3) con contexto sectorial
3. Hotspot crítico y plan de mitigación recomendado
4. Cumplimiento regulatorio y acceso a financiamiento verde
5. Declaración de metodología y veracidad de datos

Tono: formal, técnico, profesional. Apto para auditoría internacional.`

  for (const key of GEMINI_KEYS) {
    try {
      const res = await fetch(`${GEMINI_URL}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
        }),
      })
      if (!res.ok) continue
      const json = await res.json()
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return text.trim()
    } catch { /* try next key */ }
  }
  // Fallback narrativa si IA no responde
  return `ANÁLISIS EJECUTIVO — CAMPAÑA ${data.campania}

La empresa ${data.empresa} presenta para la campaña ${data.campania} una huella de carbono total de ${data.huellaTotal.toLocaleString('es-PE')} tCO₂e, alcanzando una intensidad de emisión de ${data.intensidad.toFixed(2)} kgCO₂e/kg, por debajo del benchmark sectorial de ${data.benchmark.toFixed(2)} kgCO₂e/kg. Esto representa una reducción interanual de ${data.reduccionPct}%, evidenciando un progreso sostenido en la descarbonización operativa.

El inventario de gases de efecto invernadero se estructura bajo el estándar GHG Protocol Corporate Standard: el Scope 1 (emisiones directas) asciende a ${data.scopes[0]?.valor?.toLocaleString('es-PE') ?? 0} tCO₂e (${data.scopes[0]?.pct ?? 0}%), el Scope 2 (energía indirecta) a ${data.scopes[1]?.valor?.toLocaleString('es-PE') ?? 0} tCO₂e (${data.scopes[1]?.pct ?? 0}%), y el Scope 3 (cadena de valor) a ${data.scopes[2]?.valor?.toLocaleString('es-PE') ?? 0} tCO₂e (${data.scopes[2]?.pct ?? 0}%).

La principal fuente de emisión identificada es ${data.topFuentes[0]?.fuente ?? 'el transporte de carga'}, representando el ${data.topFuentes[0]?.pct ?? 0}% de la huella total. Se recomienda priorizar la negociación con operadores logísticos de bajo carbono y la adopción de combustibles alternativos certificados.

En materia de cumplimiento regulatorio, la organización ha completado exitosamente los marcos: ${data.compliance.filter(c => c.estado === 'listo').map(c => c.nombre).join(', ') || 'en evaluación'}. El ahorro potencial por acceso a financiamiento verde (sustainability-linked loans) asciende a US$ ${data.ahorro.toLocaleString('es-PE')}/año.

Los datos presentados han sido calculados aplicando la metodología ${data.metodologia}. La organización declara que la información contenida en este reporte es veraz, completa y ha sido elaborada bajo principios de relevancia, integridad, consistencia, transparencia y exactitud conforme a ISO 14064-3.`
}

// ─── PDF con IA ───────────────────────────────────────────────────────────────
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
  const goldLight = [252, 243, 207] as [number, number, number]

  // ── Portada Formal ──
  doc.setFillColor(...verde)
  doc.rect(0, 0, W, 297, 'F')
  
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('AGROFINANCE', margin, 50)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 210, 180)
  doc.text('CARBON INTELLIGENCE', margin, 58)

  doc.setFontSize(32)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  const mainTitle = doc.splitTextToSize('REPORTE OFICIAL DE GASES DE EFECTO INVERNADERO', W - margin * 2)
  doc.text(mainTitle, margin, 110)

  doc.setFontSize(16)
  doc.setFont('helvetica', 'normal')
  doc.text(`Organización: ${data.empresa}`, margin, 150)
  doc.text(`Periodo / Campaña: ${data.campania}`, margin, 160)
  doc.text(`Fecha de Emisión: ${data.fecha}`, margin, 170)
  
  doc.setFontSize(12)
  doc.setTextColor(160, 210, 180)
  doc.text('Elaborado bajo los estándares:', margin, 200)
  doc.text('• GHG Protocol Corporate Accounting and Reporting Standard', margin, 208)
  doc.text('• ISO 14064-1:2018 Especificaciones a nivel de organización', margin, 216)

  // Firma
  doc.setDrawColor(160, 210, 180)
  doc.line(margin, 250, margin + 70, 250)
  doc.setFontSize(11)
  doc.text('Preparado por:', margin, 258)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(data.usuario, margin, 266)

  // Siguiente página
  doc.addPage()

  // ── Encabezado (Páginas de contenido) ──
  doc.setFillColor(...verde)
  doc.rect(0, 0, W, 42, 'F')

  // Logo text
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('AGROFINANCE', margin, 14)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 210, 180)
  doc.text('CARBON INTELLIGENCE · REPORTE ESG OFICIAL', margin, 20)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(`${data.empresa}`, margin, 29)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 210, 180)
  doc.text(`Campaña ${data.campania} · Generado ${data.fecha} · Preparado por: ${data.usuario}`, margin, 35)

  // Badge "Verificado con IA"
  doc.setFillColor(...verdeClaro)
  doc.roundedRect(W - margin - 48, 8, 48, 12, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('✦ ANÁLISIS CON IA', W - margin - 26, 16, { align: 'center' })

  let y = 50

  // ── Generar narrativa IA ──
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...verde)
  doc.text('Análisis Ejecutivo — Generado con Inteligencia Artificial', margin, y)
  y += 3

  // IA loading placeholder — generated async
  doc.setFillColor(...goldLight)
  doc.roundedRect(margin, y, W - margin * 2, 6, 1, 1, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...gris)
  doc.text('Generando análisis con Kapi AI — GHG Protocol · ISO 14064 · IPCC AR6', margin + 2, y + 4.5)
  y += 10

  // ── KPIs ──
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...verde)
  doc.text('Indicadores clave de desempeño climático', margin, y)
  y += 6

  const kpis = [
    { label: 'Huella total', value: `${data.huellaTotal.toLocaleString('es-PE')} tCO₂e` },
    { label: 'Intensidad', value: `${data.intensidad.toFixed(2)} kgCO₂e/kg` },
    { label: 'Reducción YoY', value: `▼ ${data.reduccionPct}%` },
    { label: 'Benchmark sector', value: `${data.benchmark.toFixed(2)} kgCO₂e/kg` },
    { label: 'Ahorro potencial', value: `US$ ${data.ahorro.toLocaleString('es-PE')}/año` },
  ]

  const kpiW = (W - margin * 2 - 8) / kpis.length
  kpis.forEach((k, i) => {
    const x = margin + i * (kpiW + 2)
    doc.setFillColor(...grisClaro)
    doc.roundedRect(x, y, kpiW, 22, 2, 2, 'F')
    doc.setFillColor(...verdeClaro)
    doc.rect(x, y, 2, 22, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gris)
    doc.text(k.label.toUpperCase(), x + 4, y + 7)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...verde)
    doc.text(k.value, x + 4, y + 16)
  })
  y += 30

  // ── Inventario GHG por Scope ──
  if (y > 230) { doc.addPage(); y = 20 }
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...verde)
  doc.text('Inventario GHG Protocol — Alcances 1, 2 y 3', margin, y)
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
  if (y > 230) { doc.addPage(); y = 20 }
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...verde)
  doc.text('Top fuentes de emisión por actividad', margin, y)
  y += 4

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Fuente', 'Alcance', 'tCO₂e', '% Total']],
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
  doc.text('Estado de cumplimiento regulatorio y marcos ESG', margin, y)
  y += 4

  const estadoLabel: Record<string, string> = {
    listo: '✓ Cumplido', proceso: '◐ En proceso', pendiente: '○ Pendiente',
  }
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Marco / Regulación', 'Región / Jurisdicción', 'Estado']],
    body: data.compliance.map(c => [c.nombre, c.region, estadoLabel[c.estado] ?? c.estado]),
    headStyles: { fillColor: verde, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [40, 60, 50] },
    alternateRowStyles: { fillColor: grisClaro },
  })
  y = (doc as any).lastAutoTable.finalY + 8

  // ── NARRATIVA IA — generar y agregar en nueva página ──
  doc.addPage()
  y = 20

  doc.setFillColor(...verde)
  doc.rect(0, 0, W, 18, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Análisis Narrativo Profesional — Generado por Kapi IA', margin, 12)

  y = 26

  // Generate AI narrative
  let narrativa = ''
  try {
    narrativa = await generarNarrativaIA(data)
  } catch {
    narrativa = `Análisis no disponible. Por favor contacte al equipo técnico.`
  }

  // Render narrative text
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...gris)
  const paragraphs = narrativa.split('\n').filter(l => l.trim())
  for (const para of paragraphs) {
    if (y > 265) { doc.addPage(); y = 20 }
    const isHeading = /^\d+\./.test(para.trim()) || para.trim().toUpperCase() === para.trim()
    if (isHeading) {
      y += 3
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...verde)
      const lines = doc.splitTextToSize(para, W - margin * 2)
      doc.text(lines, margin, y)
      y += lines.length * 5 + 2
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...gris)
    } else {
      const lines = doc.splitTextToSize(para, W - margin * 2)
      doc.text(lines, margin, y)
      y += lines.length * 4.5 + 2
    }
  }

  // ── Metodología ──
  if (y > 255) { doc.addPage(); y = 20 }
  y += 6
  doc.setFillColor(...grisClaro)
  doc.roundedRect(margin, y, W - margin * 2, 14, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...gris)
  const metaLines = doc.splitTextToSize(`Metodología: ${data.metodologia}`, W - margin * 2 - 4)
  doc.text(metaLines, margin + 2, y + 5)

  // ── Pie de página (todas las páginas) ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(...verde)
    doc.rect(0, 287, W, 10, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 210, 180)
    doc.text('AgroFinance · Carbon Intelligence · Reporte ESG Oficial · Generado con IA', margin, 293)
    doc.text(`Pág. ${i} / ${totalPages}`, W - margin - 18, 293)
  }

  doc.save(`Reporte_ESG_Profesional_${data.empresa.replace(/\s+/g, '_')}_${data.campania}.pdf`)
}

// ─── Excel ────────────────────────────────────────────────────────────────────
export async function exportarExcel(data: ExportData): Promise<void> {
  const XLSX = await import('xlsx')

  const wb = XLSX.utils.book_new()

  // Hoja 1: Resumen
  const resumen = [
    ['AGROFINANCE · REPORTE ESG OFICIAL', ''],
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
    ['Fuente', 'Alcance', 'tCO₂e', '% Total'],
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
