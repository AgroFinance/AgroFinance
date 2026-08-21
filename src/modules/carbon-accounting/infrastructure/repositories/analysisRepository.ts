import { db, auth } from '@/core/config/firebase.client'
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

// Antes 'analyses' era una colección plana sin dueño — cualquier sesión
// firmada leía/escribía los documentos de cualquier otra. Cada doc ahora
// lleva el uid de quien lo escribió y cada lectura filtra por el uid activo.
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
