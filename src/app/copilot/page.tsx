'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Sparkles, TrendingDown, AlertTriangle,
  Leaf, Globe2, FileText, BarChart3, ArrowRight, Mic,
  MessageSquare, ClipboardList, PackagePlus, Check
} from 'lucide-react'
import Navigation from '@/components/layout/Navigation'
import CapybaraBot from '@/components/mascot/CapybaraBot'
import { cooperativa } from '@/lib/pilotEngine'
import {
  saveChatMessageToFirestore, getChatHistoryFromFirestore,
  saveRegistroToFirestore, getRegistrosFromFirestore, type Registro
} from '@/lib/firebaseService'

type Message = {
  role: 'user' | 'ai'
  content: string
  time: string
  type?: 'text' | 'insight' | 'alert'
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
  '¿Cuál es mi huella de carbono total este mes?',
  'Analiza mis emisiones Scope 3',
  '¿Cómo mejorar mi score ESG?',
  'Genera reporte HC Perú Q3',
  '¿Qué categoría Scope 3 debo reducir primero?',
  'Riesgo climático en mi cadena de suministro',
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

function buildSystemPrompt(userQuestion: string, hasData: boolean): string {
  let dataContext = ''
  if (hasData) {
    dataContext = `
[CONTEXTO DE LA COOPERATIVA AGROFINANCE]
- Huella Total de Carbono: ${Math.round(cooperativa.huellaTotalTon)} tCO2e
- Intensidad Promedio: ${cooperativa.intensidadKgPorKg.toFixed(4)} kgCO2e/kg (vs Benchmark sectorial de ~0.65 kgCO2e/kg)
- Kilos Exportados: ${cooperativa.kilosExportados.toLocaleString('es-PE')} kg
- Desglose por Scope:
  * Scope 1 (Directo - Diésel y Fertilización): ${cooperativa.scopes.s1.toFixed(1)} tCO2e
  * Scope 2 (Energía Eléctrica - Riego y Packing): ${cooperativa.scopes.s2.toFixed(1)} tCO2e
  * Scope 3 (Cadena de Suministro - Transporte camiones y marítimo): ${cooperativa.scopes.s3.toFixed(1)} tCO2e
- Hotspot Crítico (Mayor fuente de emisión): ${cooperativa.hotspot.label} (${cooperativa.hotspot.pct}% de la huella total)
- Ahorro Potencial de Crédito Verde: US$ 99,625 /año (reducción en costos financieros mediante certificaciones)
- Progreso de Cumplimiento Regulatorio: 4/5 marcos completados (CSRD/EUDR, Tesco, ISO 14064, MINAM - BBVA pendiente)
- Huella Hídrica Estimada: 1.42 m3/kg
`
  } else {
    dataContext = `
[CONTEXTO DE LA COOPERATIVA AGROFINANCE]
- Estado actual: Sin datos cargados (onboarding incompleto).
- El usuario aún no ha subido los archivos de campaña desde la carpeta local "C:\\AgroFinance-main\\DATA".
- El usuario debe ir a la sección de "Carga de Datos" (/upload) y subir archivos como "Control_de_Campo_.xlsx", "envios_aduanas.csv", "mype_campos_fijos.csv", etc., o hacer clic en "Autocargar Carpeta DATA".
`
  }

  return `
Eres Kapi, un carismático capibara asistente de inteligencia climática especializado en agricultura y finanzas sostenibles (Green Finance) para la cooperativa AgroFinance.
Tu tono de respuesta es amigable, profesional, motivador y con guiños sutiles a que eres un capibara (ej. "¡Hola de nuevo!", "¡Qué tal!", "¡Caramba!", de forma sutil).
Usa un formato markdown limpio y bien organizado. Usa listas, negritas y viñetas para que la información se lea fácilmente en el chat.

Aquí está el contexto de datos actual de la cooperativa:
${dataContext}

Pregunta del usuario: "${userQuestion}"

Por favor, responde a la pregunta del usuario con base en el contexto proporcionado. Si te preguntan sobre emisiones, metas, Scope 3, cumplimiento o créditos verdes, usa la información numérica real del contexto para ser preciso y profesional. Si no hay datos, guíalos amigablemente para que realicen la carga de datos.
`
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
  const bottomRef = useRef<HTMLDivElement>(null)

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
              ? '¡Hola! Soy **Kapi**, tu asistente de inteligencia climática 🌱\n\nEstoy conectado a tus datos ESG y puedo ayudarte a:\n- Analizar tus emisiones Scope 1, 2 y 3\n- Generar reportes HC Perú automáticamente\n- Identificar oportunidades de reducción de carbono\n- Responder preguntas sobre tu cumplimiento ESG\n\n¿Por dónde empezamos?'
              : '¡Hola! Soy **Kapi**, tu asistente de inteligencia climática 🌱\n\n⚠️ **Veo que aún no has cargado tus archivos operacionales.**\n\nPor favor, ve a la sección de **Carga de Datos** y sube la carpeta local **C:\\AgroFinance-main\\DATA** para que pueda procesar tus emisiones y responder sobre tu huella real. ¿Quieres que vayamos a la página de carga?',
            time: 'Ahora',
            type: 'text',
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

  const displaySuggestedQuestions = hasData
    ? suggestedQuestions
    : [
        '¿Cómo cargo los archivos de DATA?',
        'Ir a la página de Carga de Datos ➔',
        '¿Qué tipos de archivos soporta AgroFinance?',
      ]

  const sendMessage = async (text?: string) => {
    const content = text || input.trim()
    if (!content) return

    if (content.includes('Carga de Datos ➔') || content.includes('Ir a la página')) {
      router.push('/upload/')
      return
    }

    const userMsg: Message = {
      role: 'user',
      content,
      time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Guardar mensaje del usuario en Firestore
    saveChatMessageToFirestore({ role: 'user', text: content })

    // ── Multifunción: módulo de registro operacional ──
    // Se activa con el "Modo Registro" o con frases tipo "registrar / anota / agrega…"
    if (mode === 'registro' || REGISTRO_TRIGGERS.test(content)) {
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

    const getFallbackResponse = () => {
      if (!hasData) {
        const lower = content.toLowerCase()
        if (lower.includes('cómo cargo') || lower.includes('como cargo')) {
          return '🐾 **Guía de Carga de Datos:**\n\n1. Ve a la sección de **[Carga de Datos](/upload/)**.\n2. Arrastra los archivos de la carpeta local **C:\\AgroFinance-main\\DATA** (como `Control_de_Campo_.xlsx` o `mype_campos_fijos.csv`).\n3. Alternativamente, puedes hacer clic en el botón **"Autocargar Carpeta DATA"** para que cargue los 10 archivos simulados al instante.\n4. Kapi escaneará y estructurará los datos climáticos para activar tus indicadores ESG.'
        } else if (lower.includes('soporta') || lower.includes('formatos') || lower.includes('tipos')) {
          return '📋 **Formatos de archivos soportados:**\n\nAgroFinance procesa automáticamente múltiples tipos de archivos estructurados y no estructurados de la cooperativa:\n\n- **Hojas de Cálculo:** `.xlsx`, `.xls`, `.csv` (ej. control de campo, envíos, aduanas).\n- **Documentos de Texto:** `.pdf`, `.docx`, `.txt` (ej. reportes mensuales de packing, facturas de energía).\n\nKapi consolidará toda esta información y calculará la huella climática de manera determinista.'
        } else {
          return '🐾 **Kapi te recuerda:**\n\nActualmente no cuento con datos para responder tu pregunta. Por favor, realiza la subida de los archivos complejos de campaña desde la carpeta local **C:\\AgroFinance-main\\DATA** en la sección de **[Carga de Datos](/upload/)** para habilitar el análisis de IA.'
        }
      } else {
        return getAIResponse(content)
      }
    }

    let response = ''
    try {
      const prompt = buildSystemPrompt(content, hasData)
      response = await callGeminiAI(prompt)
    } catch (err) {
      console.warn('Error llamando a Gemini, usando respuestas locales estructuradas:', err)
      response = getFallbackResponse()
    }

    const aiMsg: Message = {
      role: 'ai',
      content: response,
      time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
    }

    setIsTyping(false)
    setMessages(prev => [...prev, aiMsg])

    // Guardar respuesta del bot en Firestore
    saveChatMessageToFirestore({ role: 'model', text: response })
  }

  return (
    <div className="min-h-screen bg-[#FBF4D6] flex flex-col">
      <Navigation />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-gradient-radial from-[rgba(90,190,145,0.05)] to-transparent blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 rounded-full bg-gradient-radial from-[rgba(61,127,176,0.04)] to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-grid opacity-20" />
      </div>

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex w-full gap-6 py-6">

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
                  <div className="badge badge-emerald text-[10px] py-0.5 px-2">
                    <Sparkles className="w-2.5 h-2.5" />
                    IA Activa
                  </div>
                </div>
                <p className="text-xs text-[rgba(80,108,92,0.5)]">Conectado a tus datos ESG · Responde en tiempo real</p>
              </div>
            </motion.div>

            {/* Selector de modo: Conversar / Registrar (chat multifunción) */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="inline-flex p-1 rounded-2xl glass border border-[rgba(90,190,145,0.15)]">
                {[
                  { id: 'chat', label: 'Conversar', icon: MessageSquare },
                  { id: 'registro', label: 'Registrar', icon: ClipboardList },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id as 'chat' | 'registro')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      mode === m.id
                        ? 'bg-[rgba(90,190,145,0.15)] text-[#137C53] border border-[rgba(90,190,145,0.25)]'
                        : 'text-[rgba(80,108,92,0.5)] hover:text-[rgba(80,108,92,0.8)]'
                    }`}
                  >
                    <m.icon className="w-3.5 h-3.5" /> {m.label}
                  </button>
                ))}
              </div>
              {mode === 'registro' && (
                <span className="flex items-center gap-1.5 text-xs text-[rgba(80,108,92,0.55)]">
                  <PackagePlus className="w-3.5 h-3.5 text-[#137C53]" />
                  {registros.length} registro{registros.length === 1 ? '' : 's'} en tu base de datos
                </span>
              )}
            </div>

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
                    <ul className="space-y-1">
                      {formatMessage(msg.content)}
                    </ul>
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-3 flex items-center gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={mode === 'registro'
                  ? 'Ej: Registrar 500 kg de palta en almacén Norte…'
                  : 'Pregunta sobre tus emisiones, reportes ESG, Scope 3...'}
                className="flex-1 bg-transparent outline-none text-sm text-[#13301F] placeholder:text-[rgba(80,108,92,0.3)]"
                disabled={isTyping}
              />
              <button
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[rgba(80,108,92,0.3)] hover:text-[rgba(80,108,92,0.6)] transition-colors"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isTyping}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: input.trim() ? 'linear-gradient(135deg, #2BA470, #0E7A4E)' : 'rgba(90,190,145,0.1)',
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
    </div>
  )
}
