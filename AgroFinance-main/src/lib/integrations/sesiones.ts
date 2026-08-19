'use client'

// ============================================================
// AgroFinance — Cola de sesiones (cliente)
// ------------------------------------------------------------
// Sube el archivo original a Cloud Storage y crea el documento de la
// sesión en Firestore ('pendiente'). La Cloud Function (functions/main.py)
// hace el resto: descarga, parsea, clasifica y escribe el resultado de
// vuelta. Este módulo solo sube y escucha — nunca calcula nada él mismo.
//
// Ruta: organizaciones/{orgId}/usuarios/{userId}/sesiones/{sesionId} —
// mismo esquema que firestore.rules, donde userId es el uid real de
// Firebase Anonymous Auth (ver asegurarSesionAnonima en ./firebase).
// ============================================================

import {
  doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe,
} from 'firebase/firestore'
import { ref, uploadBytesResumable, type UploadTaskSnapshot } from 'firebase/storage'
import { db, storage } from './firebase'
import { huellaArchivo, type CabeceraUBL } from '@/lib/parsing/parseArchivo'
import type { LineaClasificada } from '@/lib/engine/ghgClassify'

export type EstadoSesion = 'pendiente' | 'procesando' | 'completado' | 'error' | 'cancelado'

export type ResultadoSesion = {
  resumen: {
    leidas: number
    ignoradas: number
    emisionKg: number
    emisionTon: number
    scopes: { s1: number; s2: number; s3: number }
    porMecanismo: Record<string, number>
  }
  /** Solo presente para .xml (SUNAT UBL) — null en .xlsx/.csv. */
  cabecera: CabeceraUBL | null
  hojas: string[]
  columnas: string[]
  filasPreview: (string | number)[][]
  lineasPreview: LineaClasificada[]
  lineasCompletasPath: string | null
}

export type SesionDoc = {
  version: 'v1'
  estado: EstadoSesion
  archivo: { nombre: string; tipo: string; tamanoBytes: number; storagePath: string; huella: string }
  resultado: ResultadoSesion | null
  error: { mensaje: string; codigo: string } | null
}

const ext = (nombre: string) => (nombre.split('.').pop() || '').toLowerCase()

/** Deriva un id de sesión estable a partir del archivo (RNF-7.4
 *  idempotencia — resubir el mismo archivo reintenta la misma sesión
 *  en vez de encolar trabajo duplicado). */
function idDeSesion(file: File): string {
  return huellaArchivo(file).replace(/[^a-zA-Z0-9]/g, '-').slice(0, 140)
}

function rutaSesion(orgId: string, userId: string, sesionId: string): string {
  return `organizaciones/${orgId}/usuarios/${userId}/sesiones/${sesionId}`
}

/**
 * Sube el archivo original a Cloud Storage y crea la sesión en 'pendiente'.
 * onProgreso recibe el progreso REAL de la subida (0-100).
 */
export function crearSesion(
  orgId: string,
  userId: string,
  file: File,
  onProgreso: (pct: number) => void,
): { sesionId: string; promesa: Promise<void> } {
  const sesionId = idDeSesion(file)
  const tipo = ext(file.name)
  const storagePath = `${rutaSesion(orgId, userId, sesionId)}/original.${tipo}`

  const promesa = new Promise<void>((resolve, reject) => {
    const tarea = uploadBytesResumable(ref(storage, storagePath), file)
    tarea.on(
      'state_changed',
      (snap: UploadTaskSnapshot) => onProgreso(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      () => {
        const sesion: SesionDoc = {
          version: 'v1',
          estado: 'pendiente',
          archivo: { nombre: file.name, tipo, tamanoBytes: file.size, storagePath, huella: huellaArchivo(file) },
          resultado: null,
          error: null,
        }
        setDoc(doc(db, rutaSesion(orgId, userId, sesionId)), {
          ...sesion,
          creadoEn: serverTimestamp(),
          actualizadoEn: serverTimestamp(),
          procesadoEn: null,
        })
          .then(resolve)
          .catch(reject)
      },
    )
  })

  return { sesionId, promesa }
}

/** Escucha una sesión en tiempo real. Devuelve la función para dejar de
 *  escuchar (llamarla al desmontar / al terminar). */
export function escucharSesion(
  orgId: string,
  userId: string,
  sesionId: string,
  cb: (sesion: SesionDoc | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, rutaSesion(orgId, userId, sesionId)), (snap) => {
    cb(snap.exists() ? (snap.data() as SesionDoc) : null)
  })
}
