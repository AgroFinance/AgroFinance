'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

export type Message = {
  role: 'user' | 'ai'
  content: string
  time: string
  type?: 'text' | 'insight' | 'alert'
  imageUrl?: string
  showAutoload?: boolean
}

export const initialMessages: Message[] = [
  {
    role: 'ai',
    content: '¡Hola! Soy **Kapi**, tu asistente de inteligencia climática 🌱\n\nEstoy conectado a tus datos ESG y puedo ayudarte a:\n- Analizar tus emisiones Scope 1, 2 y 3\n- Generar reportes HC Perú automáticamente\n- Identificar oportunidades de reducción de carbono\n- Responder preguntas sobre tu cumplimiento ESG\n\n¿Por dónde empezamos?',
    time: 'Ahora',
    type: 'text',
  },
]

interface ChatContextType {
  isChatOpen: boolean
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  isTyping: boolean
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>
  clearHistory: () => void
  /** Texto en espera de ser enviado por el chat oficial (CopilotDrawer). */
  mensajeExterno: string | null
  /**
   * Punto de entrada para que otras superficies (el teléfono de la landing,
   * un botón "preguntar a Kapi" en cualquier página) entreguen una pregunta
   * al chat real en vez de mantener su propia conversación aislada — así
   * solo hay UN Kapi que de verdad conversa, con UN historial persistido.
   */
  enviarDesdeExterno: (texto: string) => void
  /** CopilotDrawer llama esto tras consumir mensajeExterno. */
  limpiarMensajeExterno: () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

// Historial de Kapi por usuario: sin backend, así que vive en localStorage
// con una clave distinta por email. "invitado" cubre el modo sin sesión —
// se separa para no mezclar conversaciones de invitado con las de una
// cuenta real que inicia sesión después en el mismo navegador.
const claveHistorial = (email: string | undefined) => `agrofinance_chat_${email || 'invitado'}`

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isTyping, setIsTyping] = useState(false)
  const usuarioCargado = useRef<string | null>(null)

  // Carga el historial correspondiente cuando se resuelve la sesión o cambia
  // de usuario (login/logout en la misma pestaña).
  useEffect(() => {
    if (loading) return
    const clave = claveHistorial(user?.email)
    if (usuarioCargado.current === clave) return
    usuarioCargado.current = clave
    try {
      const raw = localStorage.getItem(clave)
      setMessages(raw ? (JSON.parse(raw) as Message[]) : initialMessages)
    } catch {
      setMessages(initialMessages)
    }
  }, [loading, user?.email])

  // Persiste cada cambio del historial ya cargado, bajo la clave activa.
  useEffect(() => {
    if (loading || !usuarioCargado.current) return
    try {
      localStorage.setItem(usuarioCargado.current, JSON.stringify(messages))
    } catch { /* localStorage lleno o no disponible: no bloquea el chat */ }
  }, [messages, loading])

  const [mensajeExterno, setMensajeExterno] = useState<string | null>(null)

  const openChat = () => setIsChatOpen(true)
  const closeChat = () => setIsChatOpen(false)
  const toggleChat = () => setIsChatOpen((prev) => !prev)
  const clearHistory = () => {
    setMessages(initialMessages)
    try {
      if (usuarioCargado.current) localStorage.removeItem(usuarioCargado.current)
    } catch { /* ignore */ }
  }
  const enviarDesdeExterno = (texto: string) => {
    setMensajeExterno(texto)
    setIsChatOpen(true)
  }
  const limpiarMensajeExterno = () => setMensajeExterno(null)

  // El teléfono de la landing vive en una raíz de React aparte (montada a
  // mano dentro del HTML estático de referencia, ver ReferenceLandingShell)
  // y por lo tanto no puede usar useChat(): no comparte árbol de contexto
  // con este provider. Un evento de window sí cruza esa frontera.
  useEffect(() => {
    const onPregunta = (e: Event) => {
      const texto = (e as CustomEvent<{ texto: string }>).detail?.texto
      if (texto) enviarDesdeExterno(texto)
    }
    window.addEventListener('agrofinance:kapi-pregunta', onPregunta)
    return () => window.removeEventListener('agrofinance:kapi-pregunta', onPregunta)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ChatContext.Provider value={{
      isChatOpen, openChat, closeChat, toggleChat,
      messages, setMessages,
      isTyping, setIsTyping,
      clearHistory,
      mensajeExterno, enviarDesdeExterno, limpiarMensajeExterno,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
