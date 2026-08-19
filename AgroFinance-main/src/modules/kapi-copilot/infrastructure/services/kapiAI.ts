'use client'

// ============================================================
// AgroFinance — Cliente de Kapi AI
// ------------------------------------------------------------
// Único camino del navegador hacia el modelo. Pasa siempre por nuestra
// ruta de servidor (/api/chat), que es la que guarda la clave.
//
// El navegador NO debe conocer ninguna clave de Google: lo que se escribe
// en un archivo del cliente termina en el bundle que se descarga cualquier
// visitante, y también dentro de cualquier export estático versionado.
// ============================================================

// next.config declara trailingSlash: true, así que la barra final evita un
// redirect 308 que convertiría el POST en GET y perdería el cuerpo.
const RUTA = '/api/chat/'

export class KapiSinConfigurar extends Error {}

/** Parte de contenido en el formato que espera Gemini. */
export type ParteContenido =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }

type Opciones = {
  systemInstruction?: string
  temperature?: number
  maxOutputTokens?: number
}

async function pedir(cuerpo: Record<string, unknown>): Promise<string> {
  const res = await fetch(RUTA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  })

  if (res.status === 503) {
    // Falta la clave en el servidor: no es un error de programación, es una
    // dependencia sin configurar. Se distingue para que quien llama use su
    // respuesta local en vez de mostrar un fallo.
    throw new KapiSinConfigurar('Kapi no está configurado en este entorno')
  }
  if (!res.ok) throw new Error(`Kapi respondió ${res.status}`)

  const data = await res.json()
  const texto = data.response || data.reply || data.message
  if (!texto) throw new Error('Kapi devolvió una respuesta vacía')
  return String(texto).trim()
}

/** Pregunta de texto libre, sin memoria de la conversación. */
export const preguntarKapi = (prompt: string, opciones: Opciones = {}) =>
  pedir({ message: prompt, ...opciones })

/** Un turno de la conversación, como lo guarda la pantalla de chat. */
export type TurnoChat = { role: string; content: string }

/**
 * Pregunta CON el hilo de la conversación. Es la que deben usar las
 * pantallas de chat: sin el historial, Kapi no puede resolver un "¿y eso
 * por qué?" ni recordar de qué cultivo se venía hablando, porque cada
 * llamada le llega como si fuera la primera.
 *
 * `historial` incluye el mensaje actual del usuario como último elemento.
 */
export const preguntarKapiConHistorial = (historial: TurnoChat[], opciones: Opciones = {}) =>
  pedir({ messages: historial, ...opciones })

/** Contenido multimodal: audio para transcribir, imágenes para leer. */
export const preguntarKapiConPartes = (partes: ParteContenido[], opciones: Opciones = {}) =>
  pedir({ parts: partes, ...opciones })
