// Persistencia en el MISMO Firestore que la app web (colecciones chats y registros),
// para que la conversación por WhatsApp sea la misma Kapi y quede guardada.

const { initializeApp, getApps } = require('firebase/app')
const { getFirestore, collection, addDoc } = require('firebase/firestore')

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let db = null
const enabled = !!firebaseConfig.projectId

if (enabled) {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  db = getFirestore(app)
} else {
  console.warn('[Firestore] Sin config (.env.local) — no se guardarán datos, pero el bot funciona.')
}

async function saveChatMessage(role, text, channel = 'whatsapp') {
  if (!db) return
  try {
    await addDoc(collection(db, 'chats'), { role, text, channel, createdAt: new Date().toISOString() })
  } catch (e) {
    console.warn('[Firestore] chat no guardado:', e.message)
  }
}

async function saveRegistro(registro) {
  if (!db) return null
  try {
    const ref = await addDoc(collection(db, 'registros'), {
      ...registro,
      canal: 'whatsapp',
      createdAt: new Date().toISOString(),
    })
    return ref.id
  } catch (e) {
    console.warn('[Firestore] registro no guardado:', e.message)
    return null
  }
}

module.exports = { saveChatMessage, saveRegistro, firestoreEnabled: enabled }
