import { escapeHtml, renderHtmlReportToPdf } from './htmlPdfRenderer'
import { reportShell } from './reportStyles'
import { MECANISMO_META, type Mecanismo } from '../emissionFactors'
import type { Producto } from '../analyticsData'

export interface PcfReportInput {
  empresa: string
  producto: Producto
  pais?: string
}

const fmt = (n: number, d = 2) => n.toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d })

function buildHtml(input: PcfReportInput): string {
  const { empresa, producto, pais = 'Perú' } = input
  const intensidad = producto.intensidad
  const kgTotalPorKilo = intensidad > 0 ? intensidad : 0.0001

  const mecanismos = (Object.entries(producto.desgloseMecanismo) as [Mecanismo, number | null][])
    .filter(([, kgTotal]) => kgTotal !== null && kgTotal > 0)
    .map(([mec, kgTotal]) => {
      const porKilo = (kgTotal as number) / Math.max(producto.kilosExportados, 1)
      return { mec, porKilo, pct: (porKilo / kgTotalPorKilo) * 100 }
    })
    .sort((a, b) => b.porKilo - a.porKilo)
  const maxPorKilo = Math.max(...mecanismos.map((m) => m.porKilo), 0.0001)

  const diffPct = producto.benchmark > 0 ? ((intensidad - producto.benchmark) / producto.benchmark) * 100 : 0
  const mejorQueBenchmark = diffPct <= 0

  return reportShell(`
<div class="page cover">
  <div class="brand">AgroFinance</div>
  <div class="report-type">Reporte Técnico — Huella de Producto</div>
  <div class="client">${escapeHtml(empresa)}</div>
  <div class="product">${escapeHtml(producto.nombre)}</div>
  <div class="origin">${escapeHtml(pais)}</div>
  <div class="big-number">${fmt(intensidad, 2)}</div>
  <div class="unit">kg CO₂e / kg</div>
  <div class="meta">
    Cradle-to-farm-gate &nbsp;|&nbsp; ISO 14067:2018 &nbsp;|&nbsp; ${escapeHtml(producto.periodoActual)}<br>
    Generado por AgroFinance
  </div>
</div>

<div class="page content">
  <h2>Resultados por mecanismo</h2>
  <div class="subtitle">Desglose de la huella de ${fmt(intensidad, 2)} kg CO₂e por cada kilogramo de ${escapeHtml(producto.nombre.toLowerCase())}</div>

  <div class="bar-chart">
    ${mecanismos.map(({ mec, porKilo, pct }) => {
      const meta = MECANISMO_META[mec]
      const width = Math.max(6, (porKilo / maxPorKilo) * 100)
      return `<div class="bar-row">
        <div class="bar-label">${escapeHtml(meta.label)}</div>
        <div class="bar-track"><div class="bar-fill major" style="width:${width}%"><span class="bar-value">${fmt(porKilo, 3)}</span></div></div>
        <div class="bar-pct">${fmt(pct, 2)}%</div>
      </div>`
    }).join('')}
  </div>

  <div class="total-box"><div class="label">Huella total por kilogramo</div><div class="value">${fmt(intensidad, 2)} kg CO₂e</div></div>

  <div class="insight-box">
    <div class="label">Lectura clave</div>
    <p>${mecanismos[0] ? `El mecanismo <strong>${escapeHtml(MECANISMO_META[mecanismos[0].mec].label)}</strong> concentra el ${fmt(mecanismos[0].pct, 0)}% de la huella — ${escapeHtml(MECANISMO_META[mecanismos[0].mec].detalle)}.` : 'Sin mecanismos con emisión registrada en este período.'}</p>
  </div>

  <div class="benchmark">
    <h4>Benchmark comparativo</h4>
    <div class="bm-row">
      <div class="bm-label">${escapeHtml(empresa)}</div>
      <div class="bm-bar-track"><div class="bm-bar-fill" style="width:${Math.min(100, (intensidad / Math.max(intensidad, producto.benchmark, 0.01)) * 100)}%; background:var(--forest);"></div></div>
      <div class="bm-val">${fmt(intensidad, 2)}</div>
    </div>
    <div class="bm-row">
      <div class="bm-label">Benchmark sectorial</div>
      <div class="bm-bar-track"><div class="bm-bar-fill" style="width:${Math.min(100, (producto.benchmark / Math.max(intensidad, producto.benchmark, 0.01)) * 100)}%; background:var(--sage);"></div></div>
      <div class="bm-val">${fmt(producto.benchmark, 2)}</div>
    </div>
    <div class="bm-row">
      <div class="bm-label" style="color:var(--forest);font-weight:600;">Diferencia</div>
      <div class="bm-bar-track" style="background:transparent;"></div>
      <div class="bm-val"><span class="tag" style="${mejorQueBenchmark ? '' : 'background:var(--gold);'}">${diffPct > 0 ? '+' : ''}${fmt(diffPct, 0)}% ${mejorQueBenchmark ? '✓' : ''}</span></div>
    </div>
  </div>

  <div class="page-footer"><span>AgroFinance — Reporte PCF</span><span>${escapeHtml(empresa)} | ${escapeHtml(producto.nombre)}, ${escapeHtml(pais)}</span><span>2 / 3</span></div>
</div>

<div class="page content">
  <h2>Alcance y metodología</h2>
  <div class="subtitle">Definiciones técnicas del estudio</div>

  <div class="scope-grid">
    <div class="scope-item"><h4>Unidad funcional</h4><p>1 kilogramo (kg) de ${escapeHtml(producto.nombre.toLowerCase())} exportado</p></div>
    <div class="scope-item"><h4>Límites del sistema</h4><p>Cradle-to-farm-gate: desde la producción de insumos hasta la puerta de finca</p></div>
    <div class="scope-item"><h4>Volumen exportado</h4><p>${fmt(producto.kilosExportados, 0)} kg — campaña ${escapeHtml(producto.periodoActual)}</p></div>
    <div class="scope-item"><h4>Huella total del producto</h4><p>${fmt(producto.huellaTotal, producto.huellaTotal < 10 ? 3 : 0)} tCO₂e en el período</p></div>
    <div class="scope-item"><h4>CO₂ biogénico</h4><p>No incluido — se libera en digestión o descomposición</p></div>
    <div class="scope-item"><h4>GWP₁₀₀</h4><p>CH₄ = 27.2 &nbsp;|&nbsp; N₂O = 273<br><span style="font-size:11px;color:var(--light);">IPCC AR6, Forster et al. 2021</span></p></div>
  </div>

  <div class="gold-box">
    <p><span class="star">★</span> <strong>Sobre la fuente de datos:</strong> este cálculo se basa en los archivos que ${escapeHtml(empresa)} cargó en AgroFinance (facturas SUNAT XML UBL 2.1, control de campo, packing) — no en promedios sectoriales genéricos.</p>
  </div>

  <div style="text-align:center; margin-top:80px; padding-top:40px; border-top:1px solid #E8E8E8;">
    <div style="color:var(--sage); font-size:14px; letter-spacing:3px; text-transform:uppercase; font-weight:500; margin-bottom:8px;">AgroFinance</div>
    <div style="color:var(--light); font-size:13px; line-height:1.8;">Medimos, centralizamos y automatizamos tu huella de carbono<br>con el reporte listo para que tu verificación sea más rápida.</div>
  </div>

  <div class="page-footer"><span>AgroFinance — Reporte PCF</span><span>${escapeHtml(empresa)} | ${escapeHtml(producto.nombre)}, ${escapeHtml(pais)}</span><span>3 / 3</span></div>
</div>
`)
}

export async function generarReportePCF(input: PcfReportInput): Promise<void> {
  const html = buildHtml(input)
  await renderHtmlReportToPdf(html, `PCF_${input.producto.nombre.replace(/\s+/g, '_')}_${input.empresa.replace(/\s+/g, '_')}.pdf`)
}
