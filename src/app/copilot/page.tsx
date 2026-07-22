'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Sparkles, TrendingDown, AlertTriangle,
  Leaf, Globe2, FileText, BarChart3, ArrowRight, Mic, ImagePlus,
  MessageSquare, ClipboardList, PackagePlus, Check, Loader2, Square, X,
  FolderOpen, FileSpreadsheet, FilePdf, Zap
} from 'lucide-react'
import DashboardShell from '@/components/layout/DashboardShell'
import CapybaraBot from '@/components/mascot/CapybaraBot'
import { cooperativa, certificarCooperativa } from '@/lib/pilotEngine'
import { saveAnalysisToFirestore } from '@/lib/firebaseService'
import {
  saveChatMessageToFirestore, getChatHistoryFromFirestore,
  saveRegistroToFirestore, getRegistrosFromFirestore, type Registro
} from '@/lib/firebaseService'
import { startRecording, type Recorder } from '@/lib/speech'
import { playKapiNotification } from '@/lib/notificationSound'

type Message = {
  role: 'user' | 'ai'
  content: string
  time: string
  type?: 'text' | 'insight' | 'alert'
  imageUrl?: string
  showAutoload?: boolean
}

const initialMessages: Message[] = [
  {
    role: 'ai',
    content: '¡Hola! Soy **Kapi**, tu asistente de inteligencia climática 🌱\n\nEstoy conectado a tus datos ESG y puedo ayudarte a:\n- Analizar tus emisiones Scope 1, 2 y 3\n- Generar reportes HC Perú automáticamente\n- Identificar oportunidades de reducción de carbono\n- Responder preguntas sobre tu cumplimiento ESG\n\n¿Por dónde empezamos?',
    time: 'Ahora',
    type: 'text',
  },
]

const suggestedQuestions = [
  '¿Cuál es mi huella de carbono total?',
  'Analiza mis emisiones Scope 3',
  '¿Cómo mejorar mi score ESG?',
  'Genera reporte HC Perú',
  '¿Qué es el GHG Protocol?',
  '¿Cómo acceder a créditos verdes?',
]

