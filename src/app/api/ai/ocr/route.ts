import { NextResponse } from 'next/server'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

// Pour utiliser Google Cloud Vision, vous aurez besoin d'installer @google-cloud/vision
// et de configurer les credentials

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const { imageBase64 } = await request.json()

    // Exemple de réponse (en production, connectez-vous à Google Cloud Vision)
    const mockExtractedText = {
      receiverName: 'Nom du destinataire extrait',
      date: new Date().toLocaleDateString(),
      notes: 'Texte extrait de l\'image'
    }

    return NextResponse.json(mockExtractedText)
  } catch (error) {
    console.error('OCR Error:', error)
    return NextResponse.json(
      { error: 'Erreur OCR' },
      { status: 500 }
    )
  }
}
