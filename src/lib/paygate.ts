export interface InitPaiementRequest {
  merchant_id: string
  amount: number
  currency: string
  method: 'flooz' | 'tmoney'
  phone: string
  reference: string
  callback_url: string
}

export interface InitPaiementResponse {
  success: boolean
  transaction_id: string
  reference: string
  status: 'en_attente' | 'réussi' | 'échoué'
  code_erreur?: string
  message?: string
}

export interface VerifierWebhookPayload {
  transaction_id: string
  reference: string
  status: 'réussi' | 'échoué'
  signature: string
}

export interface VerifierWebhookResult {
  valid: boolean
  transaction: Omit<VerifierWebhookPayload, 'signature'> | null
  message: string
}

import axios, { AxiosError, AxiosInstance } from 'axios'

// --- Configuration PayGate ---

const REQUIRED_ENV_VARS = [
  'PAYGATE_MERCHANT_ID',
  'PAYGATE_API_KEY',
  'PAYGATE_API_URL',
  'PAYGATE_WEBHOOK_SECRET',
]

function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `❌ Variables d'environnement PayGate manquantes : ${missing.join(', ')}. ` +
        'Vérifiez votre fichier .env. L\'application ne peut pas démarrer en mode ' +
        'simulé silencieux — soit vous configurez PayGate, soit vous restez en mode ' +
        'développement local avec le mock connu (mais alors supprimez ce fichier ou ' +
        'renommez-le en paygate.mock.ts).'
    )
  }
}

// Création du client axios dédié
const api: AxiosInstance = axios.create({
  baseURL: process.env.PAYGATE_API_URL?.replace(/\/+$/, '') || '',
  timeout: 30000,
  headers: {
    'Authorization': `Bearer ${process.env.PAYGATE_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Merchant-Id': process.env.PAYGATE_MERCHANT_ID,
  },
})

// --- Fonctions principales ---

/**
 * Déclenche une demande de paiement Flooz ou T-Money vers le téléphone du client.
 * 
 * @param montant       Montant en francs CFA (entier, ex: 5000 = 5000 F)
 * @param numeroTelephone Téléphone au format international sans le + du client (ex: '90123456')
 * @param methode       'flooz' ou 'tmoney'
 * @param reservationId ID de la réservation TogoTransit (servira de reference)
 * @returns Objet avec la référence PayGate et les infos à afficher à l'utilisateur
 * @throws Error si l'API PayGate est injoignable ou retourne une erreur
 */
export async function initierPaiement({
  montant,
  numeroTelephone,
  methode,
  reservationId,
}: {
  montant: number
  numeroTelephone: string
  methode: 'flooz' | 'tmoney'
  reservationId: string
}): Promise<{
  transactionId: string
  reference: string
  instructions: string[]
  statut: 'en_attente' | 'réussi' | 'échoué'
}> {
  // Validation des identifiants PayGate — seulement au moment d'un vrai paiement,
  // pour ne pas bloquer le build ou les routes qui n'en ont pas besoin (ex: création de réservation)
  validateEnv()

  // Construction de la référence unique : reservationId + timestamp
  const reference = `TG-TRANSIT-${methode.toUpperCase()}-${reservationId}-${Date.now().toString(36).toUpperCase()}`

  const payload: InitPaiementRequest = {
    merchant_id: process.env.PAYGATE_MERCHANT_ID!,
    amount: montant,
    currency: 'XOF',
    method: methode,
    phone: `+228${numeroTelephone}`,
    reference,
    callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/paiements/webhook/paygate`,
  }

  try {
    const response = await api.post<InitPaiementResponse>('/v1/payment/initiate', payload)
    
    if (!response.data.success) {
      throw new Error(
        `PayGate error: ${response.data.message || 'Erreur inconnue'} (code: ${response.data.code_erreur})`
      )
    }

    // Instructions à afficher à l'utilisateur (format typique PayGate)
    const instructions: string[] = [
      '1. Ouvrez le menu Mobile Money de votre téléphone',
      methode === 'flooz' ? '2. Choisissez "Moov Money" > "Payer un marchand"' : '2. Choisissez "T-Money" > "Paiement service"',
      `3. Code marchand: TG-TRANSIT-${methode.toUpperCase()}`,
      `4. Montant: ${montant} F`,
      `5. Référence: ${reference}`,
      '6. Validez avec votre code PIN',
      '7. Revenez sur l\'app, le statut sera mis à jour automatiquement',
    ]

    return {
      transactionId: response.data.transaction_id,
      reference,
      instructions,
      statut: response.data.status,
    }
  } catch (err) {
    if (err instanceof AxiosError) {
      const message = err.response?.data?.message || err.message || 'Impossible de joindre PayGate'
      throw new Error(`Échec paiement PayGate : ${message}`)
    }
    throw err
  }
}

/**
 * Valide la signature d'un webhook entrant de PayGate.
 * 
 * PayGate envoie un header `X-Paygate-Signature` ou un corps contenant une signature HMAC.
 * La méthode exacte dépend de la documentation fournie par PayGate.
 * 
 * @param payload   Corps du webhook JSON reçu
 * @param signature Signature fournie par PayGate (format à définir selon leur doc)
 * @returns { valid: boolean, transaction: ... | null, message: string }
 */
export function verifierSignatureWebhook(
  payload: unknown,
  signature: string
): VerifierWebhookResult {
  const computedSig = require('crypto')
    .createHmac('sha256', process.env.PAYGATE_WEBHOOK_SECRET!)
    .update(JSON.stringify(payload))
    .digest('hex')

  const isValid = computedSig === signature

  if (!isValid) {
    return {
      valid: false,
      transaction: null,
      message: 'Signature webhook PayGate invalide',
    }
  }

  // Si la signature est valide, extraire les infos du payload
  const p = payload as {
    transaction_id: string
    reference: string
    status: 'réussi' | 'échoué'
    [key: string]: unknown
  } | null

  return {
    valid: true,
    transaction: p ? {
      transaction_id: p.transaction_id,
      reference: p.reference,
      status: p.status,
    } : null,
    message: 'Signature webhook PayGate valide',
  }
}

/**
 * Point d'entrée appelé par src/app/api/paiements/webhook/[provider]/route.ts
 * Valide le webhook PayGate et retourne le résultat structuré.
 */
export function handleWebhook(
  rawBody: string,
  signatureHeader: string | string[]
): {
  success: boolean
  error?: string
  transaction?: Omit<VerifierWebhookPayload, 'signature'> | null
} {
  const signature = Array.isArray(signatureHeader)
    ? signatureHeader[0]
    : signatureHeader

  if (!signature) {
    return { success: false, error: 'Signature manquante dans le webhook PayGate' }
  }

  const validation = verifierSignatureWebhook(rawBody, signature)

  if (!validation.valid) {
    return { success: false, error: validation.message }
  }

  // Ici, on pourrait mettre à jour la BDD, générer le billet, etc.
  // On retourne la transaction validée pour que la route l'utilise.
  return {
    success: true,
    transaction: validation.transaction,
    error: undefined,
  }
}

export function generateNumeroBillet(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `TT-${ts}-${rnd}`
}

export function generateQRPayload(reservationId: number, numeroBillet: string): string {
  return JSON.stringify({
    type: 'billet_togotransit',
    reservation_id: reservationId,
    numero_billet: numeroBillet,
    v: 1,
  })
}