const aiResponses: Record<string, string> = {
  'huella de carbono total': `📊 **Huella de Carbono Total de la Cooperativa:**
  
Tus emisiones totales acumuladas en esta campaña son de **127 tCO₂e**.
- **Scope 1 (Directo):** 2.8 tCO₂e (2.2% del total) — Principalmente uso de diésel agrícola y fertilización con urea.
- **Scope 2 (Indirecto por energía):** 2.0 tCO₂e (1.6% del total) — Consumo de energía eléctrica en riego tecnificado y packing.
- **Scope 3 (Cadena de valor):** 122.5 tCO₂e (96.2% del total) — Mayormente impulsado por el transporte marítimo hacia destinos internacionales.
  
🐾 *Kapi-Tip:* Tu hotspot crítico es el **Transporte Marítimo** con el **86.6%** de la huella total. Reducir las distancias o negociar con navieras con certificación climática es clave.`,

  'scope 1': `🌱 **Análisis de Emisiones Scope 1 (Directas):**
  
Tus emisiones de Scope 1 suman **2.8 tCO₂e**.
- **Diésel Agrícola:** Consumo de maquinaria para tractores y preparación de campos.
- **Fertilización de Suelos:** Aplicación de urea y fertilizantes nitrogenados que liberan óxido nitroso (N₂O), un gas con un potencial de calentamiento global 298 veces mayor que el CO₂.
  
🐾 *Recomendación de Kapi:* Transicionar gradualmente a biofertilizantes orgánicos y optimizar el uso de maquinaria reducirá este alcance de forma subsiguiente.`,

  'scope 2': `⚡ **Análisis de Emisiones Scope 2 (Indirectas por Energía):**
  
Tus emisiones de Scope 2 suman **2.0 tCO₂e**.
- **Riego Tecnificado:** Consumo eléctrico de las bombas de agua en los campos fijos.
- **Planta de Packing:** Consumo de energía para el procesamiento, selección y refrigeración de la fruta (palta y mango).
  
🐾 *Recomendación de Kapi:* Implementar paneles solares fotovoltaicos para alimentar las bombas de riego y certificar la planta de packing con energía 100% renovable (I-RECs) neutralizará este alcance a cero.`,

  'scope 3': `🚢 **Análisis de Emisiones Scope 3 (Cadena de Valor):**
  
Tus emisiones de Scope 3 son el principal componente con **122.5 tCO₂e** (96.2% de la huella total).
- **Transporte Terrestre:** Camiones desde los campos de las mypes hacia la planta de packing y luego al puerto del Callao/Paita.
- **Transporte Marítimo:** Envíos refrigerados hacia los mercados de destino (Europa y Norteamérica).
  
🐾 *Recomendación de Kapi:* Es nuestro mayor hotspot. Te sugiero preferir navieras asociadas a la coalición *Getting to Zero* y optimizar la capacidad de carga por contenedor para reducir el impacto unitario.`,

  'score esg': `⭐ **Score ESG actual de AgroFinance: 87/100 (Calificación A - Excelente):**
  
- **Dimensión Ambiental (E):** 87/100 (Fuerte desempeño en cálculo de huella de carbono real por productor).
- **Dimensión Social (S):** 72/100 (Oportunidad de mejora en el onboarding y capacitación de pequeños productores).
- **Dimensión Gobernanza (G):** 91/100 (Transparencia en auditorías y trazabilidad de datos de packing y exportación).
  
🐾 *Kapi-Tip:* Si logramos integrar la certificación del banco BBVA, tu score subirá a **A+ (92/100)**, consolidándote como líder agroexportador sostenible.`,

  'credito verde': `💵 **Financiamiento Verde y Créditos Sostenibles:**
  
Actualmente, AgroFinance tiene un **Ahorro Potencial de US$ 99,625 /año** en costos financieros.
- **BBVA SLL (Sustainability-Linked Loan):** Ofrece una reducción de hasta **0.85%** en la tasa de interés si certificas la huella del 90% de tus productores.
- **Banco Agrario / COFIDE:** Línea verde con descuento del **0.50%** en tasas activas para adquisición de tecnología de riego eficiente.
  
🐾 *Kapi-Tip:* Completar la carga de datos del 100% de tus productores desbloqueará estas tasas preferenciales de inmediato.`,

  'cumplimiento': `📋 **Estado de Cumplimiento Regulatorio (4/5 Completados):**
  
- **CSRD / EUDR (Unión Europea):** ✅ **Cumplido**. Trazabilidad y geolocalización de parcelas libres de deforestación listas.
- **Retailer Target (Tesco):** ✅ **Cumplido**. Emisiones por debajo del límite máximo de 0.68 kgCO₂e/kg.
- **ISO 14064 (Gases de Efecto Invernadero):** ✅ **Cumplido**. Inventario estructurado bajo GHG Protocol.
- **MINAM Perú (Huella de Carbono Perú):** ✅ **Cumplido**. Reporte Q3 listo para registro en el ministerio.
- **BBVA SLL (Certificación de Finanzas):** ⚠️ **Pendiente**. Requiere auditoría de la reducción anual.
  
🐾 *Kapi-Tip:* Estamos en un excelente nivel técnico de cumplimiento, listos para auditoría internacional.`,

  'agua': `💧 **Huella Hídrica Estimada:**
  
El consumo estimado de agua para esta campaña es de **1.42 m³ por kilogramo** de fruta exportada.
- **Palta Hass:** 1.55 m³/kg (Riego intensivo en época de crecimiento).
- **Mango Kent:** 1.25 m³/kg (Consumo moderado).
  
🐾 *Kapi-Tip:* La implementación de sensores de humedad en suelo y riego por goteo automatizado puede reducir esta huella en un **12%** sin afectar el rendimiento del cultivo.`,

  'mitigacion': `🌱 **Plan de Mitigación y Descarbonización Recomendado:**
  
Para reducir tu huella total de **127 tCO₂e**, te propongo las siguientes acciones de alto impacto:
1. **Navieras Sostenibles:** Transicionar el 50% de las exportaciones a navieras con biocombustibles (potencial de ahorro: 25 tCO₂e).
2. **Energía Solar en Packing:** Instalar un sistema fotovoltaico de 30kWp en el techo de la planta de packing (ahorro: 2.0 tCO₂e, neutralizando Scope 2).
3. **Biofertilización:** Sustituir un 30% de urea por compost local (ahorro: 0.8 tCO₂e).
  
🐾 *Kapi-Tip:* Estas medidas no solo limpian tu producción, sino que garantizan el acceso permanente a los mercados premium europeos.`,

  'default': `🐾 **¡Hola! Soy Kapi, tu asistente de inteligencia climática.**
  
Analizo tu huella agropecuaria y financiera en tiempo real. Puedo responder tus dudas sobre:
- **Huella de Carbono:** Emisiones totales de la cooperativa y desglose Scope 1, 2 y 3.
- **Finanzas Sostenibles:** Tasas preferenciales de crédito verde y ahorros financieros.
- **Cumplimiento ESG:** Regulaciones CSRD, ISO 14064 y requerimientos de retailers.
- **Huella Hídrica:** Consumo de agua por cultivo.
  
¿En cuál de estos temas te gustaría que profundicemos hoy?`
}

function getAIResponse(input: string): string {
  const lower = input.toLowerCase()
  if (lower.includes('huella') || lower.includes('carbono') || lower.includes('emision') || lower.includes('total')) {
    return aiResponses['huella de carbono total']
  }
  if (lower.includes('scope 1') || lower.includes('alcance 1') || lower.includes('directo') || lower.includes('combustible') || lower.includes('fertiliz')) {
    return aiResponses['scope 1']
  }
  if (lower.includes('scope 2') || lower.includes('alcance 2') || lower.includes('energia') || lower.includes('electric') || lower.includes('riego') || lower.includes('packing')) {
    return aiResponses['scope 2']
  }
  if (lower.includes('scope 3') || lower.includes('alcance 3') || lower.includes('transporte') || lower.includes('maritimo') || lower.includes('naviera')) {
    return aiResponses['scope 3']
  }
  if (lower.includes('esg') || lower.includes('score') || lower.includes('social') || lower.includes('gobernanza')) {
    return aiResponses['score esg']
  }
  if (lower.includes('credito') || lower.includes('crédito') || lower.includes('verde') || lower.includes('financiamiento') || lower.includes('tasa') || lower.includes('ahorro')) {
    return aiResponses['credito verde']
  }
  if (lower.includes('cumplimiento') || lower.includes('regulacion') || lower.includes('regulación') || lower.includes('csrd') || lower.includes('eudr') || lower.includes('tesco') || lower.includes('iso')) {
    return aiResponses['cumplimiento']
  }
  if (lower.includes('agua') || lower.includes('hidrica') || lower.includes('hídrica')) {
    return aiResponses['agua']
  }
  if (lower.includes('mitigacion') || lower.includes('mitigación') || lower.includes('reducir') || lower.includes('descarboniza') || lower.includes('plan')) {
    return aiResponses['mitigacion']
  }
  return aiResponses['default']
}

