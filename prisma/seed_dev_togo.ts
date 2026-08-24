import prisma from '../src/lib/prisma'
import bcrypt from 'bcryptjs'
import {
  CompagnieStatut,
  UtilisateurRole,
  UtilisateurStatut,
  VehiculeStatut,
  TrajetStatut,
} from '@prisma/client'

/**
 * SCRIPT DE DONNÉES DE DÉVELOPPEMENT — RÉALISTES (Togo)
 * ------------------------------------------------------------
 * Usage (uniquement pour dev) :
 *   cd togotransit_app
 *   npx ts-node prisma/seed_dev_togo.ts
 *
 * Ce script n'est PAS le seed officiel (qui reste vide).
 * Il sert uniquement à remplir la base avec des données
 * réalistes (compagnies togolaises, vraies villes, tarifs
 * plausibles) pour tester l'API et l'app mobile.
 *
 * Comptes créés (mot de passe: password123 pour tous, haché en bcrypt) :
 *   Super-admin:  sa@togotransit.tg   / +22800000000
 *   Gestionnaire:  secretariat@stt.tg  / +22891000001  (STT)
 *   Gestionnaire:  contact@nagode.tg   / +22891000002  (Nagodé)
 *   Voyageur:     koko.voyageur@tg    / +22890123456
 *   Voyageur:     ama.akli@tg         / +22890765432
 * ------------------------------------------------------------
 */

