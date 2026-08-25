import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractAuthFromRequest, requireAnyRole } from '@/lib/auth'
import bcrypt from 'bcryptjs'

/**
 * Route à usage unique pour repartir sur des données propres avant la
 * soutenance : vide toutes les données métier puis recharge exactement le
 * jeu de données canonique de prisma/seed.ts. Protégée par un rôle
 * super_admin ET une phrase de confirmation explicite pour éviter tout
 * déclenchement accidentel. À supprimer après usage.
 */
export async function POST(request: Request) {
  try {
    const auth = await extractAuthFromRequest(request as any)
    const blocked = requireAnyRole(auth, ['super_admin'])
    if (blocked) return blocked

    const body = await request.json().catch(() => ({}))
    if (body.confirm !== 'RESET_TOGOTRANSIT_DATA') {
      return NextResponse.json(
        { error: 'Confirmation manquante. Envoyez { "confirm": "RESET_TOGOTRANSIT_DATA" }.' },
        { status: 400 }
      )
    }

    // 1. Nettoyage complet, dans l'ordre des contraintes de clés étrangères
    await prisma.pOD.deleteMany()
    await prisma.parcel.deleteMany()
    await prisma.billet.deleteMany()
    await prisma.paiement.deleteMany()
    await prisma.passager.deleteMany()
    await prisma.reservation.deleteMany()
    await prisma.avis.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.trajet.deleteMany()
    await prisma.vehicule.deleteMany()
    await prisma.agenceLocale.deleteMany()
    await prisma.fare.deleteMany()
    await prisma.utilisateur.deleteMany()
    await prisma.compagnie.deleteMany()
    await prisma.ville.deleteMany()
    await prisma.systemSettings.deleteMany()
    await prisma.rateLimitEntry.deleteMany()

    // 2. Paramètres système globaux
    await prisma.systemSettings.create({
      data: {
        id: 'global',
        companyName: 'TogoTransit S.A.',
        currency: 'XOF',
        smsEnabled: true,
        maintenance: false,
      },
    })

    // 3. Villes du Togo
    const villesData = [
      { nom: 'Lomé', region: 'Maritime' },
      { nom: 'Tsévié', region: 'Maritime' },
      { nom: 'Aného', region: 'Maritime' },
      { nom: 'Kpalimé', region: 'Plateaux' },
      { nom: 'Atakpamé', region: 'Plateaux' },
      { nom: 'Sokodé', region: 'Centrale' },
      { nom: 'Kara', region: 'Kara' },
      { nom: 'Bafilo', region: 'Kara' },
      { nom: 'Mango', region: 'Savanes' },
      { nom: 'Dapaong', region: 'Savanes' },
      { nom: 'Cinkassé', region: 'Savanes' },
    ]
    const villesMap = new Map<string, any>()
    for (const v of villesData) {
      const created = await prisma.ville.create({ data: v })
      villesMap.set(v.nom, created)
    }

    // 4. Compagnies réelles de transport au Togo
    const nagode = await prisma.compagnie.create({
      data: {
        nom: 'Nagodé Transport',
        description: 'Compagnie leader du transport interurbain et VIP sur le corridor Nord (Lomé-Kara-Dapaong-Cinkassé).',
        telephone: '+228 90 12 34 56',
        email: 'contact@nagode.tg',
        adresse_siege: 'Carrefour GTA / Agoè-Nyivé, Lomé',
        statut: 'actif',
      },
    })
    const solim = await prisma.compagnie.create({
      data: {
        nom: 'SOLIM Transport',
        description: 'Confort, sécurité et ponctualité sur les lignes régionales du Grand Lomé, Plateaux et Centrale.',
        telephone: '+228 91 23 45 67',
        email: 'contact@solim.tg',
        adresse_siege: 'Boulevard du 13 Janvier, Déckon, Lomé',
        statut: 'actif',
      },
    })
    const lkTransport = await prisma.compagnie.create({
      data: {
        nom: 'LK Transport',
        description: 'Spécialiste de la liaison rapide Lomé - Kpalimé - Atakpamé et transport de marchandises.',
        telephone: '+228 92 34 56 78',
        email: 'contact@lktransport.tg',
        adresse_siege: 'Grand Marché / Assigamé, Lomé',
        statut: 'actif',
      },
    })
    const rakieta = await prisma.compagnie.create({
      data: {
        nom: 'Rakiéta Transport',
        description: 'Liaisons express longue distance et corridors sous-régionaux Togo-Burkina.',
        telephone: '+228 93 45 67 89',
        email: 'contact@rakieta.tg',
        adresse_siege: 'Zone Portuaire, Lomé',
        statut: 'actif',
      },
    })

    // 5. Agences locales physiques
    const agencesData = [
      { compagnie_id: nagode.id, ville_id: villesMap.get('Lomé').id, nom_agence: 'Nagodé Agence Centrale (Agoè)', adresse: 'Carrefour GTA', telephone: '+228 90 12 34 01' },
      { compagnie_id: nagode.id, ville_id: villesMap.get('Kara').id, nom_agence: 'Nagodé Kara Evali', adresse: 'Face Grand Marché de Kara', telephone: '+228 90 12 34 02' },
      { compagnie_id: nagode.id, ville_id: villesMap.get('Dapaong').id, nom_agence: 'Nagodé Dapaong Gare', adresse: 'Quartier Nassablé', telephone: '+228 90 12 34 03' },
      { compagnie_id: nagode.id, ville_id: villesMap.get('Cinkassé').id, nom_agence: 'Nagodé Cinkassé Frontière', adresse: 'Poste frontière Cinkassé', telephone: '+228 90 12 34 04' },
      { compagnie_id: solim.id, ville_id: villesMap.get('Lomé').id, nom_agence: 'SOLIM Déckon', adresse: 'Boulevard du 13 Janvier', telephone: '+228 91 23 45 01' },
      { compagnie_id: solim.id, ville_id: villesMap.get('Sokodé').id, nom_agence: 'SOLIM Sokodé Centre', adresse: 'Près de la Grande Mosquée', telephone: '+228 91 23 45 02' },
      { compagnie_id: solim.id, ville_id: villesMap.get('Atakpamé').id, nom_agence: 'SOLIM Atakpamé Ville', adresse: 'Rocade Nord', telephone: '+228 91 23 45 03' },
      { compagnie_id: solim.id, ville_id: villesMap.get('Kara').id, nom_agence: 'SOLIM Kara Centre', adresse: 'Boulevard du 13 Janvier Kara', telephone: '+228 91 23 45 04' },
      { compagnie_id: lkTransport.id, ville_id: villesMap.get('Lomé').id, nom_agence: 'LK Grand Marché', adresse: 'Rue de la Gare', telephone: '+228 92 34 56 01' },
      { compagnie_id: lkTransport.id, ville_id: villesMap.get('Kpalimé').id, nom_agence: 'LK Kpalimé Mont Kloto', adresse: 'Avenue de la Victoire', telephone: '+228 92 34 56 02' },
    ]
    for (const ag of agencesData) {
      await prisma.agenceLocale.create({ data: ag })
    }

    // 6. Flotte de véhicules
    const nagodeBus1 = await prisma.vehicule.create({
      data: { compagnie_id: nagode.id, immatriculation: 'TG-8421-BF', type: 'Autocar VIP Yutong Climatisé (55 places)', nombre_places: 55, statut: 'disponible' },
    })
    const nagodeBus2 = await prisma.vehicule.create({
      data: { compagnie_id: nagode.id, immatriculation: 'TG-6312-AH', type: 'Autocar Standard King Long (50 places)', nombre_places: 50, statut: 'disponible' },
    })
    const solimBus1 = await prisma.vehicule.create({
      data: { compagnie_id: solim.id, immatriculation: 'TG-5198-AL', type: 'Bus Confort Toyota Coaster (30 places)', nombre_places: 30, statut: 'disponible' },
    })
    const solimBus2 = await prisma.vehicule.create({
      data: { compagnie_id: solim.id, immatriculation: 'TG-7724-BM', type: 'Autocar Grand Tourisme (55 places)', nombre_places: 55, statut: 'disponible' },
    })
    const lkMinibus = await prisma.vehicule.create({
      data: { compagnie_id: lkTransport.id, immatriculation: 'TG-3410-AP', type: 'Minibus Express Toyota HiAce (18 places)', nombre_places: 18, statut: 'disponible' },
    })

    // 7. Utilisateurs & comptes de démonstration
    const superAdmin = await prisma.utilisateur.create({
      data: {
        nom: 'Edoh', prenom: 'Komi (Super Admin)', email: 'superadmin@togotransit.tg', telephone: '+228 90 00 00 01',
        mot_de_passe: await bcrypt.hash('Admin2026!', 10), role: 'super_admin', statut: 'actif',
      },
    })
    await prisma.utilisateur.create({
      data: {
        nom: 'Houndjo', prenom: 'Nayra (Gestionnaire)', email: 'admin@nagode.tg', telephone: '+228 90 11 22 33',
        mot_de_passe: await bcrypt.hash('Nagode2026!', 10), role: 'gestionnaire', compagnie_id: nagode.id, statut: 'actif',
      },
    })
    await prisma.utilisateur.create({
      data: {
        nom: 'Anakpa', prenom: 'Michel (Gestionnaire)', email: 'admin@solim.tg', telephone: '+228 91 22 33 44',
        mot_de_passe: await bcrypt.hash('Solim2026!', 10), role: 'gestionnaire', compagnie_id: solim.id, statut: 'actif',
      },
    })
    await prisma.utilisateur.create({
      data: {
        nom: "N'djelle", prenom: 'Marcel (Gestionnaire)', email: 'admin@lk.tg', telephone: '+228 92 33 44 55',
        mot_de_passe: await bcrypt.hash('Lk2026!', 10), role: 'gestionnaire', compagnie_id: lkTransport.id, statut: 'actif',
      },
    })
    await prisma.utilisateur.create({
      data: {
        nom: 'Agbeko', prenom: 'Yawa (Gestionnaire)', email: 'admin@rakieta.tg', telephone: '+228 93 44 55 66',
        mot_de_passe: await bcrypt.hash('Rakieta2026!', 10), role: 'gestionnaire', compagnie_id: rakieta.id, statut: 'actif',
      },
    })
    const chauffeurNagode = await prisma.utilisateur.create({
      data: {
        nom: 'Lawson', prenom: 'Koffi (Chauffeur)', email: 'chauffeur@nagode.tg', telephone: '+228 99 88 77 66',
        mot_de_passe: await bcrypt.hash('Chauffeur2026!', 10), role: 'voyageur', compagnie_id: nagode.id, statut: 'actif',
      },
    })
    const clientTest = await prisma.utilisateur.create({
      data: {
        nom: 'Abalo', prenom: 'Kossi (Client)', email: 'voyageur@gmail.com', telephone: '+228 90 55 66 77',
        mot_de_passe: await bcrypt.hash('Voyageur2026!', 10), role: 'voyageur', statut: 'actif',
      },
    })

    // 8. Tarifs de fret / colis
    const faresData = [
      { compagnie_id: nagode.id, origin: 'Lomé', destination: 'Kara', baseFare: 2000, pricePerKg: 500, category: 'STANDARD', zone: 'NORD_1' },
      { compagnie_id: nagode.id, origin: 'Lomé', destination: 'Dapaong', baseFare: 2500, pricePerKg: 600, category: 'STANDARD', zone: 'NORD_2' },
      { compagnie_id: nagode.id, origin: 'Lomé', destination: 'Cinkassé', baseFare: 3000, pricePerKg: 700, category: 'EXPRESS', zone: 'FRONTIERE' },
      { compagnie_id: solim.id, origin: 'Lomé', destination: 'Atakpamé', baseFare: 1200, pricePerKg: 300, category: 'STANDARD', zone: 'CENTRE_1' },
      { compagnie_id: solim.id, origin: 'Lomé', destination: 'Sokodé', baseFare: 1800, pricePerKg: 450, category: 'STANDARD', zone: 'CENTRE_2' },
      { compagnie_id: solim.id, origin: 'Lomé', destination: 'Kara', baseFare: 2200, pricePerKg: 500, category: 'VIP_FRET', zone: 'NORD_1' },
      { compagnie_id: lkTransport.id, origin: 'Lomé', destination: 'Kpalimé', baseFare: 1000, pricePerKg: 250, category: 'STANDARD', zone: 'PLATEAUX' },
    ]
    for (const f of faresData) {
      await prisma.fare.create({ data: f })
    }

    // 9. Trajets programmés (multi-compagnies, pour le comparateur)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const makeDate = (base: Date, hours: number, minutes: number) => {
      const d = new Date(base)
      d.setHours(hours, minutes, 0, 0)
      return d
    }

    const trajetNagodeLomeKara = await prisma.trajet.create({
      data: {
        compagnie_id: nagode.id, vehicule_id: nagodeBus1.id,
        ville_depart_id: villesMap.get('Lomé').id, ville_arrivee_id: villesMap.get('Kara').id,
        date_depart: makeDate(tomorrow, 6, 30), heure_depart: makeDate(tomorrow, 6, 30),
        prix: 8500, places_disponibles: 52, statut: 'planifie', driver_id: chauffeurNagode.id,
        currentLat: 6.1375, currentLng: 1.2123,
      },
    })
    await prisma.trajet.create({
      data: {
        compagnie_id: solim.id, vehicule_id: solimBus2.id,
        ville_depart_id: villesMap.get('Lomé').id, ville_arrivee_id: villesMap.get('Kara').id,
        date_depart: makeDate(tomorrow, 7, 0), heure_depart: makeDate(tomorrow, 7, 0),
        prix: 9000, places_disponibles: 48, statut: 'planifie', currentLat: 6.1375, currentLng: 1.2123,
      },
    })
    await prisma.trajet.create({
      data: {
        compagnie_id: lkTransport.id, vehicule_id: lkMinibus.id,
        ville_depart_id: villesMap.get('Lomé').id, ville_arrivee_id: villesMap.get('Kpalimé').id,
        date_depart: makeDate(tomorrow, 8, 0), heure_depart: makeDate(tomorrow, 8, 0),
        prix: 2500, places_disponibles: 14, statut: 'planifie',
      },
    })
    await prisma.trajet.create({
      data: {
        compagnie_id: solim.id, vehicule_id: solimBus1.id,
        ville_depart_id: villesMap.get('Lomé').id, ville_arrivee_id: villesMap.get('Kpalimé').id,
        date_depart: makeDate(tomorrow, 9, 30), heure_depart: makeDate(tomorrow, 9, 30),
        prix: 2800, places_disponibles: 26, statut: 'planifie',
      },
    })
    await prisma.trajet.create({
      data: {
        compagnie_id: solim.id, vehicule_id: solimBus1.id,
        ville_depart_id: villesMap.get('Lomé').id, ville_arrivee_id: villesMap.get('Sokodé').id,
        date_depart: makeDate(tomorrow, 7, 30), heure_depart: makeDate(tomorrow, 7, 30),
        prix: 6500, places_disponibles: 22, statut: 'planifie',
      },
    })
    await prisma.trajet.create({
      data: {
        compagnie_id: nagode.id, vehicule_id: nagodeBus2.id,
        ville_depart_id: villesMap.get('Lomé').id, ville_arrivee_id: villesMap.get('Cinkassé').id,
        date_depart: makeDate(tomorrow, 5, 30), heure_depart: makeDate(tomorrow, 5, 30),
        prix: 13000, places_disponibles: 45, statut: 'planifie',
      },
    })

    // 10. Réservation & billets QR de démonstration
    await prisma.reservation.create({
      data: {
        utilisateur_id: clientTest.id, trajet_id: trajetNagodeLomeKara.id,
        nombre_places: 2, montant_total: 17000, statut: 'confirmee',
        passagers: {
          create: [
            { nom_complet: 'Kossi Abalo', telephone: '+228 90 55 66 77', numero_siege: '12A' },
            { nom_complet: 'Afi Abalo', telephone: '+228 90 55 66 78', numero_siege: '12B' },
          ],
        },
        paiements: {
          create: { methode: 'tmoney', reference_transaction: 'TMONEY-TG-2026-98412', montant: 17000, statut: 'reussi', date_paiement: now },
        },
        billets: {
          create: [
            { code_qr: 'TGT-NAGODE-LOM-KAR-001', numero_billet: 'BIL-2026-0001', statut: 'valide' },
            { code_qr: 'TGT-NAGODE-LOM-KAR-002', numero_billet: 'BIL-2026-0002', statut: 'valide' },
          ],
        },
      },
    })

    // 11. Colis de démonstration
    await prisma.parcel.create({
      data: {
        compagnie_id: nagode.id, trackingId: 'TG-KARA-2026-8801', senderId: clientTest.id,
        senderName: 'Kossi Abalo', senderPhone: '+228 90 55 66 77',
        receiverName: 'Mensa Kodjo', receiverPhone: '+228 92 11 00 22',
        weight: 12.5, category: 'ELECTRONIQUE', deliveryType: 'EXPRESS',
        origin: 'Lomé', destination: 'Kara', status: 'IN_TRANSIT',
        price: 8250, paymentStatus: 'PAID', paymentMethod: 'FLOOZ', driverId: chauffeurNagode.id,
        statusHistory: JSON.stringify([
          { status: 'CREATED', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), location: 'Agence Nagodé Agoè' },
          { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), location: 'En route vers Kara (Atakpamé)' },
        ]),
      },
    })
    await prisma.parcel.create({
      data: {
        compagnie_id: lkTransport.id, trackingId: 'TG-KPAL-2026-4402', senderId: clientTest.id,
        senderName: 'Amavi Koffi', senderPhone: '+228 91 88 77 66',
        receiverName: 'Akouvi Sika', receiverPhone: '+228 90 33 22 11',
        weight: 5.0, category: 'DOCUMENTS', deliveryType: 'STANDARD',
        origin: 'Lomé', destination: 'Kpalimé', status: 'DELIVERED',
        price: 2250, paymentStatus: 'PAID', paymentMethod: 'TMONEY',
        pod: {
          create: {
            signatureUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cGF0aCBkPSJNMTAgODAgUTQ1IDUgOTUgODAiIHN0cm9rZT0iYmxhY2siIGZpbGw9InRyYW5zcGFyZW50Ii8+PC9zdmc+',
            photoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400',
            latitude: 6.9067, longitude: 0.6306, deliveredAt: new Date(Date.now() - 3600000),
          },
        },
      },
    })

    // 12. Avis client
    await prisma.avis.create({
      data: {
        utilisateur_id: clientTest.id, compagnie_id: nagode.id, trajet_id: trajetNagodeLomeKara.id,
        note: 5, commentaire: 'Super voyage avec Nagodé ! Bus climatisé très propre et départ à l\'heure exacte.',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Données réinitialisées avec le jeu de données canonique.',
      comptes: {
        super_admin: { email: 'superadmin@togotransit.tg', mot_de_passe: 'Admin2026!' },
        gestionnaires: [
          { compagnie: 'Nagodé Transport', email: 'admin@nagode.tg', mot_de_passe: 'Nagode2026!' },
          { compagnie: 'SOLIM Transport', email: 'admin@solim.tg', mot_de_passe: 'Solim2026!' },
          { compagnie: 'LK Transport', email: 'admin@lk.tg', mot_de_passe: 'Lk2026!' },
          { compagnie: 'Rakiéta Transport', email: 'admin@rakieta.tg', mot_de_passe: 'Rakieta2026!' },
        ],
        chauffeur: { compagnie: 'Nagodé Transport', email: 'chauffeur@nagode.tg', mot_de_passe: 'Chauffeur2026!' },
        voyageur: { email: 'voyageur@gmail.com', mot_de_passe: 'Voyageur2026!' },
      },
    })
  } catch (error: any) {
    console.error('Reseed Error:', error)
    return NextResponse.json({ error: 'Échec de la réinitialisation', detail: error?.message }, { status: 500 })
  }
}
