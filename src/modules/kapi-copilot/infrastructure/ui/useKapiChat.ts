'use client'

// ============================================================
// AgroFinance — Lógica compartida de Kapi (chat, voz, archivos, registro)
// ------------------------------------------------------------
// Antes esta lógica vivía duplicada en CopilotDrawer.tsx (widget flotante)
// y app/copilot/page.tsx (página completa) — ~1.800 líneas casi idénticas
// que habían divergido con el tiempo (distinto temperature/maxOutputTokens
// en las llamadas a Gemini, la página con su propio estado de mensajes en
// vez del ChatContext compartido). Se unificó tomando como referencia el
// comportamiento del Drawer (más reciente):
//   · temperature 0.3 / maxOutputTokens 2048 en las respuestas normales
//   · el mismo hilo de mensajes (ChatContext) para las dos superficies —
//     antes la página tenía su propia conversación local, desincronizada
//     del widget flotante aunque las dos guardaran en el mismo Firestore.
// Cada superficie (CopilotDrawer.tsx, CopilotFullView.tsx) solo pone su
// JSX; toda la lógica vive acá una sola vez.
// ============================================================

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useChat, type Message } from '@/core/providers/ChatContext'
import { cooperativa, certificarCooperativa, coberturaDe } from '@/modules/carbon-accounting/domain/pilotEngine'
import { saveAnalysisToFirestore } from '@/modules/carbon-accounting/infrastructure/repositories/analysisRepository'
import {
  saveChatMessageToFirestore, getChatHistoryFromFirestore,
  saveRegistroToFirestore, getRegistrosFromFirestore, type Registro,
} from '@/modules/kapi-copilot/infrastructure/repositories/chatRepository'
import { startRecording, type Recorder } from '@/modules/kapi-copilot/infrastructure/services/speech'
import { preguntarKapi, preguntarKapiConPartes, preguntarKapiConHistorial } from '@/modules/kapi-copilot/infrastructure/services/kapiAI'
import { playKapiNotification } from '@/modules/kapi-copilot/infrastructure/services/notificationSound'
import { analizarArchivoChat } from '@/modules/data-loader/infrastructure/parsers/chatFileAnalysis'
import { useFuentesDatos, fuentesActivasDesde } from '@/modules/data-loader/domain/datosPrueba'
import { useHuellaConsolidada } from '@/modules/carbon-accounting/domain/huellaConsolidada'
import { construirProductos } from '@/modules/carbon-accounting/domain/analyticsData'
import { useGastoAmbiental, resumirGasto } from '@/modules/water-and-esg/domain/gastoAmbiental'
import { resumirODS } from '@/modules/water-and-esg/domain/ods'
import { useInocuidad, resumirTodos } from '@/modules/water-and-esg/domain/inocuidad'
import { useHuellaHidrica } from '@/modules/water-and-esg/domain/huellaHidrica'
import { construirAcciones } from '@/modules/green-financing/domain/reduccionActions'
import { construirContextoPlataforma, REGLAS_DATOS } from '@/modules/kapi-copilot/domain/contextoKapi'
import { auth } from '@/core/config/firebase.client'

function claveHasData(): string {
  return `agrofinance_has_data_${auth.currentUser?.uid || 'invitado'}`
}

