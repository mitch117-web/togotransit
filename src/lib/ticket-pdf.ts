import { jsPDF } from 'jspdf'

/**
 * Billet de transport au format ticket de caisse (80 mm de large), un billet par page.
 *
 * Les polices intégrées de jsPDF ne connaissent que le Latin-1 : tout texte passe par `pdfText`, qui remplace les
 * espaces insécables (le « 5/500 F » venait d'un séparateur de milliers fin que la police ne sait pas écrire)
 * et ramène les caractères hors Latin-1 à leur équivalent sans accent.
 */
export interface TicketPassager {
  nom: string
  siege?: string | null
}

export interface TicketPdfData {
  numero: string // N° du billet
  url: string // adresse encodée dans le QR code
  compagnie: string
  depart: string
  arrivee: string
  departAt: string // instant de départ (ISO)
  passagers: TicketPassager[]
  telephone?: string | null // téléphone du client, imprimé masqué
  prix: number
  paiement?: string | null
  qrDataUrl?: string | null
}

type Couleur = [number, number, number]

const INDIGO: Couleur = [28, 42, 94]
const SOLEIL: Couleur = [255, 176, 32]
const ENCRE: Couleur = [14, 21, 48]
const GRIS: Couleur = [95, 104, 125]
const FILET: Couleur = [208, 214, 230]
const TURQUOISE: Couleur = [11, 122, 112]

const LARGEUR = 80
const MARGE = 7

const jourFmt = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC', // le Togo est à UTC+0 toute l'année
})
const heureFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' })

