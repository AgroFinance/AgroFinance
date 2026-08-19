'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Sparkles, TrendingDown, AlertTriangle,
  Leaf, Globe2, FileText, BarChart3, ArrowRight, Mic, ImagePlus,
  MessageSquare, ClipboardList, PackagePlus, Check, Loader2, Square, X,
  FolderOpen, FileSpreadsheet, Zap
} from 'lucide-react'
import DashboardShell from '@/components/layout/DashboardShell'
import KapiIcon from '@/components/mascot/KapiIcon'
import { cooperativa, certificarCooperativa } from '@/lib/engine/pilotEngine'
import { saveAnalysisToFirestore } from '@/lib/integrations/firebaseService'
import {
  saveChatMessageToFirestore, getChatHistoryFromFirestore,
  saveRegistroToFirestore, getRegistrosFromFirestore, type Registro
} from '@/lib/integrations/firebaseService'
import { startRecording, type Recorder } from '@/lib/integrations/speech'
import { playKapiNotification } from '@/lib/integrations/notificationSound'
import { preguntarKapi, preguntarKapiConPartes, preguntarKapiConHistorial } from '@/lib/kapi/kapiAI'
import { analizarArchivoChat } from '@/lib/parsing/chatFileAnalysis'
import { useFuentesDatos, fuentesActivasDesde } from '@/lib/store/datosPrueba'
import { useHuellaConsolidada } from '@/lib/engine/huellaConsolidada'
import { construirProductos } from '@/lib/store/analyticsData'
import { useGastoAmbiental, resumirGasto } from '@/lib/engine/gastoAmbiental'
import { resumirODS } from '@/lib/engine/ods'
import { useInocuidad, resumirTodos } from '@/lib/engine/inocuidad'
import { useHuellaHidrica } from '@/lib/engine/huellaHidrica'
import { construirAcciones } from '@/lib/engine/reduccionActions'
import { coberturaDe } from '@/lib/engine/pilotEngine'
import { construirContextoPlataforma, REGLAS_DATOS } from '@/lib/kapi/contextoKapi'

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