export const suggestedQuestions = [
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

// --- KAPI INTELLIGENCE SYSTEM ---
// Sin claves aqui: todo sale por /api/chat, que es quien las guarda. Lo que
// se escribe en un archivo de cliente viaja en el bundle a cualquier visitante.
// `historial` son los turnos previos del hilo; `prompt` es el turno actual
// ya enriquecido con los datos de la empresa. Mandar solo el prompt hacía
// que Kapi perdiera el hilo entre una pregunta y la siguiente.
async function callGeminiAI(prompt: string, historial: Message[] = []): Promise<string> {
  const turnos = historial
    .filter((m) => typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', content: m.content }))
  turnos.push({ role: 'user', content: prompt })
  return preguntarKapiConHistorial(turnos, { temperature: 0.3, maxOutputTokens: 2048 })
}

// Transcribe audio (base64) a texto, tambien via servidor.
async function transcribeAudioWithGemini(base64: string, mimeType: string): Promise<string> {
  const texto = await preguntarKapiConPartes(
    [
      { text: 'Transcribe exactamente este audio en espanol. Devuelve SOLO el texto dictado, sin comillas ni comentarios.' },
      { inlineData: { mimeType, data: base64 } },
    ],
    { temperature: 0, maxOutputTokens: 1024 },
  )
  if (!texto) throw new Error('No se pudo transcribir el audio.')
  return texto
}

// Mismo criterio en las dos superficies: el contexto llega vivo desde
// contextoKapi (store consolidado), no de la constante demo ni de valores
// escritos a mano.
function buildSystemPrompt(userQuestion: string, contexto: string, hasData: boolean): string {
  const estado = hasData
    ? contexto
    : [
        contexto,
        '',
        'NOTA: no hay fuentes vinculadas. Responde de forma util y educativa, y menciona que puede',
        'cargar sus archivos con el boton de adjuntar. No inventes cifras de la empresa.',
      ].join(String.fromCharCode(10))

  return `Eres Kapi, un capibara carismatico y experto en inteligencia climatica, agricultura sostenible y finanzas verdes. Calido, directo y profesional.

Reglas de estilo:
1. Markdown limpio, listas cortas, algun emoji relevante.
2. Maximo 300 palabras.
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

export const TIPO_LABEL: Record<string, string> = {
  almacen: 'Almacén', cosecha: 'Cosecha', envio: 'Envío', insumo: 'Insumo', otro: 'Otro',
}

// El hook se monta por separado en CopilotDrawer y en CopilotFullView, pero
// los mensajes viven en ChatContext (compartidos). Sin esta bandera, cada
// vez que se abre la superficie que faltaba, su propio montaje volvía a
// pedir el historial a Firestore y pisaba la conversación ya en curso en
// memoria (incluido el caso sin datos en Firestore, donde el "else" ponía
// el mensaje de bienvenida encima de lo que el usuario ya había hablado).
let historialYaCargado = false

export function useKapiChat() {
  const router = useRouter()
  const { messages, setMessages, isTyping, setIsTyping } = useChat()
  const [hasData, setHasData] = useState(false)
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'chat' | 'registro'>('chat')
  const [registros, setRegistros] = useState<Registro[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null)
  const [pendingFile, setPendingFile] = useState<{ file: File; name: string; size: number; type: string } | null>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [, setFuentes] = useFuentesDatos()

  // Estado vivo de la plataforma — mismo store que el resto de la app.
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

    // analizarArchivoChat no estaba envuelto en try/catch: si lanzaba (archivo
    // corrupto, error de red, excepción del parser), isTyping se quedaba en
    // true para siempre — el chat entero quedaba "escribiendo..." y el input
    // deshabilitado sin ningún mensaje de error, sin forma de recuperarse
    // salvo recargar la página.
    let resultado: Awaited<ReturnType<typeof analizarArchivoChat>>
    try {
      resultado = await analizarArchivoChat(archivo)
    } catch (e) {
      setIsTyping(false)
      setIsProcessingFile(false)
      const motivo = e instanceof Error ? e.message : 'error desconocido'
      const aiMsg: Message = { role: 'ai', content: `⚠️ No pude procesar **${pendingFile.name}**: ${motivo}`, time: now() }
      setMessages(prev => [...prev, aiMsg])
      saveChatMessageToFirestore({ role: 'model', text: aiMsg.content })
      return
    }
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
      localStorage.setItem(claveHasData(), 'true')
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
    const dataLoaded = localStorage.getItem(claveHasData()) === 'true'
    setHasData(dataLoaded)

    if (historialYaCargado) return
    historialYaCargado = true

    getChatHistoryFromFirestore().then((dbMsgs) => {
      if (dbMsgs.length > 0) {
        setMessages(dbMsgs.map(m => ({
          role: m.role === 'user' ? 'user' : 'ai',
          content: m.text,
          time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
          type: 'text',
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
          },
        ])
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    getRegistrosFromFirestore().then(setRegistros)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

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

    saveChatMessageToFirestore({ role: 'user', text: content || '[imagen]' })

    // ── Multifunción: módulo de registro operacional ──
    // Se activa con el "Modo Registro" o con frases tipo "registrar / anota / agrega…", pero lo saltamos si hay imagen.
    if (!currentImage && (mode === 'registro' || REGISTRO_TRIGGERS.test(content))) {
      const now = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
      const reg = parseRegistro(content)
      setIsTyping(false)
      if (reg) {
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
          response = await preguntarKapiConPartes(
            [
              { text: prompt },
              { inlineData: { mimeType: currentImage.mimeType, data: currentImage.base64 } },
            ],
            { temperature: 0.4, maxOutputTokens: 1024 },
          )
        } catch (e) {
          console.warn('Lectura de imagen no disponible, usando respuesta local:', e)
          response = getAIResponse(content)
        }
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
    saveChatMessageToFirestore({ role: 'model', text: response })
  }

  // Micrófono: graba audio → transcribe con Gemini → lo manda por el pipeline normal
  const toggleRecording = async () => {
    if (isTranscribing) return

    if (isRecording) {
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

  // Botón "Autocargar datos demo" dentro de un mensaje — carga diferida
  // porque solo se necesita si el usuario hace clic (no en cada mensaje).
  const autocargarDatosDemo = async () => {
    const { certificarCooperativa: cert, cooperativa: coop } = await import('@/modules/carbon-accounting/domain/pilotEngine')
    const { saveAnalysisToFirestore: saveA } = await import('@/modules/carbon-accounting/infrastructure/repositories/analysisRepository')
    const cl = cert()
    await saveA({ id: String(Date.now()), timestamp: new Date().toISOString(), score: cl.indiceConformidad, nivel: cl.nivel, huellaTotalTon: coop.huellaTotalTon, kilosExportados: coop.kilosExportados, scopes: coop.scopes })
    localStorage.setItem(claveHasData(), 'true')
    setHasData(true)
    setMessages(prev => [...prev, {
      role: 'ai',
      content: '✅ ¡**Datos cargados!** Tus indicadores ESG ya están activos. Ahora puedo responderte con tus números reales.\n\n- **Huella Total:** ' + Math.round(coop.huellaTotalTon) + ' tCO₂e\n- **Scope 3** (transporte marítimo): ' + coop.scopes.s3.toFixed(1) + ' tCO₂e\n\n¿Qué quieres analizar primero?',
      time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
    }])
  }

  return {
    // datos vivos de la plataforma
    hasData, huella, fuentesVivas,
    // conversación (compartida via ChatContext)
    messages, isTyping,
    // input / modo
    input, setInput, mode, setMode,
    // registro operacional
    registros,
    // audio
    isRecording, isTranscribing, toggleRecording,
    // archivos / imagen
    pendingImage, setPendingImage, pendingFile, setPendingFile, isProcessingFile,
    handleImageSelect, handleDataFileSelect, processDataFile,
    // refs de UI
    bottomRef, imageInputRef, dataFileInputRef,
    // acciones
    sendMessage, autocargarDatosDemo,
    // constantes de UI
    suggestedQuestions,
  }
}

export { formatMessage } from './formatMessage'
