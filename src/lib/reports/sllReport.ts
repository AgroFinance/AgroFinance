import { escapeHtml, renderHtmlReportToPdf } from './htmlPdfRenderer'
import { reportShell } from './reportStyles'

export interface SllReportInput {
  empresa: string
  campania: string
  /** Línea de crédito vigente, en USD — la declara el usuario, no se inventa. */
  lineaCreditoUSD: number
  /** Tasa de interés actual, en %. */
  tasaActualPct: number
  /** Descuento esperado del programa SLL, en puntos base (bps). Default: 35 bps, conservador frente a los 60-70 bps que reportan programas verificados. */
  descuentoBps?: number
  /** Costo anual estimado de la plataforma, en USD — para el ROI. */
  costoPlataformaUSD?: number
}

const fmt = (n: number, d = 0) => n.toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d })
const usd = (n: number, d = 0) => `US$ ${fmt(n, d)}`

function buildHtml(input: SllReportInput): string {
  const {
    empresa, campania, lineaCreditoUSD, tasaActualPct,
    descuentoBps = 35, costoPlataformaUSD = 6000,
  } = input

  const descuentoPct = descuentoBps / 100
  const tasaNuevaPct = Math.max(0, tasaActualPct - descuentoPct)
  const costoActual = lineaCreditoUSD * (tasaActualPct / 100)
  const costoNuevo = lineaCreditoUSD * (tasaNuevaPct / 100)
  const ahorroAnual = costoActual - costoNuevo
  const roiX = costoPlataformaUSD > 0 ? ahorroAnual / costoPlataformaUSD : 0
  const mesesROI = ahorroAnual > 0 ? (costoPlataformaUSD / ahorroAnual) * 12 : 0
  const investPct = Math.min(90, Math.max(10, (costoPlataformaUSD / Math.max(costoPlataformaUSD + ahorroAnual, 1)) * 100))

  const escenarios = [0.5, 1, 1.5, 2.5, 4].map((mult) => {
    const linea = lineaCreditoUSD * mult
    const ahorro = linea * (descuentoPct / 100)
    return { linea, ahorro }
  })

  return reportShell(`
<div class="page cover">
  <div class="brand">AgroFinance</div>
  <div class="report-type">Reporte Financiero</div>
  <div class="client">${escapeHtml(empresa)}</div>
  <div class="product">Impacto Financiero de la<br>Gestión Ambiental</div>
  <div class="origin">Sustainability-Linked Loan (SLL)</div>
  <div class="savings-label">Ahorro anual estimado</div>
  <div class="big-number">${usd(ahorroAnual)}</div>
  <div class="unit">USD por año en intereses</div>
  <div class="summary-row">
    <div class="summary-item"><div class="val">-${fmt(descuentoBps, 0)} bps</div><div class="lbl">Descuento en tasa</div></div>
    <div class="summary-item"><div class="val">${fmt(mesesROI, 1)}</div><div class="lbl">Meses para ROI</div></div>
    <div class="summary-item"><div class="val">${usd(lineaCreditoUSD)}</div><div class="lbl">Línea de crédito</div></div>
  </div>
  <div class="meta">Basado en programas SLL de BBVA, BCP y AgroBanco<br>Generado por AgroFinance &nbsp;|&nbsp; Campaña ${escapeHtml(campania)}</div>
</div>

<div class="page content">
  <h2>El costo de no medir</h2>
  <div class="subtitle">Comparación del escenario actual versus el escenario con gestión ambiental documentada</div>

  <div class="compare">
    <div class="compare-box before">
      <div class="tag">Hoy — Sin gestión ambiental</div>
      <div class="row"><span class="lbl">Línea de crédito</span><span class="val">${usd(lineaCreditoUSD)}</span></div>
      <div class="row"><span class="lbl">Tasa de interés</span><span class="val">${fmt(tasaActualPct, 2)}%</span></div>
      <div class="row"><span class="lbl">Descuento ambiental</span><span class="val">Ninguno</span></div>
      <div class="total"><span class="lbl">Costo financiero anual</span><span class="val">${usd(costoActual)}</span></div>
    </div>
    <div class="compare-box after">
      <div class="tag">Con AgroFinance + SLL</div>
      <div class="row"><span class="lbl">Línea de crédito</span><span class="val">${usd(lineaCreditoUSD)}</span></div>
      <div class="row"><span class="lbl">Tasa de interés</span><span class="val">${fmt(tasaNuevaPct, 2)}%</span></div>
      <div class="row"><span class="lbl">Descuento SLL</span><span class="val">-${fmt(descuentoBps, 0)} bps</span></div>
      <div class="total"><span class="lbl">Costo financiero anual</span><span class="val">${usd(costoNuevo)}</span></div>
    </div>
  </div>

  <div class="savings-highlight">
    <div class="label">Diferencia — lo que está dejando de ahorrar</div>
    <div class="amount">${usd(ahorroAnual)}</div>
    <div class="per">por año, todos los años mientras mantenga la línea de crédito</div>
  </div>

  <div class="insight-box">
    <div class="label">En perspectiva</div>
    <p>${usd(ahorroAnual)} al año equivale a <strong>S/ ${fmt(ahorroAnual * 3.8, 0)} anuales</strong> (al tipo de cambio de S/3.80). La gestión ambiental se paga sola.</p>
  </div>

  <div class="page-footer"><span>AgroFinance — Reporte Financiero SLL</span><span>${escapeHtml(empresa)}</span><span>2 / 4</span></div>
</div>

<div class="page content">
  <h2>Retorno de la inversión</h2>
  <div class="subtitle">Cuánto cuesta vs. cuánto ahorra</div>

  <div class="roi-visual">
    <h4>Inversión anual vs. ahorro anual</h4>
    <div class="roi-bar-track">
      <div class="roi-bar-invest" style="width:${investPct}%;left:0;">${usd(costoPlataformaUSD)}</div>
      <div class="roi-bar-save" style="width:${100 - investPct}%;left:${investPct}%;">${usd(ahorroAnual)}</div>
    </div>
    <div class="roi-labels"><span>Inversión en AgroFinance</span><span>Ahorro en intereses SLL</span></div>
  </div>

  <div class="kpi-row">
    <div class="kpi"><div class="num">${fmt(roiX, 1)}x</div><div class="lbl">Retorno sobre<br>la inversión</div></div>
    <div class="kpi"><div class="num">${fmt(mesesROI, 1)}</div><div class="lbl">Meses para<br>recuperar</div></div>
    <div class="kpi"><div class="num">${usd(ahorroAnual - costoPlataformaUSD)}</div><div class="lbl">Ganancia neta<br>anual</div></div>
  </div>

  <h2 style="margin-top:30px;">Cómo funciona el SLL</h2>
  <div class="subtitle">El mecanismo que convierte la gestión ambiental en descuento bancario</div>
  <div class="timeline">
    <div class="timeline-step"><div class="timeline-marker"><div class="timeline-dot"></div><div class="timeline-line"></div></div>
      <div class="timeline-content"><h4>Medir la huella de carbono</h4><p>AgroFinance calcula la huella corporativa (Alcance 1/2/3) bajo NTP ISO 14064-1, leyendo directo de las facturas SUNAT de ${escapeHtml(empresa)}.</p></div></div>
    <div class="timeline-step"><div class="timeline-marker"><div class="timeline-dot"></div><div class="timeline-line"></div></div>
      <div class="timeline-content"><h4>Registrarse en HuellaPerú (Nivel 1)</h4><p>Con el reporte listo, la empresa se registra en la plataforma del MINAM. Gratuito, respuesta en máximo 5 días hábiles.</p></div></div>
    <div class="timeline-step"><div class="timeline-marker"><div class="timeline-dot"></div><div class="timeline-line"></div></div>
      <div class="timeline-content"><h4>Presentar al banco</h4><p>El reporte de huella + el reconocimiento HuellaPerú se presentan como evidencia. BBVA, BCP y AgroBanco tienen programas SLL activos en Perú.</p></div></div>
    <div class="timeline-step"><div class="timeline-marker"><div class="timeline-dot"></div></div>
      <div class="timeline-content"><h4>Obtener el descuento</h4><p>El banco aplica el descuento a la tasa de la línea de crédito desde el siguiente período de pago.</p></div></div>
  </div>

  <div class="page-footer"><span>AgroFinance — Reporte Financiero SLL</span><span>${escapeHtml(empresa)}</span><span>3 / 4</span></div>
</div>

<div class="page content">
  <h2>Escenarios por tamaño de línea</h2>
  <div class="subtitle">El ahorro escala proporcionalmente con el tamaño del crédito</div>

  <table class="clean-table">
    <thead><tr><th>Línea de crédito</th><th>Tasa actual</th><th>Descuento SLL</th><th>Nueva tasa</th><th style="color:#52B788;">Ahorro anual</th></tr></thead>
    <tbody>
      ${escenarios.map(({ linea, ahorro }) => `<tr>
        <td${linea === lineaCreditoUSD ? ' style="font-weight:700;"' : ''}>${usd(linea)}</td>
        <td>${fmt(tasaActualPct, 2)}%</td>
        <td>-${fmt(descuentoBps, 0)} bps</td>
        <td>${fmt(tasaNuevaPct, 2)}%</td>
        <td style="color:var(--forest);font-weight:700;">${usd(ahorro)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="gold-box">
    <p><strong>★ Nota:</strong> el descuento de ${fmt(descuentoBps, 0)} bps es conservador — programas verificados reportan descuentos de 60-70 bps para empresas con gestión ambiental verificada.</p>
  </div>

  <div class="insight-box" style="margin-top:20px; border-left-color:var(--forest);">
    <div class="label" style="color:var(--forest);">La conclusión</div>
    <p>La gestión ambiental con AgroFinance no es un gasto — es la inversión con el ROI más rápido que ${escapeHtml(empresa)} puede hacer este año. Se paga sola en ${fmt(mesesROI, 1)} meses y genera ahorro neto cada año que se mantenga la línea de crédito.</p>
  </div>

  <div style="text-align:center; margin-top:40px; padding-top:20px; border-top:1px solid #E8E8E8;">
    <div style="color:var(--sage); font-size:14px; letter-spacing:3px; text-transform:uppercase; font-weight:500; margin-bottom:8px;">AgroFinance</div>
    <div style="color:var(--light); font-size:13px; line-height:1.8;">Medimos, centralizamos y automatizamos tu huella de carbono<br>con el reporte listo para que tu verificación sea más rápida.</div>
  </div>

  <div class="page-footer"><span>AgroFinance — Reporte Financiero SLL</span><span>${escapeHtml(empresa)}</span><span>4 / 4</span></div>
</div>
`)
}

export async function generarReporteSLL(input: SllReportInput): Promise<void> {
  const html = buildHtml(input)
  await renderHtmlReportToPdf(html, `SLL_${input.empresa.replace(/\s+/g, '_')}.pdf`)
}
