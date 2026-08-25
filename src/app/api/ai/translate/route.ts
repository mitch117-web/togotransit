import { NextResponse } from 'next/server'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'

// Pour utiliser DeepL ou Google Translate, installez le SDK correspondant
// Exemple avec DeepL: npm install deepl-node

// Dictionnaire de traduction de base
const translations: Record<string, Record<string, string>> = {
  fr: {
    ewé: 'Bonjour',
    mina: 'Bonjour',
    en: 'Hello'
  },
  'Bonjour': {
    ewé: 'Mido',
    mina: 'Salam aleikum',
    en: 'Hello'
  },
  'Colis': {
    ewé: 'Kɔli',
    mina: 'Colis',
    en: 'Parcel'
  },
  'Livraison': {
    ewé: 'Delivery',
    mina: 'Livraison',
    en: 'Delivery'
  }
}

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['voyageur', 'gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const { text, targetLang } = await request.json()

    // Traduction simple (en production, connectez-vous à DeepL/Google Translate)
    let translatedText = text
    if (translations[text]?.[targetLang]) {
      translatedText = translations[text][targetLang]
    }

    return NextResponse.json({
      originalText: text,
      translatedText,
      targetLang
    })
  } catch (error) {
    console.error('Translation Error:', error)
    return NextResponse.json(
      { error: 'Erreur de traduction' },
      { status: 500 }
    )
  }
}
