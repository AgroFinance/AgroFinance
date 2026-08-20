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
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/core/config/firebase.client'
import { useAuth } from '@/core/providers/AuthContext'
import { crearSesion, escucharSesion, type ResultadoSesion } from '@/modules/data-loader/infrastructure/services/sesiones'

export type EstadoSubida = 'idle' | 'subiendo' | 'procesando' | 'completado' | 'error'

// El uid de AuthContext (estado de React) puede no haberse re-renderizado
// todavía justo después de loguearse y navegar a /upload — auth.currentUser
// (el SDK, no React) suele ya tenerlo. Se usa ese primero, y solo si de
// verdad no hay nadie logueado se escucha onAuthStateChanged con un margen
// razonable antes de darlo por error real.
function esperarUidFirebase(timeoutMs = 8000): Promise<string> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser.uid)
  return new Promise((resolve, reject) => {
    const limite = setTimeout(() => {
      dejarDeEscuchar()
      reject(new Error('No se pudo iniciar la sesión con Firebase. Recarga la página e intenta de nuevo.'))
    }, timeoutMs)
    const dejarDeEscuchar = onAuthStateChanged(auth, (u) => {
      if (u) {
        clearTimeout(limite)
        dejarDeEscuchar()
        resolve(u.uid)
      }
    })
  })
}

export function useSesionUpload() {
  const { orgId } = useAuth()
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
    detenerEscucha()
    // 'subiendo' se activa de inmediato — aunque falte esperar el uid, el
    // usuario ve la animación de carga desde el primer instante, nunca un
    // error instantáneo por una carrera de tiempos con el login.
    setEstado('subiendo')
    setProgresoSubida(0)
    setError(null)
    setResultado(null)

    esperarUidFirebase()
      .then((uid) => {
        const { sesionId, promesa } = crearSesion(orgId, uid, file, setProgresoSubida)
        return promesa.then(() => {
          setEstado('procesando')
          dejarDeEscuchar.current = escucharSesion(orgId, uid, sesionId, (sesion) => {
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
      })
      .catch((e) => {
        setEstado('error')
        setError(e instanceof Error ? e.message : 'No se pudo subir el archivo a Storage.')
      })
  }, [orgId, detenerEscucha])

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