function formatMessage(content: string) {
  return content.split('\n').map((line, i) => {
    const isListItem = line.startsWith('- ') || line.startsWith('* ') || !!line.match(/^\d+\.\s/)
    
    let cleanLine = line
    if (line.startsWith('- ') || line.startsWith('* ')) {
      cleanLine = line.substring(2)
    } else if (line.match(/^\d+\.\s/)) {
      cleanLine = line.replace(/^\d+\.\s/, '')
    }

    const parts = cleanLine.split(/\*\*(.*?)\*\*/g)
    const formattedContent = parts.map((part, j) => {
      if (j % 2 === 1) {
        return <strong key={j} className="text-[#137C53] font-bold">{part}</strong>
      }
      return part
    })

    if (isListItem) {
      return (
        <li key={i} className="ml-5 list-disc text-sm text-[rgba(80,108,92,0.85)] my-1">
          {formattedContent}
        </li>
      )
    }

    if (line === '') {
      return <div key={i} className="h-2" />
    }

    return (
      <p key={i} className="leading-relaxed text-sm text-[rgba(80,108,92,0.85)] my-1">
        {formattedContent}
      </p>
    )
  })
}

// --- GEMINI INTELLIGENCE SYSTEM ---
const GEMINI_API_KEYS = [
  'AQ.Ab8RN6IE6QHUThKGVePhMxjuimiqqJr0gYHjYsC2Qj82zcsH6Q', // Key principal
  'AIzaSyBmrQXJ7OFRMEsPKqTPTmEgalEap64e2uQ'                 // Key de respaldo
]
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

async function callGeminiAI(prompt: string): Promise<string> {
  for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
    const key = GEMINI_API_KEYS[i]
    try {
      const res = await fetch(`${GEMINI_ENDPOINT}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
        })
      })
      // Si la key devuelve 429, 403, 400 o 503 (ocupado), intenta la siguiente key.
      if (res.status === 429 || res.status === 403 || res.status === 400 || res.status === 503) {
        console.warn(`Key ${i + 1} ocupada o inválida (${res.status}), intentando siguiente key...`)
        continue
      }
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text || null
      if (result) return result
    } catch (e: any) {
      console.warn(`Error con key ${i + 1}:`, e.message)
    }
  }
  throw new Error('Todas las API keys fallaron o están agotadas.')
}

// Transcribe audio (WAV base64) a texto usando Gemini (mismo endpoint/keys)
async function transcribeAudioWithGemini(base64: string, mimeType: string): Promise<string> {
  for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
    const key = GEMINI_API_KEYS[i]
    try {
      const res = await fetch(`${GEMINI_ENDPOINT}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Transcribe exactamente este audio en español. Devuelve SOLO el texto dictado, sin comillas ni comentarios.' },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 1024 },
        }),
      })
      if (res.status === 429 || res.status === 403 || res.status === 400 || res.status === 503) continue
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (result) return result.trim()
    } catch (e: any) {
      console.warn(`Transcripción: key ${i + 1} falló:`, e.message)
    }
  }
  throw new Error('No se pudo transcribir el audio.')
}

function buildSystemPrompt(userQuestion: string, hasData: boolean): string {
  const dataContext = hasData ? `
[DATOS REALES DE LA COOPERATIVA AGROFINANCE]
- Huella Total: ${Math.round(cooperativa.huellaTotalTon)} tCO2e
- Intensidad: ${cooperativa.intensidadKgPorKg.toFixed(4)} kgCO2e/kg (Benchmark ~0.65 kgCO2e/kg)
- Kilos Exportados: ${cooperativa.kilosExportados.toLocaleString('es-PE')} kg
- Scope 1 (Diésel y Fertilización): ${cooperativa.scopes.s1.toFixed(1)} tCO2e
- Scope 2 (Energía Eléctrica): ${cooperativa.scopes.s2.toFixed(1)} tCO2e
- Scope 3 (Transporte y cadena): ${cooperativa.scopes.s3.toFixed(1)} tCO2e
- Hotspot crítico: ${cooperativa.hotspot.label} (${cooperativa.hotspot.pct}% del total)
- Ahorro crédito verde: US$ 99,625/año
- Cumplimiento: 4/5 marcos (CSRD, Tesco, ISO 14064, MINAM — BBVA pendiente)
- Huella hídrica: 1.42 m3/kg
` : `
[ESTADO: Sin datos operacionales cargados aún]
- IMPORTANT: Aún sin datos reales, SIEMPRE responde de forma útil, educativa y amigable.
- Puedes responder preguntas generales sobre huella de carbono, GHG Protocol, Scope 1/2/3, ESG, CSRD, finanzas verdes, agricultura sostenible.
- Si la pregunta necesita datos específicos de la empresa, explica brevemente qué mostrarías y menciona que el usuario puede cargar sus archivos aquí mismo en el chat con el botón 📂.
- NUNCA bloquees la conversación ni repitas que necesitas datos para responder.
`

  return `Eres Kapi, un capíbara carismático y experto en inteligencia climática, agricultura sostenible y finanzas verdes. Tu personalidad: cálido, directo, profesional, con toques sutiles de humor de capíbara. Nunca dices "no puedo" — siempre buscas la manera de ser útil.

Reglas clave:
1. SIEMPRE responde de forma completa y útil, con o sin datos.
2. Usa markdown limpio: negritas, listas, emojis relevantes.
3. Si tienes datos reales, ósalos con precisión.
4. Si no tienes datos específicos, da contexto general + menciona el botón 📂 para cargar archivos.
5. Termina siempre con una pregunta de seguimiento o un insight accionable.
6. Máx 300 palabras por respuesta. Directo al punto.

${dataContext}
Pregunta: "${userQuestion}"`
}

