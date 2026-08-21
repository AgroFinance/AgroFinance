import { db, auth } from './firebase'
import { collection, addDoc, getDocs, query, where, orderBy, limit, writeBatch } from 'firebase/firestore'

export interface AnalysisData {
  id: string
  timestamp: string
  score: number
  nivel: string
  huellaTotalTon: number
  kilosExportados: number
  scopes: { s1: number; s2: number; s3: number }
}

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

// Registro operacional capturado conversacionalmente con Kapi (almacén, cosecha, envíos, etc.)
export interface Registro {
  id?: string
  tipo: string          // 'almacen' | 'cosecha' | 'envio' | 'insumo' | 'otro'
  producto: string
  cantidad: number
  unidad: string        // 'kg' | 't' | 'cajas' | 'L' | 'u'
  almacen?: string
  nota?: string
  fecha: string         // ISO date capturada
  createdAt?: string
}

// Antes 'analyses'/'chats'/'registros' eran colecciones planas sin dueño:
// cualquier sesión firmada leía/escribía los documentos de cualquier otra
// (ver firestore.rules, antes solo exigían signedIn()). Con cuentas reales
// esto sería una fuga de datos entre clientes — cada doc ahora lleva el uid
// de quien lo escribió, y cada lectura filtra por el uid activo. `uid()`
// lee el uid actual de auth.currentUser en vez de pedirlo a cada llamador,
// para no tener que tocar cada punto de la app que usa estas funciones.
function uid(): string | null {
  return auth.currentUser?.uid ?? null
}

// ESG Analysis Operations
export async function saveAnalysisToFirestore(analysis: AnalysisData) {
  try {
    const owner = uid()
    if (!owner) return null
    const docRef = await addDoc(collection(db, 'analyses'), {
      ...analysis,
      uid: owner,
      createdAt: new Date().toISOString()
    })
    return docRef.id
  } catch (error) {
    console.error("Error saving analysis to Firestore: ", error)
    return null
  }
}

export async function getLatestAnalysisFromFirestore(): Promise<AnalysisData | null> {
  try {
    const owner = uid()
    if (!owner) return null
    const q = query(collection(db, 'analyses'), where('uid', '==', owner), orderBy('createdAt', 'desc'), limit(1))
    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      return doc.data() as AnalysisData
    }
    return null
  } catch (error) {
    console.error("Error getting latest analysis: ", error)
    return null
  }
}

export async function clearAnalysesFromFirestore() {
  try {
    const owner = uid()
    if (!owner) return
    const querySnapshot = await getDocs(query(collection(db, 'analyses'), where('uid', '==', owner)))
    const batch = writeBatch(db)
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref)
    })
    await batch.commit()
  } catch (error) {
    console.error("Error clearing analyses: ", error)
  }
}

// Chat Copilot Operations
export async function saveChatMessageToFirestore(message: ChatMessage) {
  try {
    const owner = uid()
    if (!owner) return
    await addDoc(collection(db, 'chats'), {
      ...message,
      uid: owner,
      createdAt: new Date().toISOString()
    })
  } catch (error) {
    console.error("Error saving chat message to Firestore: ", error)
  }
}

export async function getChatHistoryFromFirestore(): Promise<ChatMessage[]> {
  try {
    const owner = uid()
    if (!owner) return []
    const q = query(collection(db, 'chats'), where('uid', '==', owner), orderBy('createdAt', 'asc'))
    const querySnapshot = await getDocs(q)
    const messages: ChatMessage[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      messages.push({
        role: data.role,
        text: data.text
      })
    })
    return messages
  } catch (error) {
    console.error("Error getting chat history from Firestore: ", error)
    return []
  }
}

export async function clearChatHistoryFromFirestore() {
  try {
    const owner = uid()
    if (!owner) return
    const querySnapshot = await getDocs(query(collection(db, 'chats'), where('uid', '==', owner)))
    const batch = writeBatch(db)
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref)
    })
    await batch.commit()
  } catch (error) {
    console.error("Error clearing chat history from Firestore: ", error)
  }
}

// Registro Operacional Operations (automatización vía chat de Kapi)
export async function saveRegistroToFirestore(registro: Registro): Promise<string | null> {
  try {
    const owner = uid()
    if (!owner) return null
    const docRef = await addDoc(collection(db, 'registros'), {
      ...registro,
      uid: owner,
      createdAt: new Date().toISOString()
    })
    return docRef.id
  } catch (error) {
    console.error("Error saving registro to Firestore: ", error)
    return null
  }
}

export async function getRegistrosFromFirestore(): Promise<Registro[]> {
  try {
    const owner = uid()
    if (!owner) return []
    const q = query(collection(db, 'registros'), where('uid', '==', owner), orderBy('createdAt', 'desc'), limit(50))
    const querySnapshot = await getDocs(q)
    const registros: Registro[] = []
    querySnapshot.forEach((doc) => {
      registros.push({ id: doc.id, ...(doc.data() as Registro) })
    })
    return registros
  } catch (error) {
    console.error("Error getting registros from Firestore: ", error)
    return []
  }
}
