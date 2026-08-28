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

// Errores de permiso de Firebase (Storage/Firestore) — el texto varía por
// SDK pero ambos incluyen "permission" en el código o el mensaje.
function esErrorDePermiso(e: unknown): boolean {
  const err = e as { code?: string; message?: string }
  return /permission/i.test(err?.code || '') || /permission/i.test(err?.message || '')
}

export type EstadoSubida = 'idle' | 'subiendo' | 'procesando' | 'completado' | 'error'

// La Cloud Function tiene timeout_sec=120 (ver functions/main.py) y siempre
// escribe 'error' si algo falla dentro de ese margen — PERO si el contenedor
// muere por OOM, un cold start roto, o el trigger de Firestore nunca dispara
// para ese documento puntual, ningún 'except' lo agarra: el documento se
// queda en 'procesando' para siempre y el cliente lo mostraría colgado sin
// aviso. Este watchdog fuerza un error de timeout en el cliente cuando eso
// pasa, con margen sobre los 120s del backend para no competir con un cierre
// legítimo que esté por llegar.
const TIMEOUT_PROCESAMIENTO_MS = 150_000

// La subida a Storage (uploadBytesResumable) y la creación del documento en
// Firestore no tenían NINGÚN límite de tiempo propio — solo el
// procesamiento de la Cloud Function (después de que la subida ya
// terminó) lo tenía. Si la subida se quedaba muda a mitad de camino (red
// inestable, un navegador — Safari en particular — que deja la conexión
// colgada sin error ni progreso), el lote entero se congelaba en
// 'subiendo' para siempre, sin ningún aviso: exactamente "se congela y no
// dice qué pasa". Este timeout cubre esa fase.
const TIMEOUT_SUBIDA_MS = 60_000

function conTimeout<T>(promesa: Promise<T>, ms: number, mensaje: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(Object.assign(new Error(mensaje), { code: 'upload/timeout' })), ms)
    promesa.then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
  })
}

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
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null)

  const detenerVigilancia = useCallback(() => {
    if (watchdog.current) {
      clearTimeout(watchdog.current)
      watchdog.current = null
    }
  }, [])

  const detenerEscucha = useCallback(() => {
    dejarDeEscuchar.current?.()
    dejarDeEscuchar.current = null
    detenerVigilancia()
  }, [detenerVigilancia])

  const subir = useCallback((file: File, reintentando = false) => {
    if (!reintentando) detenerEscucha()
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
        return conTimeout(promesa, TIMEOUT_SUBIDA_MS, `La subida de "${file.name}" no respondió tras ${TIMEOUT_SUBIDA_MS / 1000}s — puede ser una red inestable o el navegador. Se continúa con el siguiente archivo.`).then(() => {
          setEstado('procesando')
          watchdog.current = setTimeout(() => {
            setError('El procesamiento tardó más de lo esperado y no respondió. Puede ser un archivo dañado o ilegible — se continúa con el siguiente.')
            setEstado('error')
            detenerEscucha()
          }, TIMEOUT_PROCESAMIENTO_MS)
          dejarDeEscuchar.current = escucharSesion(orgId, uid, sesionId, (sesion) => {
            if (!sesion) return
            if (sesion.estado === 'completado' && sesion.resultado) {
              detenerVigilancia()
              setResultado(sesion.resultado)
              setEstado('completado')
              detenerEscucha()
            } else if (sesion.estado === 'error') {
              detenerVigilancia()
              setError(sesion.error?.mensaje || 'No se pudo procesar el archivo.')
              setEstado('error')
              detenerEscucha()
            }
          })
        })
      })
      .catch(async (e) => {
        // El token de Firebase pudo quedar desactualizado a mitad de un lote
        // largo (otra pestaña con otra cuenta, reloj del sistema, etc.) —
        // antes de rendirse, se fuerza un token fresco y se reintenta UNA vez.
        if (!reintentando && esErrorDePermiso(e) && auth.currentUser) {
          try {
            await auth.currentUser.getIdToken(true)
            return subir(file, true)
          } catch { /* si ni el refresh funciona, cae al error normal abajo */ }
        }
        setEstado('error')
        // El código real (storage/unauthorized, permission-denied,
        // storage/unauthenticated...) es lo único que distingue "regla de
        // seguridad rechazó esto" de "token vencido" de "bucket mal
        // configurado" — sin él, todo error de permiso se ve igual y no se
        // puede diagnosticar a distancia. Se agrega siempre al mensaje.
        const err = e as { code?: string; message?: string }
        const base = err?.message || (e instanceof Error ? e.message : 'No se pudo subir el archivo a Storage.')
        const codigo = err?.code ? ` [${err.code}]` : ''
        setError(reintentando ? `${base}${codigo} (persiste tras renovar la sesión — archivo: ${file.name})` : `${base}${codigo}`)
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