// ─── MÓDULO DE REGISTRO (automatización conversacional) ───────────────────
const UNIDADES: Record<string, string> = {
  kg: 'kg', kilo: 'kg', kilos: 'kg', kilogramo: 'kg', kilogramos: 'kg',
  t: 't', ton: 't', tonelada: 't', toneladas: 't',
  caja: 'cajas', cajas: 'cajas', jaba: 'jabas', jabas: 'jabas',
  l: 'L', litro: 'L', litros: 'L',
  u: 'u', unidad: 'u', unidades: 'u', saco: 'sacos', sacos: 'sacos',
}

// Frases que disparan el modo registro aunque el usuario esté conversando
const REGISTRO_TRIGGERS = /^\s*(registr\w*|anota|apunta|agrega|añade|guarda|ingresa)\b/i

function parseRegistro(text: string): Registro | null {
  const lower = text.toLowerCase()
  const numMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(kilogramos|kilogramo|kilos|kilo|kg|toneladas|tonelada|ton|t|cajas|caja|jabas|jaba|sacos|saco|litros|litro|l|unidades|unidad|u)?\b/)
  if (!numMatch) return null

  const cantidad = parseFloat(numMatch[1].replace(',', '.'))
  if (!isFinite(cantidad) || cantidad <= 0) return null
  const unidad = UNIDADES[numMatch[2] || ''] || 'kg'

  let tipo = 'almacen'
  if (/(cosech|recolect|cosech[eé])/.test(lower)) tipo = 'cosecha'
  else if (/(env[íi]o|despach|export|embarc|contenedor)/.test(lower)) tipo = 'envio'
  else if (/(insumo|fertiliz|abono|pesticida|combustible|di[ée]sel)/.test(lower)) tipo = 'insumo'

  // Producto: lo que va después de "de ..."
  let producto = 'Producto'
  const deMatch = lower.match(/\bde\s+([a-záéíóúñ][a-záéíóúñ ]*?)(?:\s+(?:en|al|para|hacia|con|almac|del|hoy|cosechad\w*|recolectad\w*|despachad\w*|export\w*|embarcad\w*|como)\b|[.,]|$)/)
  if (deMatch) producto = deMatch[1].trim()

  // Almacén / ubicación
  let almacen = ''
  const almMatch = lower.match(/almac[eé]n\s+([a-z0-9áéíóúñ ]+?)(?:\s+(?:con|para|de|hoy)\b|[.,]|$)/)
  if (almMatch) almacen = almMatch[1].trim()

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return {
    tipo,
    producto: cap(producto),
    cantidad,
    unidad,
    almacen: almacen ? cap(almacen) : undefined,
    fecha: new Date().toISOString(),
  }
}

const TIPO_LABEL: Record<string, string> = {
  almacen: 'Almacén', cosecha: 'Cosecha', envio: 'Envío', insumo: 'Insumo', otro: 'Otro',
}

