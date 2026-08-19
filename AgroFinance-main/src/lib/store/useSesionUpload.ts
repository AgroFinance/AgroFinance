'use client'

// ============================================================
// AgroFinance — Hook de carga asíncrona (Storage + Firestore + Cloud Function)
// ------------------------------------------------------------
// Junta crearSesion + escucharSesion (lib/integrations/sesiones.ts) en
// una sola API para las pantallas de carga real: sube el archivo, crea
// la sesión 'pendiente', escucha hasta que la Cloud Function la deja en
// 'completado' o 'error', y expone el resultado.
//
// El botón de demo de 1 clic (handleSimulateDemoXml en /upload) NO usa
// este hook a propósito — sigue con el motor síncrono en el navegador,
// para tener una demo rápida sin depender de red/Function.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Unsubscribe } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { crearSesion, escucharSesion, type ResultadoSesion } from '@/lib/integrations/sesiones'

export type EstadoSubida = 'idle' | 'subiendo' | 'procesando' | 'completado' | 'error'

export function useSesionUpload() {
  const { firebaseUserId, orgId } = useAuth()
  const [estado, setEstado] = useState<EstadoSubida>('idle')
  const [progresoSubida, setProgresoSubida] = useState(0)
  const [resultado, setResultado] = useState<ResultadoSesion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dejarDeEscuchar = useRef<Unsubscribe | null>(null)

  const detenerEscucha = useCallback(() => {
    dejarDeEscuchar.current?.()
    dejarDeEscuchar.current = null
  }, [])

  const subir = useCallback((file: File) => {
    if (!firebaseUserId) {
      setEstado('error')
      setError('No se pudo iniciar la sesión con Firebase todavía. Espera un segundo y vuelve a intentarlo.')
      return
    }

    detenerEscucha()
    setEstado('subiendo')
    setProgresoSubida(0)
    setError(null)
    setResultado(null)

    const { sesionId, promesa } = crearSesion(orgId, firebaseUserId, file, setProgresoSubida)

    promesa
      .then(() => {
        setEstado('procesando')
        dejarDeEscuchar.current = escucharSesion(orgId, firebaseUserId, sesionId, (sesion) => {
          if (!sesion) return
          if (sesion.estado === 'completado' && sesion.resultado) {
            setResultado(sesion.resultado)
            setEstado('completado')
            detenerEscucha()
          } else if (sesion.estado === 'error') {
            setError(sesion.error?.mensaje || 'No se pudo procesar el archivo.')
            setEstado('error')
            detenerEscucha()
          }
        })
      })
      .catch((e) => {
        setEstado('error')
        setError(e instanceof Error ? e.message : 'No se pudo subir el archivo a Storage.')
      })
  }, [orgId, firebaseUserId, detenerEscucha])

  const reset = useCallback(() => {
    detenerEscucha()
    setEstado('idle')
    setProgresoSubida(0)
    setResultado(null)
    setError(null)
  }, [detenerEscucha])

  useEffect(() => detenerEscucha, [detenerEscucha])

  return { estado, progresoSubida, resultado, error, subir, reset }
}
