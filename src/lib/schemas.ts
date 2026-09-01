import { z } from 'zod'

export const vehicleSchema = z.object({
  compagnie_id: z.number().int().positive().optional(),
  plateNumber: z.string().min(3, 'Immatriculation trop courte').regex(/^[A-Z0-9-]+$/, 'Format invalide (Ex: TG-1234-A)'),
  type: z.string().min(1, 'Le type est requis'),
  capacity: z.number().int().min(1, 'La capacité doit être au moins 1'),
  status: z.enum(['disponible', 'en_maintenance', 'hors_service'])
})

export type VehicleFormData = z.infer<typeof vehicleSchema>

export const userSchema = z.object({
  nom: z.string().min(2, 'Nom trop court'),
  prenom: z.string().min(2, 'Prénom trop court'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().min(8, 'Téléphone invalide').regex(/^[0-9]+$/, 'Seuls les chiffres sont autorisés'),
  role: z.enum(['voyageur', 'gestionnaire', 'super_admin']),
  compagnie_id: z.number().int().positive().optional().nullable(),
  mot_de_passe: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères').optional()
})

export type UserFormData = z.infer<typeof userSchema>

export const compagnieSchema = z.object({
  nom: z.string().min(2, 'Nom de la compagnie requis').max(150),
  logo: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  telephone: z.string().min(8, 'Téléphone invalide').regex(/^[0-9+\s-]+$/).optional().nullable(),
  email: z.string().email('Email invalide').optional().or(z.literal('')).nullable(),
  adresse_siege: z.string().max(255).optional().nullable(),
  statut: z.enum(['actif', 'suspendu', 'en_attente']).default('en_attente'),
})

export type CompagnieFormData = z.infer<typeof compagnieSchema>

export const trajetSchema = z.object({
  compagnie_id: z.number().int().positive().optional(),
  vehicule_id: z.number().int().positive(),
  ville_depart_id: z.number().int().positive(),
  ville_arrivee_id: z.number().int().positive(),
  date_depart: z.string().min(1, 'Date de départ requise'),
  heure_depart: z.string().min(1, 'Heure de départ requise'),
  duree_estimee: z.string().optional().nullable(),
  prix: z.number().min(0, 'Prix invalide'),
  places_disponibles: z.number().int().min(0, 'Places disponibles invalides'),
  statut: z.enum(['planifie', 'en_cours', 'termine', 'annule']).default('planifie'),
  driver_id: z.number().int().positive().optional().nullable(),
})

export type TrajetFormData = z.infer<typeof trajetSchema>

export const reservationSchema = z.object({
  utilisateur_id: z.number().int().positive(),
  trajet_id: z.number().int().positive(),
  nombre_places: z.number().int().min(1, 'Au moins une place requise'),
  statut: z.enum(['en_attente', 'confirmee', 'annulee']).default('en_attente'),
  passagers: z.array(z.object({
    nom_complet: z.string().min(2, 'Nom requis'),
    telephone: z.string().min(8, 'Téléphone invalide'),
    numero_siege: z.string().max(10).optional().nullable(),
  })).min(1, 'Au moins un passager requis'),
})

export type ReservationFormData = z.infer<typeof reservationSchema>

export const paiementSchema = z.object({
  reservation_id: z.number().int().positive(),
  methode: z.enum(['flooz', 'tmoney', 'carte', 'autre']),
  reference_transaction: z.string().max(100).optional().nullable(),
  montant: z.number().min(0, 'Montant invalide'),
  statut: z.enum(['en_attente', 'reussi', 'echoue']).default('en_attente'),
})

export type PaiementFormData = z.infer<typeof paiementSchema>

export const avisSchema = z.object({
  utilisateur_id: z.number().int().positive(),
  compagnie_id: z.number().int().positive(),
  trajet_id: z.number().int().positive(),
  note: z.number().int().min(1, 'Note minimum 1').max(5, 'Note maximum 5'),
  commentaire: z.string().optional().nullable(),
})

export type AvisFormData = z.infer<typeof avisSchema>

export const rechercheTrajetSchema = z.object({
  ville_depart: z.string().min(2, 'Ville de départ requise'),
  ville_arrivee: z.string().min(2, 'Ville d\'arrivée requise'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date invalide (YYYY-MM-DD)'),
  compagnie_id: z.number().int().positive().optional(),
})

export type RechercheTrajetData = z.infer<typeof rechercheTrajetSchema>

export const loginSchema = z.object({
  identifier: z.string().min(2, 'Identifiant requis'),
  mot_de_passe: z.string().min(6, 'Mot de passe requis'),
})

export type LoginData = z.infer<typeof loginSchema>

export const parcelSchema = z.object({
  senderId: z.number().int().positive().optional(),
  senderName: z.string().min(2, 'Nom requis'),
  senderPhone: z.string().min(8, 'Téléphone requis'),
  receiverName: z.string().min(2, 'Nom requis'),
  receiverPhone: z.string().min(8, 'Téléphone requis'),
  weight: z.number().min(0.1, 'Poids invalide'),
  category: z.string().min(1, 'Catégorie requise'),
  deliveryType: z.string().min(1, 'Type requis'),
  origin: z.string().min(1, 'Origine requise'),
  destination: z.string().min(1, 'Destination requise'),
  status: z.enum(['IN_AGENCY', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']).optional(),
  price: z.number().min(0, 'Prix invalide'),
  paymentStatus: z.enum(['PENDING', 'PAID']),
  paymentMethod: z.string().optional(),
  driverId: z.number().int().positive().optional(),
})

export type ParcelFormValues = z.infer<typeof parcelSchema>

export const tripSchema = z.object({
  origin: z.string().min(1, 'Origine requise'),
  destination: z.string().min(1, 'Destination requise'),
  departureTime: z.string().min(1, 'Heure de départ requise'),
  arrivalTime: z.string().optional(),
  price: z.number().min(0, 'Prix invalide'),
  vehicleId: z.string().min(1, 'Véhicule requis'),
  driverId: z.string().optional(),
  compagnie_id: z.string().optional(),
  status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED'])
})

export type TripFormValues = z.infer<typeof tripSchema>