export function formatFcfa(n: number): string {
  return `${Math.round(n)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'
}

export function formatJour(iso: string): string {
  const s = jourFmt.format(new Date(iso))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatHeure(iso: string): string {
  return heureFmt.format(new Date(iso)).replace(':', 'h')
}

/** « 90136750 » → « •• •• 6750 » : le billet imprimé peut traîner, on n'y laisse pas le numéro en entier. */
export function masquerTelephone(tel?: string | null): string {
  const chiffres = (tel ?? '').replace(/\D/g, '')
  return chiffres.length >= 6 ? `•• •• ${chiffres.slice(-4)}` : ''
}

export function pdfText(s: string): string {
  return Array.from(
    s
      .replace(/[    ]/g, ' ')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/…/g, '...')
      .normalize('NFC')
  )
    .map((c) => {
      const code = c.codePointAt(0)!
      if (code <= 0xff || code === 0x2022 || code === 0x20ac) return c
      const base = c.normalize('NFD').replace(/[̀-ͯ]/g, '')
      return base.length === 1 && base.charCodeAt(0) < 0x80 ? base : '?'
    })
    .join('')
}

/** Le « T » sous un soleil levant, dessiné en vecteur (même géométrie que le logo du site : repère de 64 unités). */
function dessinerLogo(doc: jsPDF, x: number, y: number, taille: number) {
  const s = taille / 48
  const px = (u: number) => x + (u - 8) * s
  const py = (u: number) => y + (u - 8) * s
  const k = 0.5523 * 9.5

  // soleil : demi-disque posé sur la barre du T
  doc.setFillColor(...SOLEIL)
  doc.lines(
    [
      [0, -k, 9.5 - k, -9.5, 9.5, -9.5],
      [k, 0, 9.5, 9.5 - k, 9.5, 9.5],
      [-19, 0],
    ],
    px(22.5),
    py(20),
    [s, s],
    'F',
    true
  )
  // le T
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(px(12), py(20), 40 * s, 9 * s, 3 * s, 3 * s, 'F')
  doc.roundedRect(px(26.5), py(24), 11 * s, 30 * s, 3 * s, 3 * s, 'F')
}

function dessinerBillet(doc: jsPDF, d: TicketPdfData): number {
  const L = MARGE
  const R = LARGEUR - MARGE
  const utile = R - L
  const centre = LARGEUR / 2

  const etiquette = (txt: string, x: number, y: number) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.6)
    doc.setTextColor(...GRIS)
    doc.setCharSpace(0.4)
    doc.text(pdfText(txt), x, y)
    doc.setCharSpace(0)
  }
  const valeur = (txt: string, x: number, y: number, taille: number, couleur: Couleur, gras = true, max = utile) => {
    const t = pdfText(txt)
    doc.setFont('helvetica', gras ? 'bold' : 'normal')
    let s = taille
    doc.setFontSize(s)
    while (doc.getTextWidth(t) > max && s > 6) {
      s -= 0.5
      doc.setFontSize(s)
    }
    doc.setTextColor(...couleur)
    doc.text(t, x, y)
  }
  const filet = (y: number) => {
    doc.setDrawColor(...FILET)
    doc.setLineWidth(0.25)
    doc.line(L, y, R, y)
  }

  // --- bandeau de marque
  doc.setFillColor(...INDIGO)
  doc.rect(0, 0, LARGEUR, 22, 'F')
  doc.setFillColor(...SOLEIL)
  doc.rect(0, 22, LARGEUR, 1.4, 'F')
  dessinerLogo(doc, L, 4.5, 13)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text('Togo', L + 16.5, 12)
  const largeurTogo = doc.getTextWidth('Togo')
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SOLEIL)
  doc.text('Transit', L + 16.5 + largeurTogo, 12)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.6)
  doc.setTextColor(255, 255, 255)
  doc.setCharSpace(0.5)
  doc.text('BILLET DE TRANSPORT', L + 16.5, 17)
  doc.setCharSpace(0)

  // --- compagnie
  let y = 30
  etiquette('COMPAGNIE', L, y)
  valeur(d.compagnie, L, y + 5.2, 10.5, INDIGO)

  // --- trajet : départ et arrivée l'un sous l'autre (les noms de ville longs ne débordent pas)
  y += 14
  const xVille = L + 5
  etiquette('DÉPART', xVille, y)
  valeur(d.depart, xVille, y + 6.2, 15, ENCRE, true, R - xVille)
  etiquette('ARRIVÉE', xVille, y + 14)
  valeur(d.arrivee, xVille, y + 20.2, 15, ENCRE, true, R - xVille)
  doc.setFillColor(...INDIGO)
  doc.circle(L + 1.3, y + 5.2, 1.3, 'F')
  doc.setFillColor(...SOLEIL)
  doc.circle(L + 1.3, y + 19.2, 1.3, 'F')
  doc.setDrawColor(...GRIS)
  doc.setLineWidth(0.35)
  doc.setLineDashPattern([0.6, 1.1], 0)
  doc.line(L + 1.3, y + 7, L + 1.3, y + 17.4)
  doc.setLineDashPattern([], 0)

  // --- date, heure, siège
  y += 28
  filet(y)
  y += 5
  etiquette('DATE ET HEURE DE DÉPART', L, y)
  valeur(formatJour(d.departAt), L, y + 5, 8, ENCRE, true, utile)
  valeur(formatHeure(d.departAt), L, y + 13.5, 18, INDIGO, true, 32)
  const sieges = d.passagers.map((p) => p.siege).filter((s): s is string => !!s)
  const xSiege = L + 40
  etiquette(sieges.length > 1 ? 'SIÈGES' : 'SIÈGE', xSiege, y)
  if (sieges.length) valeur(sieges.map((s) => `#${s}`).join(' '), xSiege, y + 13.5, 18, INDIGO, true, R - xSiege)
  else valeur('Libre', xSiege, y + 12.5, 11, INDIGO, true, R - xSiege)

  // --- passagers
  y += 20
  filet(y)
  y += 5
  etiquette(d.passagers.length > 1 ? 'PASSAGERS' : 'PASSAGER', L, y)
  y += 5.2
  const noms = d.passagers.length ? d.passagers : [{ nom: 'Passager' }]
  for (const p of noms) {
    valeur(p.nom, L, y, 9, ENCRE, true)
    y += 5
  }
  const tel = masquerTelephone(d.telephone)
  if (tel) {
    valeur(`Tél. ${tel}`, L, y - 0.4, 7, GRIS, false)
    y += 4.4
  }

  // --- prix et paiement
  y += 1.5
  filet(y)
  y += 5
  etiquette('TOTAL', L, y)
  valeur(formatFcfa(d.prix), L, y + 6, 13, ENCRE, true, 44)
  if (d.paiement) {
    valeur(d.paiement, L, y + 10.4, 6.5, GRIS, false, 44)
  }
  doc.setFillColor(...TURQUOISE)
  doc.roundedRect(R - 17, y + 0.6, 17, 7.2, 1.6, 1.6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(255, 255, 255)
  doc.setCharSpace(0.5)
  doc.text('PAYÉ', R - 8.5, y + 5.6, { align: 'center' })
  doc.setCharSpace(0)
  y += d.paiement ? 14 : 11

  // --- perforation, puis le QR code
  doc.setDrawColor(...GRIS)
  doc.setLineWidth(0.3)
  doc.setLineDashPattern([1.4, 1.2], 0)
  doc.line(2, y, LARGEUR - 2, y)
  doc.setLineDashPattern([], 0)
  y += 5

  const tailleQr = 34
  doc.setDrawColor(...FILET)
  doc.setLineWidth(0.3)
  doc.roundedRect(centre - tailleQr / 2 - 2, y - 1.5, tailleQr + 4, tailleQr + 4, 2, 2, 'S')
  if (d.qrDataUrl) doc.addImage(d.qrDataUrl, 'PNG', centre - tailleQr / 2, y + 0.5, tailleQr, tailleQr)
  y += tailleQr + 8

  doc.setFont('courier', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...ENCRE)
  doc.text(pdfText(d.numero), centre, y, { align: 'center' })
  y += 4.6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.2)
  doc.setTextColor(...GRIS)
  doc.text('Scannez ce code pour vérifier le billet', centre, y, { align: 'center' })

  // --- pied de billet
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...INDIGO)
  doc.text('Merci de voyager avec TogoTransit', centre, y, { align: 'center' })
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.8)
  doc.setTextColor(...GRIS)
  doc.text("Billet nominatif, à présenter à l'embarquement.", centre, y, { align: 'center' })
  y += 3.2
  doc.text('Présentez-vous 30 minutes avant le départ.', centre, y, { align: 'center' })
  let hote = ''
  try {
    hote = new URL(d.url).host
  } catch {
    /* adresse illisible : on n'imprime pas d'hôte */
  }
  if (hote) {
    y += 3.6
    doc.text(pdfText(hote), centre, y, { align: 'center' })
  }
  return y + 5
}

/** Construit le PDF : une page par billet, toutes de la même hauteur (celle du billet le plus long). */
export function buildTicketPdf(billets: TicketPdfData[]): jsPDF {
  const hauteur = Math.ceil(
    Math.max(...billets.map((b) => dessinerBillet(new jsPDF({ unit: 'mm', format: [LARGEUR, 400] }), b)))
  )
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [LARGEUR, hauteur] })
  billets.forEach((b, i) => {
    if (i > 0) doc.addPage([LARGEUR, hauteur], 'portrait')
    dessinerBillet(doc, b)
  })
  doc.setProperties({
    title: billets.length === 1 ? `Billet TogoTransit ${billets[0].numero}` : `Billets TogoTransit (${billets.length})`,
    subject: 'Billet de transport',
    creator: 'TogoTransit',
  })
  return doc
}
