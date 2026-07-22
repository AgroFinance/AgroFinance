// Cerebro de Kapi reutilizable para WhatsApp: IA (Gemini), parser de registros y
// formato de mensajes. Mantiene paridad con la lógica del Copilot web.

// ─── Gemini ───────────────────────────────────────────────────────────────
const GEMINI_API_KEYS = (process.env.GEMINI_API_KEYS || [
  'AQ.Ab8RN6IE6QHUThKGVePhMxjuimiqqJr0gYHjYsC2Qj82zcsH6Q',
  'AIzaSyBmrQXJ7OFRMEsPKqTPTmEgalEap64e2uQ',
].join(',')).split(',').map(s => s.trim()).filter(Boolean)

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

async function callGeminiAI(prompt) {
  for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
    const key = GEMINI_API_KEYS[i]
    try {
      const res = await fetch(`${GEMINI_ENDPOINT}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
        }),
      })
      if ([429, 403, 400, 503].includes(res.status)) continue
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      const result = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (result) return result
    } catch (e) {
      console.warn(`[Gemini] key ${i + 1} falló: ${e.message}`)
    }
  }
  return null
}

function buildSystemPrompt(userQuestion) {
  return `
Eres Kapi, un carismático capibara asistente de inteligencia climática especializado en
agricultura y finanzas sostenibles (Green Finance) para la cooperativa AgroFinance.
Hablas por WhatsApp: respuestas claras, cálidas y BREVES (máx ~6 líneas), con guiños sutiles
de que eres un capibara. Usa *negritas de WhatsApp* (un solo asterisco) y viñetas con "-".

Temas que dominas: huella de carbono (Scope 1/2/3), cumplimiento ESG (CSRD/EUDR, ISO 14064,
HC Perú), créditos verdes y huella hídrica de agroexportadoras.

Si el usuario quiere GUARDAR un dato operacional (almacén, cosecha, envío, insumo), recuérdale
que puede escribir por ejemplo: "Registrar 500 kg de palta en almacén Norte".

Pregunta del usuario: "${userQuestion}"
`
}

// ─── Parser de registros (puerto del Copilot) ──────────────────────────────
const UNIDADES = {
  kg: 'kg', kilo: 'kg', kilos: 'kg', kilogramo: 'kg', kilogramos: 'kg',
  t: 't', ton: 't', tonelada: 't', toneladas: 't',
  caja: 'cajas', cajas: 'cajas', jaba: 'jabas', jabas: 'jabas',
  l: 'L', litro: 'L', litros: 'L',
  u: 'u', unidad: 'u', unidades: 'u', saco: 'sacos', sacos: 'sacos',
}

const REGISTRO_TRIGGERS = /^\s*(registr\w*|anota|apunta|agrega|añade|guarda|ingresa)\b/i

const TIPO_LABEL = {
  almacen: 'Almacén', cosecha: 'Cosecha', envio: 'Envío', insumo: 'Insumo', otro: 'Otro',
}

function parseRegistro(text) {
  const lower = text.toLowerCase()
  const numMatch = lower.match(
    /(\d+(?:[.,]\d+)?)\s*(kilogramos|kilogramo|kilos|kilo|kg|toneladas|tonelada|ton|t|cajas|caja|jabas|jaba|sacos|saco|litros|litro|l|unidades|unidad|u)?\b/
  )
  if (!numMatch) return null

  const cantidad = parseFloat(numMatch[1].replace(',', '.'))
  if (!isFinite(cantidad) || cantidad <= 0) return null
  const unidad = UNIDADES[numMatch[2] || ''] || 'kg'

  let tipo = 'almacen'
  if (/(cosech|recolect)/.test(lower)) tipo = 'cosecha'
  else if (/(env[íi]o|despach|export|embarc|contenedor)/.test(lower)) tipo = 'envio'
  else if (/(insumo|fertiliz|abono|pesticida|combustible|di[ée]sel)/.test(lower)) tipo = 'insumo'

  let producto = 'Producto'
  const deMatch = lower.match(
    /\bde\s+([a-záéíóúñ][a-záéíóúñ ]*?)(?:\s+(?:en|al|para|hacia|con|almac|del|hoy|cosechad\w*|recolectad\w*|despachad\w*|export\w*|embarcad\w*|como)\b|[.,]|$)/
  )
  if (deMatch) producto = deMatch[1].trim()

  let almacen = ''
  const almMatch = lower.match(/almac[eé]n\s+([a-z0-9áéíóúñ ]+?)(?:\s+(?:con|para|de|hoy)\b|[.,]|$)/)
  if (almMatch) almacen = almMatch[1].trim()

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  return {
    tipo,
    producto: cap(producto),
    cantidad,
    unidad,
    almacen: almacen ? cap(almacen) : null,
    fecha: new Date().toISOString(),
  }
}

// Convierte el markdown del web (**negrita**) al de WhatsApp (*negrita*)
function toWhatsApp(text) {
  return String(text || '').replace(/\*\*(.+?)\*\*/g, '*$1*')
}

module.exports = {
  callGeminiAI,
  buildSystemPrompt,
  parseRegistro,
  REGISTRO_TRIGGERS,
  TIPO_LABEL,
  toWhatsApp,
}
