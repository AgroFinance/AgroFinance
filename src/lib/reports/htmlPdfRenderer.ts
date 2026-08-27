import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// ============================================================
// Renderizador HTML → PDF compartido por los reportes de diseño
// (corporativo, PCF, SLL). En vez de dibujar cada reporte a mano con las
// primitivas de jsPDF (rectángulos, texto posicionado a pulso — lo que
// hace pdfGenerator.ts), estos reportes se escriben como HTML/CSS real
// — el mismo diseño que aprobó el negocio — y esta función los rasteriza
// página por página. Cada `.page` del HTML se vuelve una página A4 del
// PDF: así el layout con gradientes, fuentes y donuts sale idéntico al
// diseño en vez de una aproximación con formas de jsPDF.
// ============================================================

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297

export function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function renderHtmlReportToPdf(html: string, filename: string): Promise<void> {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-99999px'
  container.style.top = '0'
  container.style.width = `${A4_WIDTH_MM}mm`
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    const pageEls = Array.from(container.querySelectorAll<HTMLElement>('.page'))
    if (pageEls.length === 0) throw new Error('La plantilla del reporte no tiene páginas (.page).')

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

    for (let i = 0; i < pageEls.length; i++) {
      const canvas = await html2canvas(pageEls[i], {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })
      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      if (i > 0) doc.addPage()
      doc.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM)
    }

    doc.save(filename)
  } finally {
    document.body.removeChild(container)
  }
}