// Respuesta de emergencia cuando el modelo no contesta.
//
// Antes devolvia fichas enlatadas con cifras escritas a mano: afirmaba
// "127 tCO2e" cuando el inventario real ronda las 1.378, un factor de 11.
// Y se dispara justo cuando el modelo falla (Gemini devuelve 503 por
// demanda alta con cierta frecuencia), o sea que el peor momento posible
// producia la afirmacion mas confiada y mas falsa. Delante de un auditor
// eso no se recupera.
//
// Ahora no da ninguna cifra: dice que no pudo consultar y hacia donde ir.
// Un asistente que se calla es defendible; uno que inventa, no.
function getAIResponse(input: string): string {
  const t = (input || '').toLowerCase()
  const donde =
    /agua|hidric|hídric/.test(t) ? 'Huella Hidrica'
      : /gasto|inversion|inversión|dinero|costo|soles/.test(t) ? 'Gasto ambiental'
      : /iso|22000|auditor|inocuidad|brc|basc|smeta/.test(t) ? 'Auditorias'
      : /credito|crédito|banco|financia|prestamo|préstamo|tasa/.test(t) ? 'A que credito accedo'
      : /reducc|plan|accion|acción|mitig/.test(t) ? 'Plan de reduccion'
      : /reporte|informe|pdf|export|ods|verificac/.test(t) ? 'Reportes'
      : /archivo|subir|cargar|fuente|excel/.test(t) ? 'Configuracion'
      : 'Dashboard'

  return [
    'No pude consultar tus datos en este momento, asi que **no voy a darte cifras** — prefiero eso a arriesgarme a decirte un numero equivocado.',
    '',
    `Lo que preguntas lo puedes ver ahora mismo en **${donde}**, con los numeros reales de tu inventario.`,
    '',
    'Vuelve a intentarlo en unos segundos y te respondo con tus datos.',
  ].join(String.fromCharCode(10))
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
// Antes llamaba a Google directo desde el navegador con claves escritas en
// este archivo: eso las publica en el bundle de cualquier visitante, y de
// hecho la clave que había aquí terminó revocada por Google al quedar
// expuesta. Pasa por /api/chat, que es la ruta de servidor que guarda la
// clave y es el mismo camino que ya usan CopilotDrawer y KapiBubble.
// `historial` son los turnos ANTERIORES; `prompt` es el turno actual ya
// enriquecido con los datos de la empresa. Sin el historial, Kapi contesta
// cada pregunta como si fuera la primera y no puede seguir un "¿y eso por
// qué?" ni recordar de qué cultivo se venía hablando.
async function callGeminiAI(prompt: string, historial: Message[] = []): Promise<string> {
  const turnos = historial
    .filter((m) => typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', content: m.content }))
  turnos.push({ role: 'user', content: prompt })
  return preguntarKapiConHistorial(turnos)
}

// Transcribe audio (WAV base64) a texto — misma ruta de servidor que el resto de Kapi.
async function transcribeAudioWithGemini(base64: string, mimeType: string): Promise<string> {
  const texto = await preguntarKapiConPartes([
    { text: 'Transcribe exactamente este audio en español. Devuelve SOLO el texto dictado, sin comillas ni comentarios.' },
    { inlineData: { mimeType, data: base64 } },
  ], { temperature: 0, maxOutputTokens: 1024 })
  if (!texto) throw new Error('No se pudo transcribir el audio.')
  return texto
}

// El contexto ya no se arma aqui con constantes: llega vivo desde
// contextoKapi, que lee el MISMO store consolidado que el panel. Antes esta
// funcion inyectaba `cooperativa` (todas las fuentes demo activas) y valores
// escritos a mano, asi que Kapi contradecia al dashboard en cuanto el
// usuario desvinculaba un archivo.
function buildSystemPrompt(userQuestion: string, contexto: string, hasData: boolean): string {
  const estado = hasData
    ? contexto
    : [
        contexto,
        '',
        'NOTA: no hay fuentes vinculadas. Responde de forma util y educativa sobre huella de carbono,',
        'GHG Protocol, alcances, EUDR, CBAM o financiamiento verde, y menciona que puede cargar sus',
        'archivos con el boton de adjuntar. No inventes cifras de la empresa.',
      ].join(String.fromCharCode(10))

  return `Eres Kapi, un capibara carismatico y experto en inteligencia climatica, agricultura sostenible y finanzas verdes. Tu personalidad: calido, directo, profesional, con toques sutiles de humor. Nunca dices "no puedo" sin ofrecer una alternativa util.

Reglas de estilo:
1. Markdown limpio: negritas, listas cortas, algun emoji relevante.
2. Maximo 300 palabras. Directo al punto.
3. Cierra con una pregunta de seguimiento o un insight accionable.

${REGLAS_DATOS}

${estado}

Pregunta del usuario: "${userQuestion}"`
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
  const [pendingFile, setPendingFile] = useState<{ file: File; name: string; size: number; type: string } | null>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [, setFuentes] = useFuentesDatos()

  // ── Estado vivo de la plataforma que ve Kapi ──────────────────────────
  // Mismo store que el panel: si el usuario desvincula un archivo, el
  // asistente lo nota en la siguiente pregunta.
  const { huella, fuentes: fuentesVivas } = useHuellaConsolidada()
  const { estado: gastoEstado } = useGastoAmbiental()
  const { estado: inocuidadEstado } = useInocuidad()
  const hidrica = useHuellaHidrica()

  const contextoPlataforma = useMemo(() => {
    const resumenGasto = resumirGasto(gastoEstado, huella.huellaTotalTon)
    const productos = construirProductos(fuentesActivasDesde(fuentesVivas))
    const acciones = construirAcciones(huella)
    return construirContextoPlataforma({
      huella,
      fuentes: fuentesVivas,
      productos,
      gasto: resumenGasto,
      ods: resumirODS({
        huella,
        fuentes: fuentesVivas,
        gasto: resumenGasto,
        aguaM3: hidrica.m3Total,
        accionesReduccion: acciones.length,
      }),
      inocuidad: resumirTodos(inocuidadEstado),
      hidrica,
      acciones,
      certificacion: certificarCooperativa(huella, coberturaDe(fuentesVivas)),
    })
  }, [huella, fuentesVivas, gastoEstado, inocuidadEstado, hidrica])
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
    setPendingFile({ file, name: file.name, size: file.size, type: file.type })
    e.target.value = ''
  }

  // Lee el archivo de verdad — motor real de GHG para hojas de cálculo,
  // lectura nativa de Gemini para PDF, texto extraído para Word/TXT. Nunca
  // devuelve un "procesado con éxito" si no procesó nada (RNF-7.5).
  const processDataFile = async () => {
    if (!pendingFile) return
    const archivo = pendingFile.file
    setIsProcessingFile(true)
    setPendingFile(null)
    const now = () => new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

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

    const resultado = await analizarArchivoChat(archivo)
    let aiText = ''

    if (resultado.tipo === 'error') {
      aiText = `⚠️ No pude procesar **${pendingFile.name}**.\n\n${resultado.motivo}`
    } else if (resultado.tipo === 'estructurado') {
      // Mismo motor que Configuración/Analizar Datos: se registra como
      // fuente real, el Dashboard y Análisis quedan actualizados de verdad.
      setFuentes((prev) => {
        const existente = prev.find((f) => !f.isDemo && (f.huella === resultado.fuente.huella || f.archivo === resultado.fuente.archivo))
        return existente ? prev.map((f) => (f.id === existente.id ? { ...resultado.fuente, id: existente.id } : f)) : [...prev, resultado.fuente]
      })
      localStorage.setItem('agrofinance_has_data', 'true')
      setHasData(true)
      try {
        aiText = await preguntarKapi(
          `${resultado.resumenTexto}\n\nResponde al usuario en tu tono de Kapi confirmando esto y ofrece 1-2 insights accionables basados exclusivamente en estos números reales (no inventes otros datos).`,
        )
      } catch {
        aiText = `✅ **${pendingFile.name}** procesado.\n\n${resultado.resumenTexto}`
      }
    } else if (resultado.tipo === 'pdf') {
      try {
        aiText = await preguntarKapiConPartes([
          { text: `El usuario subió el PDF "${resultado.nombre}". Léelo y responde en tu tono de Kapi con lo relevante para huella de carbono, cumplimiento o financiamiento verde que encuentres en el documento. Si no hay nada relevante, dilo. Aclara que este documento no entra al cálculo automático (eso requiere Excel/CSV/XML/ODS desde Configuración).` },
          { inlineData: { mimeType: resultado.mimeType, data: resultado.base64 } },
        ])
      } catch (e: any) {
        aiText = `⚠️ Pude leer el archivo pero Kapi no respondió: ${e?.message || 'error desconocido'}.`
      }
    } else {
      // texto (docx / txt)
      const recorte = resultado.texto.slice(0, 12000)
      try {
        aiText = await preguntarKapi(
          `El usuario subió el documento "${resultado.nombre}". Este es su contenido:\n\n"""${recorte}"""\n\nResponde en tu tono de Kapi con lo relevante para huella de carbono, cumplimiento o financiamiento verde que encuentres. Si no hay nada relevante, dilo directamente. Aclara que este documento no entra al cálculo automático (eso requiere Excel/CSV/XML/ODS desde Configuración).`,
        )
      } catch (e: any) {
        aiText = `⚠️ Pude leer el documento pero Kapi no respondió: ${e?.message || 'error desconocido'}.`
      }
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
        ? buildSystemPrompt(content || 'Analiza esta imagen en el contexto de la operacion y su huella de carbono.', contextoPlataforma, hasData)
        : buildSystemPrompt(content, contextoPlataforma, hasData)

      if (currentImage) {
        try {
          response = await preguntarKapiConPartes([
            { text: prompt },
            { inlineData: { mimeType: currentImage.mimeType, data: currentImage.base64 } },
          ], { temperature: 0.4, maxOutputTokens: 1024 })
        } catch (e: any) { console.warn('Lectura de imagen falló:', e.message) }
        if (!response) response = getAIResponse(content)
      } else {
        response = await callGeminiAI(prompt, messages)
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
              <span className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(90,190,145,0.12)' }}>
                <KapiIcon size={34} color="#137C53" />
              </span>
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
                {/* Se deriva del mismo store que ve Kapi. Antes estaba fijo en
                    21,267 tCO2e junto al chat, mientras el inventario real
                    rondaba las 1.378: la tarjeta desmentia al asistente. */}
                {[
                  {
                    icon: Leaf,
                    label: 'Huella total',
                    value: huella.tieneDatos
                      ? `${Math.round(huella.huellaTotalTon).toLocaleString('es-PE')} tCO₂e`
                      : 'Sin dato',
                  },
                  {
                    icon: TrendingDown,
                    label: 'Intensidad',
                    value: huella.intensidadKgPorKg > 0
                      ? `${huella.intensidadKgPorKg.toFixed(3)} kgCO₂e/kg`
                      : 'Sin dato',
                  },
                  {
                    icon: BarChart3,
                    label: 'Mayor foco',
                    value: huella.hotspot.label ? `${huella.hotspot.pct}%` : 'Sin dato',
                  },
                  {
                    icon: FileText,
                    label: 'Fuentes',
                    value: `${fuentesVivas.filter((f) => f.estado === 'sincronizado').length} activas`,
                  },
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
              <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#0F3D2C' }}>
                <KapiIcon size={20} color="#FBF4D6" />
              </span>
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
                    <div className="flex-shrink-0 mt-1 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#0F3D2C' }}>
                      <KapiIcon size={17} color="#FBF4D6" />
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
                            const { certificarCooperativa, cooperativa: coop } = await import('@/lib/engine/pilotEngine')
                            const { saveAnalysisToFirestore: saveA } = await import('@/lib/integrations/firebaseService')
                            const { certificarCooperativa: cert } = await import('@/lib/engine/pilotEngine')
                            const cl = cert()
                            await saveA({ id: String(Date.now()), timestamp: new Date().toISOString(), score: cl.indiceConformidad, nivel: cl.nivel, huellaTotalTon: coop.huellaTotalTon, kilosExportados: coop.kilosExportados, scopes: coop.scopes })
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
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: '#0F3D2C' }}>
                      <KapiIcon size={17} color="#FBF4D6" />
                    </div>
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
