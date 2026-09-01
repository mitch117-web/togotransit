/**
 * Envoi d'e-mails réels via l'API Resend (https://resend.com).
 *
 * Compte gratuit sans domaine personnalisé vérifié : Resend n'autorise
 * l'envoi qu'à l'adresse e-mail du propriétaire du compte (restriction de
 * leur "sandbox"). Pour un vrai destinataire quelconque, il faudrait
 * posséder un nom de domaine et le vérifier sur resend.com/domains — hors
 * périmètre de ce projet académique. La fonction échoue donc proprement
 * (sans lever d'exception) pour tout autre destinataire ; l'appelant doit
 * prévoir un repli (ex: afficher le code à l'écran) dans ce cas.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY non configurée' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TogoTransit <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: false, error: data?.message || `Erreur Resend (${res.status})` }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erreur réseau' }
  }
}
