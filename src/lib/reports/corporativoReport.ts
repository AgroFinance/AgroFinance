import { escapeHtml, renderHtmlReportToPdf } from './htmlPdfRenderer'
import { reportShell } from './reportStyles'
import { FUENTE_META, type FuenteEmision } from '../emissionFactors'
import type { HuellaConsolidada } from '../huellaConsolidada'
import type { FuenteDatos } from '../datosPrueba'

export interface CorporativoReportInput {
  empresa: string
  campania: string
  huella: HuellaConsolidada
  fuentes: FuenteDatos[]
}

const SCOPE_COLOR: Record<1 | 2 | 3, string> = { 1: '#1B4332', 2: '#2D6A4F', 3: '#52B788' }

const fmt = (n: number, d = 1) => n.toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d })

/** Confianza del dato: alta si viene de un XML SUNAT (comprobante electrónico), media si viene de Excel/CSV cargado a mano. */
function confianzaDe(archivo: string): { label: string; color: string } {
  return archivo.toLowerCase().endsWith('.xml')
    ? { label: 'Alta', color: 'var(--sage)' }
    : { label: 'Media', color: 'var(--gold)' }
}

function buildHtml(input: CorporativoReportInput): string {
  const { empresa, campania, huella, fuentes } = input
  const total = huella.huellaTotalTon
  const { s1, s2, s3 } = huella.scopes
  const pctS1 = total > 0 ? (s1 / total) * 100 : 0
  const pctS2 = total > 0 ? (s2 / total) * 100 : 0
  const pctS3 = total > 0 ? (s3 / total) * 100 : 0
  const acumS1 = pctS1
  const acumS2 = pctS1 + pctS2

  const filas = (Object.entries(huella.desglose) as [FuenteEmision, number][])
    .filter(([, ton]) => ton > 0)
    .sort((a, b) => b[1] - a[1])
  const maxFila = Math.max(...filas.map(([, ton]) => ton), 0.0001)

  const evidencia = fuentes.filter((f) => !f.isDemo || fuentes.every((x) => x.isDemo)).slice(0, 12)

  return reportShell(`
<div class="page cover">
  <div class="brand">AgroFinance</div>
  <div class="report-type">Reporte de Huella Corporativa</div>
  <div class="client">${escapeHtml(empresa)}</div>
  <div class="product">Huella de Carbono<br>Corporativa</div>
  <div class="origin">Alcance 1 · 2 · 3 &nbsp;|&nbsp; Perú</div>
  <div class="big-number">${fmt(total, total < 10 ? 3 : 0)}</div>
  <div class="unit">tCO₂e totales</div>
  <div class="scopes-preview">
    <div class="scope-pill"><div class="val">${fmt(s1, s1 < 10 ? 2 : 0)}</div><div class="lbl">Alcance 1</div></div>
    <div class="scope-pill"><div class="val">${fmt(s2, s2 < 10 ? 2 : 0)}</div><div class="lbl">Alcance 2</div></div>
    <div class="scope-pill"><div class="val">${fmt(s3, s3 < 10 ? 2 : 0)}</div><div class="lbl">Alcance 3</div></div>
  </div>
  <div class="meta">
    NTP ISO 14064-1:2016 &nbsp;|&nbsp; GHG Protocol Corporate Standard<br>
    Campaña ${escapeHtml(campania)}<br>
    Generado por AgroFinance
  </div>
</div>

<div class="page content">
  <h2>Emisiones por alcance</h2>
  <div class="subtitle">Desglose de las ${fmt(total, total < 10 ? 3 : 0)} tCO₂e emitidas durante la campaña ${escapeHtml(campania)}</div>

  <div class="scope-blocks">
    <div class="scope-block s1"><div class="lbl">Alcance 1</div><div class="num">${fmt(s1, s1 < 10 ? 2 : 0)}</div><div class="desc">tCO₂e<br>Emisiones directas</div></div>
    <div class="scope-block s2"><div class="lbl">Alcance 2</div><div class="num">${fmt(s2, s2 < 10 ? 2 : 0)}</div><div class="desc">tCO₂e<br>Electricidad</div></div>
    <div class="scope-block s3"><div class="lbl">Alcance 3</div><div class="num">${fmt(s3, s3 < 10 ? 2 : 0)}</div><div class="desc">tCO₂e<br>Cadena de valor</div></div>
  </div>

  <div class="donut-section">
    <div class="donut-visual" style="background:conic-gradient(${SCOPE_COLOR[1]} 0% ${acumS1}%, ${SCOPE_COLOR[2]} ${acumS1}% ${acumS2}%, ${SCOPE_COLOR[3]} ${acumS2}% 100%);">
      <div class="donut-hole"><div class="num">${fmt(total, total < 10 ? 2 : 0)}</div><div class="lbl">tCO₂e</div></div>
    </div>
    <div class="donut-legend">
      <div class="legend-row"><div class="legend-dot" style="background:${SCOPE_COLOR[1]}"></div><div class="legend-text">Alcance 1 — Directas</div><div class="legend-val">${fmt(s1, 1)}</div><div class="legend-pct">${fmt(pctS1, 0)}%</div></div>
      <div class="legend-row"><div class="legend-dot" style="background:${SCOPE_COLOR[2]}"></div><div class="legend-text">Alcance 2 — Electricidad</div><div class="legend-val">${fmt(s2, 1)}</div><div class="legend-pct">${fmt(pctS2, 0)}%</div></div>
      <div class="legend-row"><div class="legend-dot" style="background:${SCOPE_COLOR[3]}"></div><div class="legend-text">Alcance 3 — Cadena de valor</div><div class="legend-val">${fmt(s3, 1)}</div><div class="legend-pct">${fmt(pctS3, 0)}%</div></div>
    </div>
  </div>

  <div class="insight-box">
    <div class="label">Lectura clave</div>
    <p>El <strong>${fmt(pctS3, 0)}% de las emisiones</strong> proviene del ${huella.hotspot.label} — hotspot identificado por AgroFinance a partir de los archivos cargados por ${escapeHtml(empresa)}.</p>
  </div>

  <div class="page-footer"><span>AgroFinance — Huella Corporativa</span><span>${escapeHtml(empresa)} | Campaña ${escapeHtml(campania)}</span><span>2 / 4</span></div>
</div>

<div class="page content">
  <h2>Desglose por fuente de emisión</h2>
  <div class="subtitle">Cada fuente calculada a partir de los archivos que ${escapeHtml(empresa)} cargó en AgroFinance</div>

  <div class="bar-chart">
    ${filas.map(([fuente, ton]) => {
      const meta = FUENTE_META[fuente]
      const pct = total > 0 ? (ton / total) * 100 : 0
      const width = Math.max(6, (ton / maxFila) * 100)
      return `<div class="bar-row">
        <div class="bar-label">${escapeHtml(meta.label)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${width}%;background:${SCOPE_COLOR[meta.scope]};"><span class="bar-value">${fmt(ton, ton < 1 ? 3 : 1)}</span></div></div>
        <div class="bar-pct">${fmt(pct, 1)}%</div>
      </div>`
    }).join('')}
  </div>

  <div class="total-box"><div class="label">Huella corporativa total — Campaña ${escapeHtml(campania)}</div><div class="value">${fmt(total, total < 10 ? 3 : 0)} tCO₂e</div></div>

  <div class="gold-box"><p><strong>★ Trazabilidad AgroFinance:</strong> cada barra viene de un archivo cargado por ${escapeHtml(empresa)} — factura SUNAT, control de campo o packing — no de un promedio sectorial genérico.</p></div>

  <div class="page-footer"><span>AgroFinance — Huella Corporativa</span><span>${escapeHtml(empresa)} | Campaña ${escapeHtml(campania)}</span><span>3 / 4</span></div>
</div>

<div class="page content">
  <h2>Evidencia por fuente de datos</h2>
  <div class="subtitle">Log de trazabilidad — cada número vinculado a su archivo de origen</div>

  <table class="clean-table" style="font-size:11px;">
    <thead><tr><th>Archivo</th><th>Área</th><th>Emisiones (kg CO₂e)</th><th>Confianza</th></tr></thead>
    <tbody>
      ${evidencia.map((f) => {
        const conf = confianzaDe(f.archivo)
        const emision = f.resumen?.emisionKg ?? 0
        return `<tr>
          <td>${escapeHtml(f.archivo)}</td>
          <td>${escapeHtml(f.area)}</td>
          <td>${fmt(emision, 0)}</td>
          <td style="color:${conf.color};font-weight:600;">${conf.label}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>

  <div class="gold-box"><p><strong>★ Sobre la confianza del dato:</strong> "Alta" = factura SUNAT electrónica en XML UBL 2.1, leída directamente sin transcripción manual. "Media" = archivo Excel/CSV cargado por el equipo de campo.</p></div>

  <div style="text-align:center; margin-top:60px; padding-top:30px; border-top:1px solid #E8E8E8;">
    <div style="color:var(--sage); font-size:14px; letter-spacing:3px; text-transform:uppercase; font-weight:500; margin-bottom:8px;">AgroFinance</div>
    <div style="color:var(--light); font-size:13px; line-height:1.8;">Medimos, centralizamos y automatizamos tu huella de carbono<br>con el reporte listo para que tu verificación sea más rápida.</div>
  </div>

  <div class="page-footer"><span>AgroFinance — Huella Corporativa</span><span>${escapeHtml(empresa)} | Campaña ${escapeHtml(campania)}</span><span>4 / 4</span></div>
</div>
`)
}

export async function generarReporteCorporativo(input: CorporativoReportInput): Promise<void> {
  const html = buildHtml(input)
  await renderHtmlReportToPdf(html, `Huella_Corporativa_${input.empresa.replace(/\s+/g, '_')}.pdf`)
}
