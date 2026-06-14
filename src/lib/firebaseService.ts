import { db } from './firebase'
import { collection, addDoc, getDocs, query, orderBy, limit, writeBatch } from 'firebase/firestore'

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

// ESG Analysis Operations
export async function saveAnalysisToFirestore(analysis: AnalysisData) {
  try {
    const docRef = await addDoc(collection(db, 'analyses'), {
      ...analysis,
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
    const q = query(collection(db, 'analyses'), orderBy('createdAt', 'desc'), limit(1))
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
    const querySnapshot = await getDocs(collection(db, 'analyses'))
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
