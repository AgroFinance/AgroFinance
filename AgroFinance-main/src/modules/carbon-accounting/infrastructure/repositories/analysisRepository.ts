import { db } from '@/core/config/firebase.client'
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
