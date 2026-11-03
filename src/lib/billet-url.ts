/**
 * Adresse et lecture des billets : fonctions pures, utilisables côté serveur comme dans le navigateur.
 *
 * Le QR code d'un billet encode l'adresse de sa page de vérification (https://…/billet/TT-XXXX-XXXX-XXXX) :
 * n'importe quel appareil photo l'ouvre, et le scanner de l'application en extrait le numéro de billet.
 * Les anciens billets (QR au format JSON, ou numéro seul) restent lisibles.
 */

export function billetUrl(numeroBillet: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/billet/${encodeURIComponent(numeroBillet)}`
}

const NUMERO_VALIDE = /^[A-Za-z0-9][A-Za-z0-9._-]{3,63}$/

/**
 * Retrouve le numéro de billet dans ce que lit un scanner : adresse de vérification, ancien QR JSON ou numéro seul.
 * Renvoie null quand rien d'exploitable n'est trouvé.
 */
export function extractNumeroBillet(brut: unknown): string | null {
  if (typeof brut !== 'string') return null
  const texte = brut.trim()
  if (!texte || texte.length > 500) return null

  let candidat = texte
  if (texte.startsWith('{')) {
    try {
      const numero = JSON.parse(texte)?.numero_billet
      if (typeof numero !== 'string') return null
      candidat = numero.trim()
    } catch {
      return null
    }
  } else if (/^https?:\/\//i.test(texte)) {
    const m = texte.match(/\/billet\/([^/?#]+)/i)
    if (!m) return null
    try {
      candidat = decodeURIComponent(m[1])
    } catch {
      return null
    }
  }
  return NUMERO_VALIDE.test(candidat) ? candidat : null
}