async function main() {
  console.log('='.repeat(70))
  console.log('🌍 SEED DÉVELOPPEMENT — Données réalistes du Togo')
  console.log('='.repeat(70))

  const PWD = 'password123'
  const PWD_HASH = await bcrypt.hash(PWD, 10)

  /* ------------------------------------------------------------------ *
   * 1. VILLES — vraies villes togolaises + voisines
   * ------------------------------------------------------------------ */
  console.log('\n📌 Villes (12)')
  const villesData = [
    { nom: 'Lomé', region: 'Maritime' },
    { nom: 'Tsévié', region: 'Maritime' },
    { nom: 'Kpalimé', region: 'Plateaux' },
    { nom: 'Atakpamé', region: 'Plateaux' },
    { nom: 'Sokodé', region: 'Centrale' },
    { nom: 'Bassar', region: 'Kara' },
    { nom: 'Kara', region: 'Kara' },
    { nom: 'Bafilo', region: 'Kara' },
    { nom: 'Dapaong', region: 'Savanes' },
    { nom: 'Mango', region: 'Savanes' },
    { nom: 'Cotonou', region: 'Bénin (frontière)' },
    { nom: 'Accra', region: 'Ghana (frontière)' },
  ]
  const villesCreated = await Promise.all(
    villesData.map(v => prisma.ville.create({ data: v }))
  )
  const villeMap: Record<string, number> = {}
  for (const v of villesCreated) villeMap[v.nom] = v.id
  console.log(`  ✅ ${villesCreated.length} villes insérées.`)

  /* ------------------------------------------------------------------ *
   * 2. COMPAGNIES — vraies compagnies togolaises ou plausibles
   * ------------------------------------------------------------------ */
  console.log('\n🚍 Compagnies (4)')
  const compagniesData = [
    {
      nom: 'STT — Société Togolaise des Transports',
      logo: null,
      description: 'Compagnie historique du Togo, dessert toutes les régions depuis Lomé.',
      telephone: '+228 22 20 00 15',
      email: 'contact@stt.tg',
      adresse_siege: 'Avenue de l\'Indépendance, Lomé',
      statut: 'actif' as CompagnieStatut,
    },
    {
      nom: 'Nagodé Transport',
      logo: null,
      description: 'Spécialiste du nord du pays — ligne Lomé ↔ Kara ↔ Dapaong.',
      telephone: '+228 90 01 22 33',
      email: 'contact@nagode.tg',
      adresse_siege: 'Quartier Tokoin, Lomé',
      statut: 'actif' as CompagnieStatut,
    },
    {
      nom: 'Elèdzo Voyages',
      logo: null,
      description: 'Compagnie premium — véhicules climatisés, Wi-Fi à bord.',
      telephone: '+228 91 11 44 55',
      email: 'info@eledzo.tg',
      adresse_siege: 'Dékon, Lomé',
      statut: 'actif' as CompagnieStatut,
    },
    {
      nom: 'Adji Transport International',
      logo: null,
      description: 'Lignes régulières vers le Ghana et le Bénin.',
      telephone: '+228 92 22 33 44',
      email: 'reservation@adji-transport.tg',
      adresse_siege: 'Aflao road, Lomé',
      statut: 'actif' as CompagnieStatut,
    },
  ]
  const compagniesCreated = await Promise.all(
    compagniesData.map(c => prisma.compagnie.create({ data: c }))
  )
  const compMap: Record<string, number> = {}
  for (const c of compagniesCreated) compMap[c.nom] = c.id
  console.log(`  ✅ ${compagniesCreated.length} compagnies insérées.`)

  /* ------------------------------------------------------------------ *
   * 3. VÉHICULES — types répandus au Togo
   * ------------------------------------------------------------------ */
  console.log('\n🚐 Véhicules (10)')
  const vehiculesData = [
    // STT
    { compagnie_id: compMap['STT — Société Togolaise des Transports'], immatriculation: 'TG-STT-001', type: 'Toyota HiAce', nombre_places: 18, statut: 'disponible' as VehiculeStatut },
    { compagnie_id: compMap['STT — Société Togolaise des Transports'], immatriculation: 'TG-STT-002', type: 'Toyota HiAce', nombre_places: 18, statut: 'disponible' as VehiculeStatut },
    { compagnie_id: compMap['STT — Société Togolaise des Transports'], immatriculation: 'TG-STT-003', type: 'Mercedes Sprinter', nombre_places: 22, statut: 'disponible' as VehiculeStatut },
    { compagnie_id: compMap['STT — Société Togolaise des Transports'], immatriculation: 'TG-STT-004', type: 'Toyota Coaster', nombre_places: 29, statut: 'disponible' as VehiculeStatut },
    // Nagodé
    { compagnie_id: compMap['Nagodé Transport'], immatriculation: 'TG-NGD-101', type: 'Toyota HiAce Grandia', nombre_places: 16, statut: 'disponible' as VehiculeStatut },
    { compagnie_id: compMap['Nagodé Transport'], immatriculation: 'TG-NGD-102', type: 'Mercedes Sprinter', nombre_places: 20, statut: 'disponible' as VehiculeStatut },
    { compagnie_id: compMap['Nagodé Transport'], immatriculation: 'TG-NGD-103', type: 'Toyota HiAce', nombre_places: 18, statut: 'disponible' as VehiculeStatut },
    // Elèdzo
    { compagnie_id: compMap['Elèdzo Voyages'], immatriculation: 'TG-ELZ-201', type: 'Mercedes Sprinter VIP', nombre_places: 15, statut: 'disponible' as VehiculeStatut },
    { compagnie_id: compMap['Elèdzo Voyages'], immatriculation: 'TG-ELZ-202', type: 'Hyundai Universe', nombre_places: 45, statut: 'disponible' as VehiculeStatut },
    // Adji
    { compagnie_id: compMap['Adji Transport International'], immatriculation: 'TG-ADI-301', type: 'Toyota HiAce', nombre_places: 18, statut: 'disponible' as VehiculeStatut },
  ]
  const vehCreated = await Promise.all(
    vehiculesData.map(v => prisma.vehicule.create({ data: v }))
  )
  const vehByCompId: Record<number, number[]> = {}
  for (const v of vehCreated) {
    if (!vehByCompId[v.compagnie_id]) vehByCompId[v.compagnie_id] = []
    vehByCompId[v.compagnie_id].push(v.id)
  }
  console.log(`  ✅ ${vehCreated.length} véhicules insérés.`)

  /* ------------------------------------------------------------------ *
   * 4. UTILISATEURS — 2 super-admin, 2 gestionnaires, 2 voyageurs
   * ------------------------------------------------------------------ */
  console.log('\n👤 Utilisateurs (6)')
  const usersData = [
    { nom: 'ADMIN', prenom: 'Super', email: 'sa@togotransit.tg', telephone: '+22800000000', mot_de_passe: PWD, role: 'super_admin' as UtilisateurRole, compagnie_id: null, statut: 'actif' as UtilisateurStatut },
    { nom: 'DOSSI', prenom: 'Marie', email: 'secretariat@stt.tg', telephone: '+22891000001', mot_de_passe: PWD, role: 'gestionnaire' as UtilisateurRole, compagnie_id: compMap['STT — Société Togolaise des Transports'], statut: 'actif' as UtilisateurStatut },
    { nom: 'TOLO', prenom: 'Kossi', email: 'contact@nagode.tg', telephone: '+22891000002', mot_de_passe: PWD, role: 'gestionnaire' as UtilisateurRole, compagnie_id: compMap['Nagodé Transport'], statut: 'actif' as UtilisateurStatut },
    { nom: 'ASSIGNON', prenom: 'Emmanuel', email: 'manu.assignon@tg', telephone: '+22891000003', mot_de_passe: PWD, role: 'gestionnaire' as UtilisateurRole, compagnie_id: compMap['Elèdzo Voyages'], statut: 'actif' as UtilisateurStatut },
    { nom: 'KOKOU', prenom: 'Désiré', email: 'koko.voyageur@tg', telephone: '+22890123456', mot_de_passe: PWD, role: 'voyageur' as UtilisateurRole, compagnie_id: null, statut: 'actif' as UtilisateurStatut },
    { nom: 'AKLI', prenom: 'Ama', email: 'ama.akli@tg', telephone: '+22890765432', mot_de_passe: PWD, role: 'voyageur' as UtilisateurRole, compagnie_id: null, statut: 'actif' as UtilisateurStatut },
  ]
  await Promise.all(usersData.map(u => prisma.utilisateur.create({ data: u })))
  console.log('  ✅ 6 comptes créés.')
  console.log('     🔑 Mot de passe partagé: password123 (haché bcrypt)')

  /* ------------------------------------------------------------------ *
   * 5. AGENCES LOCALES
   * ------------------------------------------------------------------ */
  console.log('\n🏢 Agences locales (5)')
  const agencesData = [
    { compagnie_id: compMap['STT — Société Togolaise des Transports'], ville_id: villeMap['Lomé'], nom_agence: 'Gare Centrale de Lomé', adresse: 'Place de l\'indépendance', telephone: '+228 22 20 00 16' },
    { compagnie_id: compMap['STT — Société Togolaise des Transports'], ville_id: villeMap['Kara'], nom_agence: 'Agence STT Kara', adresse: 'Boulevard du 13 janvier', telephone: '+228 24 40 01 10' },
    { compagnie_id: compMap['Nagodé Transport'], ville_id: villeMap['Lomé'], nom_agence: 'Terminus Tokoin Nagodé', adresse: 'Route de Tokoin', telephone: '+228 90 01 22 34' },
    { compagnie_id: compMap['Nagodé Transport'], ville_id: villeMap['Dapaong'], nom_agence: 'Agence Dapaong', adresse: 'Quartier Habou', telephone: '+228 25 50 04 20' },
    { compagnie_id: compMap['Adji Transport International'], ville_id: villeMap['Cotonou'], nom_agence: 'Frontière Aflao-Cotonou', adresse: 'Bureau frontalier', telephone: '+228 92 22 33 45' },
  ]
  await Promise.all(agencesData.map(a => prisma.agenceLocale.create({ data: a })))
  console.log(`  ✅ ${agencesData.length} agences créées.`)

  /* ------------------------------------------------------------------ *
   * 6. TRAJETS — horaires réalistes, tarifs plausibles
   *    Tarifs indicatifs Togo: Lomé-Kara ≈ 6000-8000 XOF, Lomé-Sokodé 4000-5500
   * ------------------------------------------------------------------ */
  console.log('\n🛣️  Trajets (14)')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const addDays = (d: Date, n: number) => {
    const x = new Date(d)
    x.setDate(x.getDate() + n)
    return x
  }

  const trajetFactory = (params: {
    compagnieNom: string
    vehIndex: number
    departNom: string
    arriveeNom: string
    dayOffset: number
    heureDepartStr: string // "HH:MM"
    dureeHHMM: string // "HH:MM"
    prix: number
    placesInitiales: number
  }) => {
    const compagnie_id = compMap[params.compagnieNom]
    const vehPool = vehByCompId[compagnie_id]
    const vehicule_id = vehPool[params.vehIndex % vehPool.length]
    const ville_depart_id = villeMap[params.departNom]
    const ville_arrivee_id = villeMap[params.arriveeNom]
    const date_depart = addDays(today, params.dayOffset)
    const [h, m] = params.heureDepartStr.split(':').map(Number)
    date_depart.setHours(h, m, 0, 0)

    const [dh, dm] = params.dureeHHMM.split(':').map(Number)
    const duree_estimee = new Date(0)
    duree_estimee.setUTCHours(dh, dm, 0, 0)

    return {
      compagnie_id,
      vehicule_id,
      ville_depart_id,
      ville_arrivee_id,
      date_depart,
      heure_depart: new Date(date_depart),
      duree_estimee,
      prix: params.prix,
      places_disponibles: params.placesInitiales,
      statut: 'planifie' as TrajetStatut,
      driver_id: null,
    }
  }

  const trajetsData = [
    // ------- JOUR J (aujourd'hui) -------
    trajetFactory({ compagnieNom: 'STT — Société Togolaise des Transports', vehIndex: 0, departNom: 'Lomé', arriveeNom: 'Kara', dayOffset: 0, heureDepartStr: '05:30', dureeHHMM: '06:30', prix: 6500, placesInitiales: 14 }),
    trajetFactory({ compagnieNom: 'STT — Société Togolaise des Transports', vehIndex: 1, departNom: 'Lomé', arriveeNom: 'Sokodé', dayOffset: 0, heureDepartStr: '06:00', dureeHHMM: '04:30', prix: 4500, placesInitiales: 12 }),
    trajetFactory({ compagnieNom: 'STT — Société Togolaise des Transports', vehIndex: 2, departNom: 'Lomé', arriveeNom: 'Atakpamé', dayOffset: 0, heureDepartStr: '07:00', dureeHHMM: '02:00', prix: 2500, placesInitiales: 20 }),
    trajetFactory({ compagnieNom: 'STT — Société Togolaise des Transports', vehIndex: 3, departNom: 'Lomé', arriveeNom: 'Kpalimé', dayOffset: 0, heureDepartStr: '08:00', dureeHHMM: '01:30', prix: 1800, placesInitiales: 25 }),

    trajetFactory({ compagnieNom: 'Nagodé Transport', vehIndex: 0, departNom: 'Lomé', arriveeNom: 'Kara', dayOffset: 0, heureDepartStr: '06:15', dureeHHMM: '06:00', prix: 7000, placesInitiales: 10 }),
    trajetFactory({ compagnieNom: 'Nagodé Transport', vehIndex: 1, departNom: 'Lomé', arriveeNom: 'Dapaong', dayOffset: 0, heureDepartStr: '05:00', dureeHHMM: '09:00', prix: 9500, placesInitiales: 15 }),
    trajetFactory({ compagnieNom: 'Nagodé Transport', vehIndex: 2, departNom: 'Kara', arriveeNom: 'Lomé', dayOffset: 0, heureDepartStr: '14:00', dureeHHMM: '06:00', prix: 7000, placesInitiales: 8 }),

    trajetFactory({ compagnieNom: 'Elèdzo Voyages', vehIndex: 0, departNom: 'Lomé', arriveeNom: 'Sokodé', dayOffset: 0, heureDepartStr: '07:30', dureeHHMM: '04:00', prix: 5500, placesInitiales: 12 }),
    trajetFactory({ compagnieNom: 'Elèdzo Voyages', vehIndex: 1, departNom: 'Lomé', arriveeNom: 'Kara', dayOffset: 0, heureDepartStr: '21:00', dureeHHMM: '07:00', prix: 8000, placesInitiales: 40 }),

    trajetFactory({ compagnieNom: 'Adji Transport International', vehIndex: 0, departNom: 'Lomé', arriveeNom: 'Cotonou', dayOffset: 0, heureDepartStr: '06:30', dureeHHMM: '03:30', prix: 5000, placesInitiales: 15 }),
    trajetFactory({ compagnieNom: 'Adji Transport International', vehIndex: 0, departNom: 'Lomé', arriveeNom: 'Accra', dayOffset: 0, heureDepartStr: '08:00', dureeHHMM: '02:45', prix: 4200, placesInitiales: 18 }),

    // ------- JOUR J+1 (demain) -------
    trajetFactory({ compagnieNom: 'STT — Société Togolaise des Transports', vehIndex: 0, departNom: 'Lomé', arriveeNom: 'Kara', dayOffset: 1, heureDepartStr: '05:30', dureeHHMM: '06:30', prix: 6500, placesInitiales: 18 }),
    trajetFactory({ compagnieNom: 'Nagodé Transport', vehIndex: 0, departNom: 'Lomé', arriveeNom: 'Dapaong', dayOffset: 1, heureDepartStr: '05:00', dureeHHMM: '09:00', prix: 9500, placesInitiales: 16 }),
    trajetFactory({ compagnieNom: 'Elèdzo Voyages', vehIndex: 1, departNom: 'Lomé', arriveeNom: 'Sokodé', dayOffset: 1, heureDepartStr: '07:30', dureeHHMM: '04:00', prix: 5500, placesInitiales: 45 }),
  ]

  await Promise.all(trajetsData.map(t => prisma.trajet.create({ data: t })))
  console.log(`  ✅ ${trajetsData.length} trajets insérés (J et J+1).`)
  console.log('     — 4 compagnies, 10 lignes: Lomé ↔ Kara, Sokodé, Atakpamé, Kpalimé, Dapaong, Cotonou, Accra')

  /* ------------------------------------------------------------------ *
   * 7. Paramètres système
   * ------------------------------------------------------------------ */
  await prisma.systemSettings.create({
    data: { id: 'global', companyName: 'TogoTransit S.A.', currency: 'XOF', smsEnabled: false, maintenance: false },
  })

  /* ------------------------------------------------------------------ *
   * 8. Résumé
   * ------------------------------------------------------------------ */
  const nbUsers = await prisma.utilisateur.count()
  const nbCompagnies = await prisma.compagnie.count()
  const nbVilles = await prisma.ville.count()
  const nbTrajets = await prisma.trajet.count()
  const nbVehicules = await prisma.vehicule.count()

  console.log('\n' + '='.repeat(70))
  console.log('📊 ÉTAT DE LA BASE APRÈS SEED DEV')
  console.log('='.repeat(70))
  console.log(`  Villes:       ${nbVilles}`)
  console.log(`  Compagnies:   ${nbCompagnies}`)
  console.log(`  Véhicules:    ${nbVehicules}`)
  console.log(`  Trajets:      ${nbTrajets}`)
  console.log(`  Utilisateurs: ${nbUsers}`)
  console.log('')
  console.log('🔑 COMPTES DE TEST (tous: password123, haché bcrypt)')
  console.log('  Super-admin:   sa@togotransit.tg    · +22800000000')
  console.log('  Gestionnaires: secretariat@stt.tg   · +22891000001 · STT')
  console.log('                 contact@nagode.tg    · +22891000002 · Nagodé')
  console.log('                 manu.assignon@tg     · +22891000003 · Elèdzo')
  console.log('  Voyageurs:     koko.voyageur@tg     · +22890123456')
  console.log('                 ama.akli@tg          · +22890765432')
  console.log('')
  console.log('🎯 LANCER UNE RECHERCHE TEST:')
  console.log('   GET /api/trajets/recherche?depart=Lomé&arrivee=Kara&date=' + today.toISOString().slice(0, 10))
  console.log('='.repeat(70))
}

main()
  .catch((e) => {
    console.error('\n❌ ERREUR:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })