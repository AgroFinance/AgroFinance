import { db } from '@/core/config/firebase.client'
import { collection, addDoc, getDocs, query, orderBy, limit, writeBatch } from 'firebase/firestore'

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

// Chat Copilot Operations
export async function saveChatMessageToFirestore(message: ChatMessage) {
  try {
    await addDoc(collection(db, 'chats'), {
      ...message,
      createdAt: new Date().toISOString()
    })
  } catch (error) {
    console.error("Error saving chat message to Firestore: ", error)
  }
}

export async function getChatHistoryFromFirestore(): Promise<ChatMessage[]> {
  try {
    const q = query(collection(db, 'chats'), orderBy('createdAt', 'asc'))
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
    const querySnapshot = await getDocs(collection(db, 'chats'))
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
    const docRef = await addDoc(collection(db, 'registros'), {
      ...registro,
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
    const q = query(collection(db, 'registros'), orderBy('createdAt', 'desc'), limit(50))
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
