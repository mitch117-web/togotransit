import { NextResponse, after } from 'next/server'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'
import { sendSMS } from '@/lib/sms'

const roleMap: Record<string, any> = {
  CLIENT: 'voyageur',
  DRIVER: 'voyageur',
  ADMIN: 'super_admin',
  voyageur: 'voyageur',
  gestionnaire: 'gestionnaire',
  super_admin: 'super_admin',
}

const telephoneSchema = z
  .string()
  .trim()
  .min(8, 'Téléphone invalide')
  .regex(/^[0-9+\s-]+$/, 'Format téléphone invalide')

// bcrypt ignore tout ce qui dépasse 72 octets : on refuse plutôt que de tronquer en silence.
const motDePasseSchema = z
  .string()
  .min(6, 'Mot de passe trop court')
  .max(72, 'Mot de passe trop long')

// Deux nommages coexistent selon l'appelant : le formulaire admin envoie
// nom/prenom/telephone/mot_de_passe, le guichet name/phone (et plus de password).
const createUserSchema = z
  .object({
    name: z.string().trim().max(150).optional(),
    nom: z.string().trim().max(100).optional(),
    prenom: z.string().trim().max(100).optional(),
    phone: telephoneSchema.optional(),
    telephone: telephoneSchema.optional(),
    email: z.string().trim().email('Email invalide').optional().or(z.literal('')).nullable(),
    role: z.enum(Object.keys(roleMap) as [string, ...string[]]).optional(),
    compagnie_id: z.number().int().positive().nullable().optional(),
    password: motDePasseSchema.optional(),
    mot_de_passe: motDePasseSchema.optional(),
  })
  .refine((d) => d.phone || d.telephone, { message: 'Téléphone requis', path: ['telephone'] })
  .refine((d) => d.name || d.nom || d.prenom, { message: 'Nom requis', path: ['name'] })

export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked

    if (auth!.role === 'gestionnaire' && !auth!.compagnieId) {
      return NextResponse.json({ error: 'Gestionnaire sans compagnie' }, { status: 403 })
    }

    const parsed = createUserSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.format() },
        { status: 400 }
      )
    }
    const data = parsed.data

    const telephone = (data.phone ?? data.telephone)!
    const email = data.email || null
    const role = roleMap[data.role ?? 'voyageur']

    // Un gestionnaire ne peut créer que du personnel de sa propre compagnie,
    // jamais un compte super_admin ni un compte rattaché à une autre compagnie.
    const compagnie_id = auth!.role === 'gestionnaire' ? auth!.compagnieId : (data.compagnie_id ?? null)
    if (auth!.role === 'gestionnaire' && role === 'super_admin') {
      return NextResponse.json({ error: 'Rôle non autorisé' }, { status: 403 })
    }

    const nom = data.nom ?? (data.name ? data.name.split(/\s+/).slice(1).join(' ') : '')
    const prenom = data.prenom ?? (data.name ? data.name.split(/\s+/)[0] : '')

    const existingUser = await prisma.utilisateur.findFirst({
      where: {
        OR: [
          { telephone },
          email ? { email } : undefined,
        ].filter(Boolean) as any,
      },
    })

    if (existingUser) {
      // Un gestionnaire ne doit pas pouvoir sonder l'existence d'un compte d'une autre compagnie.
      if (auth!.role === 'gestionnaire' && existingUser.compagnie_id !== auth!.compagnieId) {
        return NextResponse.json({ error: 'Un compte existe déjà avec ces informations' }, { status: 409 })
      }
      const { mot_de_passe: _pw, ...safeExisting } = existingUser
      return NextResponse.json(safeExisting)
    }

    // Jamais de mot de passe par défaut prévisible : sans mot de passe fourni (client
    // créé au guichet), on en tire un aléatoire que personne ne connaît — il n'est ni
    // renvoyé, ni journalisé, ni conservé. Le compte n'est utilisable qu'une fois son
    // mot de passe défini par le titulaire du numéro via le flux OTP existant
    // (/api/auth/forgot-password puis /api/auth/reset-password).
    const motDePasseFourni = data.password ?? data.mot_de_passe
    const mot_de_passe = await bcrypt.hash(
      motDePasseFourni ?? randomBytes(32).toString('base64url'),
      10
    )

    const newUser = await prisma.utilisateur.create({
      data: {
        nom,
        prenom,
        email,
        telephone,
        mot_de_passe,
        role,
        compagnie_id,
        statut: 'actif',
      } as any,
      include: { compagnie: { select: { nom: true } } },
    })

    // Le titulaire du numéro est prévenu qu'un compte existe à son nom et comment
    // l'activer. Envoyé après la réponse (le SMS simulé attend 1 s) et sans jamais
    // faire échouer la création.
    if (!motDePasseFourni) {
      const parCompagnie = newUser.compagnie ? ` par ${newUser.compagnie.nom}` : ''
      after(async () => {
        try {
          await sendSMS(
            telephone,
            `TogoTransit: un compte a été créé pour vous${parCompagnie}. Pour l'activer, utilisez "Mot de passe oublié" avec le numéro ${telephone}.`
          )
        } catch (smsError) {
          console.error("Create User: SMS d'activation non envoyé", smsError)
        }
      })
    }

    const { mot_de_passe: _pw2, compagnie: _compagnie, ...safeUser } = newUser
    return NextResponse.json(safeUser)
  } catch (error) {
    console.error('Create User Error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['gestionnaire', 'super_admin'])
    if (blocked) return blocked

    const where =
      auth!.role === 'super_admin'
        ? {}
        : { compagnie_id: auth!.compagnieId ?? -1 }

    const users = await prisma.utilisateur.findMany({
      where,
      orderBy: { date_creation: 'desc' } as any,
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        compagnie_id: true,
        date_creation: true,
        statut: true,
      },
    })
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
