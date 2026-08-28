'use client'

// ============================================================
// AgroFinance — Diagnóstico visible de errores
// ------------------------------------------------------------
// Hasta ahora un error real (JS, Firebase, red) que no tuviera un catch
// específico se perdía en la consola del navegador — invisible para
// cualquiera que no sepa abrir DevTools. Un usuario real (o su amigo
// probando en Mac) solo veía "no funciona", sin ningún dato para
// diagnosticar a distancia.
//
// Este overlay escucha TODO error no capturado (window.onerror) y toda
// promesa rechazada sin catch (unhandledrejection) — los dos casos que
// un try/catch puntual no cubre — y los muestra en una franja roja fija,
// imposible de ignorar, con: mensaje, nombre/código técnico, navegador y
// sistema operativo (clave para diferenciar "falla en Mac/Safari" de
// "falla en todos lados"), y un botón para copiar todo el diagnóstico
// listo para pegar en un mensaje.
// ============================================================

import { useEffect, useState } from 'react'

type ErrorCapturado = {
  id: string
  mensaje: string
  nombre: string
  stack?: string
  origen: 'error' | 'promesa'
  hora: string
}

function detectarEntorno(): string {
  if (typeof navigator === 'undefined') return 'entorno desconocido'
  const ua = navigator.userAgent
  const esSafari = /^((?!chrome|android).)*safari/i.test(ua)
  const esMac = /Macintosh|Mac OS X/i.test(ua)
  const esIOS = /iPhone|iPad|iPod/i.test(ua)
  const navegador = esSafari ? 'Safari' : /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Edg/i.test(ua) ? 'Edge' : 'navegador desconocido'
  const so = esIOS ? 'iOS' : esMac ? 'macOS' : /Windows/i.test(ua) ? 'Windows' : /Android/i.test(ua) ? 'Android' : /Linux/i.test(ua) ? 'Linux' : 'SO desconocido'
  return `${navegador} en ${so}`
}

export default function ErrorOverlay() {
  const [errores, setErrores] = useState<ErrorCapturado[]>([])
  const [expandido, setExpandido] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  useEffect(() => {
    const hora = () => new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

    const agregar = (e: Omit<ErrorCapturado, 'id' | 'hora'>) => {
      setErrores((prev) => {
        // No repetir el mismo error en menos de 3s (los listeners globales
        // pueden disparar duplicados para la misma falla).
        const reciente = prev.find((p) => p.mensaje === e.mensaje && p.origen === e.origen)
        if (reciente) return prev
        return [...prev, { ...e, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, hora: hora() }].slice(-4)
      })
    }

    const onError = (ev: ErrorEvent) => {
      agregar({
        mensaje: ev.message || 'Error sin mensaje',
        nombre: ev.error?.name || 'Error',
        stack: ev.error?.stack,
        origen: 'error',
      })
    }
    const onRechazo = (ev: PromiseRejectionEvent) => {
      const r = ev.reason
      agregar({
        mensaje: r?.message || String(r) || 'Promesa rechazada sin mensaje',
        nombre: r?.code || r?.name || 'UnhandledRejection',
        stack: r?.stack,
        origen: 'promesa',
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRechazo)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRechazo)
    }
  }, [])

  if (!errores.length) return null

  const copiarDiagnostico = (err: ErrorCapturado) => {
    const texto = [
      `AgroFinance — diagnóstico de error`,
      `Hora: ${err.hora}`,
      `Entorno: ${detectarEntorno()}`,
      `Origen: ${err.origen === 'error' ? 'excepción JS' : 'promesa sin manejar'}`,
      `Nombre/código: ${err.nombre}`,
      `Mensaje: ${err.mensaje}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : '—'}`,
      err.stack ? `\nStack:\n${err.stack}` : '',
    ].join('\n')
    navigator.clipboard?.writeText(texto).then(() => {
      setCopiado(err.id)
      setTimeout(() => setCopiado(null), 2000)
    })
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] flex flex-col gap-2 p-3 pointer-events-none">
      {errores.map((err) => (
        <div
          key={err.id}
          className="pointer-events-auto mx-auto w-full max-w-2xl rounded-2xl border-2 border-red-500 bg-red-50 shadow-2xl overflow-hidden"
        >
          <div className="flex items-start gap-3 p-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-lg">!</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wide text-red-700">Algo falló · {err.hora}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-200 text-red-800">{err.nombre}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">{detectarEntorno()}</span>
              </div>
              <p className="text-sm font-semibold text-red-900 mt-1 break-words">{err.mensaje}</p>
              {err.stack && (
                <button
                  onClick={() => setExpandido(expandido === err.id ? null : err.id)}
                  className="text-xs text-red-600 underline mt-1"
                >
                  {expandido === err.id ? 'Ocultar detalle técnico' : 'Ver detalle técnico'}
                </button>
              )}
              {expandido === err.id && err.stack && (
                <pre className="mt-2 text-[10px] bg-red-900 text-red-50 rounded-lg p-2 overflow-x-auto max-h-40 whitespace-pre-wrap">{err.stack}</pre>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => copiarDiagnostico(err)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  {copiado === err.id ? '✓ Copiado' : 'Copiar diagnóstico'}
                </button>
                <button
                  onClick={() => setErrores((prev) => prev.filter((e) => e.id !== err.id))}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-red-300 text-red-700 hover:bg-red-100 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