export default function CopilotPage() {
  const router = useRouter()
  const [hasData, setHasData] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [mode, setMode] = useState<'chat' | 'registro'>('chat')
  const [registros, setRegistros] = useState<Registro[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [pendingImage, setPendingImage] = useState<{base64: string, mimeType: string, preview: string} | null>(null)
  const [pendingFile, setPendingFile] = useState<{name: string; size: number; type: string} | null>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const recorderRef = useRef<Recorder | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const dataFileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      setPendingImage({ base64, mimeType: file.type, preview: dataUrl })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleDataFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    // If it's an image, redirect to image handler
    const file = files[0]
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        setPendingImage({ base64: dataUrl.split(',')[1], mimeType: file.type, preview: dataUrl })
      }
      reader.readAsDataURL(file)
      e.target.value = ''
      return
    }
    setPendingFile({ name: file.name, size: file.size, type: file.type })
    e.target.value = ''
  }

  const processDataFile = async () => {
    if (!pendingFile) return
    setIsProcessingFile(true)
    setPendingFile(null)
    const now = () => new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

    // Show user message with file info
    const ext = pendingFile.name.split('.').pop()?.toUpperCase() || 'FILE'
    const sizeMB = (pendingFile.size / 1024 / 1024).toFixed(2)
    const userMsg: Message = {
      role: 'user',
      content: `📎 Archivo cargado: **${pendingFile.name}** (${ext} · ${sizeMB} MB)`,
      time: now(),
    }
    setMessages(prev => [...prev, userMsg])
    saveChatMessageToFirestore({ role: 'user', text: userMsg.content })
    setIsTyping(true)

    // Simulate processing delay
    await new Promise(r => setTimeout(r, 2200))

    // Run pilot engine to generate analysis
    const clasificacion = certificarCooperativa()
    const analisisId = String(Date.now())
    await saveAnalysisToFirestore({
      id: analisisId,
      timestamp: new Date().toISOString(),
      score: clasificacion.score,
      nivel: clasificacion.nivel,
      huellaTotalTon: cooperativa.huellaTotalTon,
      kilosExportados: cooperativa.kilosExportados,
      scopes: cooperativa.scopes,
    })
    localStorage.setItem('agrofinance_has_data', 'true')
    setHasData(true)

    // Ask Gemini for a file-specific response
    const filePrompt = `Eres Kapi, asistente de clima IA. El usuario acaba de cargar el archivo "${pendingFile.name}" (${ext}) a la plataforma AgroFinance.\n\nDatos procesados de la cooperativa:\n- Huella total: ${Math.round(cooperativa.huellaTotalTon)} tCO2e\n- Scope 1: ${cooperativa.scopes.s1.toFixed(1)} tCO2e | Scope 2: ${cooperativa.scopes.s2.toFixed(1)} tCO2e | Scope 3: ${cooperativa.scopes.s3.toFixed(1)} tCO2e\n- Intensidad: ${cooperativa.intensidadKgPorKg.toFixed(4)} kgCO2e/kg\n- Hotspot: ${cooperativa.hotspot.label} (${cooperativa.hotspot.pct}%)\n\nResponde al usuario confirmando que el archivo fue procesado exitosamente, resume los hallazgos clave en tu tono carismático de capibara, y ofrece 2 insights accionables sobre su huella. Usa markdown.`

    let aiText = ''
    try {
      aiText = await callGeminiAI(filePrompt)
    } catch {
      aiText = `✅ **¡Archivo "${pendingFile.name}" procesado con éxito!**\n\nAquí están tus datos actualizados:\n\n- **Huella Total:** ${Math.round(cooperativa.huellaTotalTon)} tCO₂e\n- **Scope 1:** ${cooperativa.scopes.s1.toFixed(1)} tCO₂e | **Scope 2:** ${cooperativa.scopes.s2.toFixed(1)} tCO₂e | **Scope 3:** ${cooperativa.scopes.s3.toFixed(1)} tCO₂e\n- **Intensidad:** ${cooperativa.intensidadKgPorKg.toFixed(4)} kgCO₂e/kg\n- **Hotspot:** ${cooperativa.hotspot.label} (${cooperativa.hotspot.pct}%)\n\n🐾 *El dashboard ya está actualizado. ¿Quieres que analice algún scope en detalle?*`
    }

    setIsTyping(false)
    setIsProcessingFile(false)
    const aiMsg: Message = { role: 'ai', content: aiText, time: now() }
    setMessages(prev => [...prev, aiMsg])
    saveChatMessageToFirestore({ role: 'model', text: aiText })
    playKapiNotification()
  }

  useEffect(() => {
    const dataLoaded = localStorage.getItem('agrofinance_has_data') === 'true'
    setHasData(dataLoaded)

    getChatHistoryFromFirestore().then((dbMsgs) => {
      if (dbMsgs.length > 0) {
        setMessages(dbMsgs.map(m => ({
          role: m.role === 'user' ? 'user' : 'ai',
          content: m.text,
          time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
          type: 'text'
        })))
      } else {
        setMessages([
          {
            role: 'ai',
            content: dataLoaded
              ? '¡Hola! Soy **Kapi**, tu asistente de inteligencia climática 🌱\n\nEstoy conectado a tus datos ESG. Puedo ayudarte con:\n- Emisiones Scope 1, 2 y 3\n- Reportes HC Perú y GRI\n- Créditos verdes y BBVA SLL\n- Cumplimiento CSRD, EUDR e ISO 14064\n\n¿Por dónde empezamos?'
              : '¡Hola! Soy **Kapi** 🐾 Tu asistente de clima e inteligencia agrofinanciera.\n\nPuedo hablar contigo sobre huella de carbono, Scope 1/2/3, créditos verdes, ESG, CSRD y más — **con o sin datos cargados**.\n\nSi quieres ver tus indicadores reales, puedes subir tus archivos con el botón 📂 de abajo. ¿O prefieres que te explique algo primero?',
            time: 'Ahora',
            type: 'text',
            showAutoload: !dataLoaded,
          }
        ])
      }
    })
  }, [])

  useEffect(() => {
    getRegistrosFromFirestore().then(setRegistros)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const displaySuggestedQuestions = suggestedQuestions

  const sendMessage = async (text?: string) => {
    const content = text || input.trim()
    const currentImage = pendingImage
    if (!content && !currentImage) return

    if (content.includes('Carga de Datos ➔') || content.includes('Ir a la página')) {
      router.push('/upload/')
      return
    }

    const userMsg: Message = {
      role: 'user',
      content: content || '📷 Imagen enviada',
      time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      imageUrl: currentImage?.preview,
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setPendingImage(null)
    setIsTyping(true)

    // Guardar mensaje del usuario en Firestore
    saveChatMessageToFirestore({ role: 'user', text: content || '[imagen]' })

    // ── Multifunción: módulo de registro operacional ──
    // Se activa con el "Modo Registro" o con frases tipo "registrar / anota / agrega…", pero lo saltamos si hay imagen.
    if (!currentImage && (mode === 'registro' || REGISTRO_TRIGGERS.test(content))) {
      const now = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
      const reg = parseRegistro(content)
      setIsTyping(false)
      if (reg) {
        // Optimista: mostramos el registro al instante y persistimos en segundo plano
        setRegistros(prev => [reg, ...prev])
        saveRegistroToFirestore(reg)
        const confirm = `✅ **Registro guardado en tu base de datos**\n\n- **Tipo:** ${TIPO_LABEL[reg.tipo]}\n- **Producto:** ${reg.producto}\n- **Cantidad:** ${reg.cantidad} ${reg.unidad}${reg.almacen ? `\n- **Almacén:** ${reg.almacen}` : ''}\n- **Fecha:** ${new Date(reg.fecha).toLocaleDateString('es-PE')}\n\n🐾 Listo. ¿Quieres registrar algo más?`
        const aiMsg: Message = { role: 'ai', content: confirm, time: now }
        setMessages(prev => [...prev, aiMsg])
        saveChatMessageToFirestore({ role: 'model', text: confirm })
      } else {
        const help = `🐾 No identifiqué la cantidad. Prueba con un formato como:\n\n- *Registrar 500 kg de palta en almacén Norte*\n- *Anota 30 cajas de mango cosechadas hoy*\n- *Agrega 200 L de diésel como insumo*`
        setMessages(prev => [...prev, { role: 'ai', content: help, time: now }])
      }
      return
    }

    let response = ''
    try {
      const prompt = currentImage
        ? buildSystemPrompt(content || 'Analiza esta imagen en el contexto de la cooperativa AgroFinance y su huella de carbono.', hasData)
        : buildSystemPrompt(content, hasData)

      if (currentImage) {
        for (let ki = 0; ki < GEMINI_API_KEYS.length; ki++) {
          const key = GEMINI_API_KEYS[ki]
          try {
            const res = await fetch(`${GEMINI_ENDPOINT}?key=${key}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [
                  { text: prompt },
                  { inline_data: { mime_type: currentImage.mimeType, data: currentImage.base64 } },
                ] }],
                generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
              })
            })
            if (res.status === 429 || res.status === 403 || res.status === 400 || res.status === 503) continue
            if (!res.ok) throw new Error(`API ${res.status}`)
            const data = await res.json()
            const result = data.candidates?.[0]?.content?.parts?.[0]?.text
            if (result) { response = result; break }
          } catch (e: any) { console.warn(`Image key ${ki + 1} failed:`, e.message) }
        }
        if (!response) response = getAIResponse(content)
      } else {
        response = await callGeminiAI(prompt)
      }
    } catch (err) {
      console.warn('Gemini error, using local fallback:', err)
      response = hasData ? getAIResponse(content) : `🐾 ¡Hola! Puedo hablar sobre huella de carbono, ESG, Scope 1/2/3, CSRD y créditos verdes aunque no tengas datos cargados aún.\n\n**Tu pregunta:** "${content}"\n\nSobre este tema puedo decirte que en agricultura de exportación, el **Scope 3** (transporte marítimo) suele representar el 80-96% de la huella total. ¿Quieres profundizar en algún aspecto?`
    }

    const aiMsg: Message = {
      role: 'ai',
      content: response,
      time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      showAutoload: !hasData,
    }

    setIsTyping(false)
    setMessages(prev => [...prev, aiMsg])
    playKapiNotification()

    // Guardar respuesta del bot en Firestore
    saveChatMessageToFirestore({ role: 'model', text: response })
  }

  // Micrófono: graba audio → transcribe con Gemini → lo manda por el pipeline normal
  const toggleRecording = async () => {
    if (isTranscribing) return

    if (isRecording) {
      // Detener y transcribir
      setIsRecording(false)
      const rec = recorderRef.current
      recorderRef.current = null
      if (!rec) return
      setIsTranscribing(true)
      try {
        const audio = await rec.stop()
        if (!audio) {
          setIsTranscribing(false)
          return
        }
        const text = await transcribeAudioWithGemini(audio.base64, audio.mimeType)
        setIsTranscribing(false)
        if (text) await sendMessage(text)
      } catch (e) {
        console.warn('Error de transcripción:', e)
        setIsTranscribing(false)
        setMessages(prev => [...prev, {
          role: 'ai',
          content: '🐾 No pude transcribir el audio. Revisa el permiso del micrófono e inténtalo de nuevo.',
          time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
        }])
      }
      return
    }

    // Empezar a grabar
    try {
      recorderRef.current = await startRecording()
      setIsRecording(true)
    } catch (e) {
      console.warn('No se pudo acceder al micrófono:', e)
      setMessages(prev => [...prev, {
        role: 'ai',
        content: '🐾 No pude acceder al micrófono. Asegúrate de dar permiso en el navegador.',
        time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      }])
    }
  }

  return (
    <DashboardShell>
      <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
      <input
        type="file"
        ref={dataFileInputRef}
        accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.txt,.ods,image/*"
        multiple
        className="hidden"
        onChange={handleDataFileSelect}
      />
      <div className="flex-1 flex w-full">
        <div className="flex w-full gap-6">

          {/* Left sidebar — Context */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:flex flex-col gap-4 w-72 flex-shrink-0"
          >
            {/* Mascot card */}
            <div className="glass-card rounded-3xl p-6 text-center">
              <CapybaraBot size="md" mood="thinking" showGlow className="mx-auto mb-4" />
              <div className="text-sm font-bold text-[#13301F] mb-1">Kapi</div>
              <div className="text-xs text-[rgba(80,108,92,0.5)] mb-3">AI de Climate Intelligence</div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#137C53] animate-pulse" />
                <span className="text-xs text-[#137C53] font-semibold">En línea · Listo</span>
              </div>
            </div>

            {/* Quick stats */}
            <div className="glass-card rounded-3xl p-5">
              <div className="text-xs font-semibold text-[rgba(80,108,92,0.5)] uppercase tracking-widest mb-4">Contexto Activo</div>
              <div className="space-y-3">
                {[
                  { icon: Leaf, label: 'Huella total', value: '21,267 tCO₂e' },
                  { icon: TrendingDown, label: 'Reducción YoY', value: '-8%' },
                  { icon: BarChart3, label: 'Score ESG', value: '87/100' },
                  { icon: FileText, label: 'Reportes', value: '3 activos' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[rgba(90,190,145,0.08)] flex items-center justify-center">
                      <item.icon className="w-3.5 h-3.5 text-[#137C53]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-[rgba(80,108,92,0.5)]">{item.label}</div>
                      <div className="text-xs font-bold text-[#13301F]">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick shortcuts */}
            <div className="glass-card rounded-3xl p-5">
              <div className="text-xs font-semibold text-[rgba(80,108,92,0.5)] uppercase tracking-widest mb-4">Acceso rápido</div>
              <div className="space-y-2">
                {[
                  { label: 'Ver Dashboard', href: '/dashboard', icon: BarChart3 },
                  { label: 'Subir datos', href: '/upload', icon: Globe2 },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-[rgba(80,108,92,0.6)] hover:text-[#137C53] hover:bg-[rgba(90,190,145,0.06)] transition-all"
                  >
                    <link.icon className="w-3.5 h-3.5" />
                    {link.label}
                    <ArrowRight className="w-3 h-3 ml-auto" />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">

            {/* Chat header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl px-5 py-4 mb-4 flex items-center gap-3"
            >
              <CapybaraBot size="sm" mood="thinking" showGlow />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#13301F]">Kapi · AI Copilot ESG</span>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(90,190,145,0.12)] border border-[rgba(90,190,145,0.2)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#137C53] animate-pulse" />
                    <span className="text-[10px] font-semibold text-[#137C53]">En línea</span>
                  </div>
                </div>
                <p className="text-xs text-[rgba(80,108,92,0.5)]">Conectado a tus datos ESG · Responde en tiempo real</p>
              </div>
            </motion.div>



            {/* Banner explicativo del modo registro */}
            <AnimatePresence>
              {mode === 'registro' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="rounded-2xl border border-[rgba(90,190,145,0.2)] bg-[rgba(90,190,145,0.06)] p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[rgba(90,190,145,0.12)] flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-4 h-4 text-[#137C53]" />
                    </div>
                    <p className="text-xs text-[rgba(80,108,92,0.8)] leading-relaxed">
                      <strong className="text-[#137C53]">Modo Registro.</strong> Habla con Kapi para guardar datos
                      de almacén, cosecha, envíos o insumos. Ej: <em>“Registrar 500 kg de palta en almacén Norte”</em>.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2" style={{ maxHeight: 'calc(100vh - 340px)' }}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}
                >
                  {msg.role === 'ai' && (
                    <div className="flex-shrink-0 mt-1">
                      <CapybaraBot size="sm" mood="idle" showGlow={false} />
                    </div>
                  )}
                  <div className={`max-w-[75%] ${msg.role === 'ai' ? 'ai-bubble' : 'user-bubble'} px-4 py-3 text-xs leading-relaxed`}>
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="Imagen enviada" className="rounded-xl mb-2 max-h-48 object-cover border border-[rgba(90,190,145,0.2)]" />
                    )}
                    <ul className="space-y-1">
                      {formatMessage(msg.content)}
                    </ul>
                    {msg.showAutoload && (
                      <div className="mt-3 pt-2 border-t border-[rgba(90,190,145,0.15)]">
                        <p className="text-[10px] text-[rgba(80,108,92,0.5)] mb-1.5">¿Quieres activar tus indicadores ESG con datos demo?</p>
                        <button
                          onClick={async () => {
                            const { certificarCooperativa, cooperativa: coop } = await import('@/lib/pilotEngine')
                            const { saveAnalysisToFirestore: saveA } = await import('@/lib/firebaseService')
                            const { certificarCooperativa: cert } = await import('@/lib/pilotEngine')
                            const cl = cert()
                            await saveA({ id: String(Date.now()), timestamp: new Date().toISOString(), score: cl.score, nivel: cl.nivel, huellaTotalTon: coop.huellaTotalTon, kilosExportados: coop.kilosExportados, scopes: coop.scopes })
                            localStorage.setItem('agrofinance_has_data', 'true')
                            setHasData(true)
                            setMessages(prev => [...prev, { role: 'ai', content: '✅ ¡**Datos cargados!** Tus indicadores ESG ya están activos. Ahora puedo responderte con tus números reales.\n\n- **Huella Total:** ' + Math.round(coop.huellaTotalTon) + ' tCO₂e\n- **Scope 3** (transporte marítimo): ' + coop.scopes.s3.toFixed(1) + ' tCO₂e\n\n¿Qué quieres analizar primero?', time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) }])
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #2BA470, #137C53)' }}
                        >
                          <span>⚡</span> Autocargar datos demo
                        </button>
                      </div>
                    )}
                    <span className="text-[10px] text-[rgba(80,108,92,0.3)] mt-2 block">{msg.time}</span>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex justify-start gap-3"
                  >
                    <CapybaraBot size="sm" mood="thinking" showGlow={false} />
                    <div className="ai-bubble px-4 py-3 flex items-center gap-1.5">
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-[#137C53]"
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                          transition={{ duration: 1, repeat: Infinity, delay }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={bottomRef} />
            </div>

            {/* Sugerencias — preguntas (chat) o ejemplos de registro */}
            {mode === 'chat' && messages.length <= 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap gap-2 mb-3"
              >
                {displaySuggestedQuestions.slice(0, 4).map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs px-3 py-2 rounded-xl glass border border-[rgba(90,190,145,0.15)] text-[rgba(80,108,92,0.7)] hover:text-[#137C53] hover:border-[rgba(90,190,145,0.3)] transition-all"
                  >
                    {q}
                  </button>
                ))}
              </motion.div>
            )}

            {mode === 'registro' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3">
                <div className="flex flex-wrap gap-2 mb-2">
                  {[
                    'Registrar 500 kg de palta en almacén Norte',
                    'Anota 30 cajas de mango cosechadas hoy',
                    'Agrega 200 L de diésel como insumo',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-xs px-3 py-2 rounded-xl glass border border-[rgba(90,190,145,0.15)] text-[rgba(80,108,92,0.7)] hover:text-[#137C53] hover:border-[rgba(90,190,145,0.3)] transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                {registros.length > 0 && (
                  <div className="rounded-2xl glass-card p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(80,108,92,0.45)] mb-2">
                      Últimos registros
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {registros.slice(0, 5).map((r, i) => (
                        <div key={r.id || i} className="flex items-center gap-2.5 text-xs">
                          <span className="w-6 h-6 rounded-lg bg-[rgba(90,190,145,0.12)] flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-[#137C53]" />
                          </span>
                          <span className="font-semibold text-[#13301F]">{r.cantidad} {r.unidad}</span>
                          <span className="text-[rgba(80,108,92,0.7)] truncate">{r.producto}</span>
                          <span className="ml-auto badge badge-emerald text-[10px] py-0.5 px-2 flex-shrink-0">{TIPO_LABEL[r.tipo] || r.tipo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Input */}
            {/* Pending file preview */}
            <AnimatePresence>
              {pendingFile && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                  className="mb-2 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[rgba(90,190,145,0.08)] border border-[rgba(90,190,145,0.2)]"
                >
                  <div className="w-8 h-8 rounded-lg bg-[rgba(90,190,145,0.15)] flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="w-4 h-4 text-[#137C53]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#13301F] truncate">{pendingFile.name}</div>
                    <div className="text-[10px] text-[rgba(80,108,92,0.5)]">{(pendingFile.size/1024/1024).toFixed(2)} MB · Listo para procesar</div>
                  </div>
                  <button
                    onClick={processDataFile}
                    disabled={isProcessingFile}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #2BA470, #137C53)' }}
                  >
                    <Zap className="w-3.5 h-3.5" /> Procesar
                  </button>
                  <button onClick={() => setPendingFile(null)} className="w-6 h-6 rounded-full bg-[rgba(80,108,92,0.1)] flex items-center justify-center text-[rgba(80,108,92,0.5)] hover:bg-red-100 hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Image preview */}
            {pendingImage && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-2 relative inline-block">
                <img src={pendingImage.preview} alt="Preview" className="h-20 rounded-xl border border-[rgba(90,190,145,0.3)] object-cover" />
                <button onClick={() => setPendingImage(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-3 flex items-center gap-2"
            >
              {/* Data file upload button */}
              <button
                onClick={() => dataFileInputRef.current?.click()}
                disabled={isTyping || isRecording || isTranscribing || isProcessingFile}
                title="Subir archivo (Excel, PDF, CSV, Word...)"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 text-[rgba(80,108,92,0.4)] hover:text-[#137C53] hover:bg-[rgba(90,190,145,0.08)]"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
              {/* Image upload button */}
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={isTyping || isRecording || isTranscribing || isProcessingFile}
                title="Subir imagen"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 text-[rgba(80,108,92,0.4)] hover:text-[#137C53] hover:bg-[rgba(90,190,145,0.08)]"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={isProcessingFile
                  ? 'Procesando archivo con IA…'
                  : isRecording
                  ? 'Grabando… toca el micrófono para enviar'
                  : isTranscribing
                  ? 'Transcribiendo tu audio…'
                  : pendingFile
                  ? 'Archivo listo — pulsa ⚡ Procesar para analizarlo'
                  : pendingImage
                  ? 'Describe la imagen o envía directamente…'
                  : mode === 'registro'
                  ? 'Ej: Registrar 500 kg de palta en almacén Norte…'
                  : 'Pregunta a Kapi o sube un archivo con 📂…'}
                className="flex-1 bg-transparent outline-none text-sm text-[#13301F] placeholder:text-[rgba(80,108,92,0.3)]"
                disabled={isTyping || isRecording || isTranscribing || isProcessingFile}
              />
              <button
                onClick={toggleRecording}
                disabled={isTyping || isTranscribing}
                title={isRecording ? 'Detener y enviar' : 'Hablar (audio a texto)'}
                className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 ${
                  isRecording
                    ? 'bg-red-500/15 text-red-600'
                    : 'text-[rgba(80,108,92,0.4)] hover:text-[#137C53] hover:bg-[rgba(90,190,145,0.08)]'
                }`}
              >
                {isTranscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#137C53]" />
                ) : isRecording ? (
                  <>
                    <span className="absolute inset-0 rounded-xl bg-red-500/20 animate-ping" />
                    <Square className="w-3.5 h-3.5 relative" fill="currentColor" />
                  </>
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => sendMessage()}
                disabled={(!input.trim() && !pendingImage) || isTyping || isProcessingFile}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: (input.trim() || pendingImage) ? 'linear-gradient(135deg, #2BA470, #0E7A4E)' : 'rgba(90,190,145,0.1)',
                }}
              >
                <Send className="w-4 h-4 text-[#0E2418]" />
              </button>
            </motion.div>

            <p className="text-center text-[10px] text-[rgba(80,108,92,0.25)] mt-2">
              Kapi puede cometer errores. Verifica información crítica en tu dashboard ESG.
            </p>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
