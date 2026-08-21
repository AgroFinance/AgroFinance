// ============================================================
// AgroFinance — Consumo de agua del piloto (riego + packing/lavado)
// ------------------------------------------------------------
// Complementa pilotData.ts (que no incluye agua) con cifras sintéticas
// pero correlacionadas a los mismos campos/packing reales del piloto:
// riego por goteo tecnificado en costa peruana ronda 7,500–9,500 m³/ha/año
// para palta y mango (referencia de manejo agronómico típico de la zona),
// y el lavado/prefrío en packing usa del orden de 2.5–4 m³ por tonelada
// procesada. Sirve para que Huella Hídrica y el reconocimiento de columnas
// tengan algo real que leer en el set de datos precargado, no solo en
// archivos que suba el usuario.
// ============================================================

import { campos, packing } from './pilotData'

export type AguaCampoRow = { idCampo: string; aguaRiegoM3: number }
export type AguaPackingRow = { idPacking: string; aguaLavadoM3: number }

// Multiplicador determinístico por campo (evita que todos den el mismo
// ratio exacto — sería sospechoso en una auditoría real de datos).
const variacion = (semilla: string) => {
  let h = 0
  for (let i = 0; i < semilla.length; i++) h = (h * 31 + semilla.charCodeAt(i)) % 997
  return 0.85 + (h % 100) / 333 // ~0.85–1.15
}

export const aguaCampos: AguaCampoRow[] = campos.map((c) => {
  const base = c.cultivo === 'Palta Hass' ? 8600 : 7900 // m3/ha/año, palta riega más que mango
  return { idCampo: c.idCampo, aguaRiegoM3: Math.round(c.hectareas * base * variacion(c.idCampo)) }
})

export const aguaPacking: AguaPackingRow[] = packing.map((p) => ({
  idPacking: p.idPacking,
  aguaLavadoM3: Math.round(p.toneladasProcesadas * 3.1 * variacion(p.idPacking)),
}))
