import { initializeApp, getApps } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getAnalytics, isSupported } from 'firebase/analytics'

// Replace with your Firebase project configuration
// Get this from: Firebase Console → Project Settings → Your apps → SDK setup and configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'YOUR_PROJECT.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_SENDER_ID',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'YOUR_APP_ID',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'YOUR_MEASUREMENT_ID',
}

// Initialize Firebase (avoid duplicate initialization in Next.js)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Emuladores locales — solo si el desarrollador los prende a propósito
// (NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true), nunca por defecto: así el
// dev server sigue funcionando igual aunque nadie haya corrido
// `firebase emulators:start`. Ver README de functions/ para el flujo.
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
  const w = window as unknown as { __agrofinanceEmuladoresConectados?: boolean }
  if (!w.__agrofinanceEmuladoresConectados) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    connectStorageEmulator(storage, '127.0.0.1', 9199)
    w.__agrofinanceEmuladoresConectados = true
  }
}

// FASE 1 del backend de sesiones (ver plan): orgId es una constante fija
// porque hoy solo existe UN cliente real (el login maestro). Cuando haya
// alta de organizaciones reales, esto se reemplaza por un valor derivado
// de la membresía del usuario — el esquema de Firestore ya está listo
// para ese cambio sin migrar datos.
export const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || 'agrofinance-demo-org'

let sesionAnonimaLista: Promise<string> | null = null
/**
 * Garantiza una sesión de Firebase Anonymous Auth y devuelve su uid real.
 * A diferencia del `uid: Date.now()` de AuthContext (auto-asignado por el
 * cliente, sin nada detrás), este uid lo emite y firma Firebase — es lo
 * único que firestore.rules/storage.rules pueden verificar de verdad vía
 * `request.auth.uid` para aislar los datos de cada sesión.
 */
export function asegurarSesionAnonima(): Promise<string> {
  if (!sesionAnonimaLista) {
    sesionAnonimaLista = new Promise((resolve, reject) => {
      const dejarDeEscuchar = onAuthStateChanged(
        auth,
        (u) => {
          if (u) {
            dejarDeEscuchar()
            resolve(u.uid)
          }
        },
        reject,
      )
      if (!auth.currentUser) {
        signInAnonymously(auth).catch(reject)
      }
    })
  }
  return sesionAnonimaLista
}

// Analytics (only in browser)
export const getFirebaseAnalytics = async () => {
  if (typeof window !== 'undefined' && await isSupported()) {
    return getAnalytics(app)
  }
  return null
}

export default app
