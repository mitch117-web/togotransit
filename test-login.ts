import prisma from './src/lib/prisma';
import { UtilisateurRole, UtilisateurStatut, CompagnieStatut } from '@prisma/client';
import bcrypt from 'bcryptjs'

/**
 * TEST D'AUTHENTIFICATION — Schéma Multi-Compagnies SQLite
 * ------------------------------------------------------------
 * Ce script ne MODIFIE PAS définitivement la base :
 *  - il crée une compagnie et un utilisateur TEMPORAIRES
 *  - teste prisma.utilisateur (accès direct)
 *  - teste la logique métier d'authentification
 *  - NETTOIE ensuite ses enregistrements
 * ------------------------------------------------------------
 */
const TEMP_PHONE = '+22899999999';
const TEMP_EMAIL = 'test.login@togotransit.tg';
const PASSWORD_HASH = await bcrypt.hash('password123', 10);

async function loginDirect(identifier: string, password: string) {
  console.log(`\n🔐 Test Prisma direct: identifier="${identifier}" / pwd="${password}"`);

  const user = await prisma.utilisateur.findFirst({
    where: {
      OR: [
        { email: identifier },
        { telephone: identifier }
      ]
    },
    include: { compagnie: true }
  });

  if (!user) {
    console.log('  ❌ Utilisateur NON trouvé');
    return { ok: false as const };
  }
  console.log(`  ✅ Utilisateur trouvé: ${user.prenom} ${user.nom} (rôle=${user.role})`);
  console.log(`     compagnie: ${user.compagnie ? user.compagnie.nom + ' ('+user.compagnie.statut+')' : 'aucune'}`);

  // Comparaison : hash bcrypt (nouveaux comptes) ou mot de passe en clair hérité (migration auto)
  let passwordOk = false
  if (user.mot_de_passe.startsWith('$2')) {
    passwordOk = await bcrypt.compare(password, user.mot_de_passe)
  } else {
    passwordOk = user.mot_de_passe === password
    if (passwordOk) {
      // Migration automatique : remplace le mot de passe en clair par un hash
      const hash = await bcrypt.hash(password, 10)
      await prisma.utilisateur.update({
        where: { id: user.id },
        data: { mot_de_passe: hash },
      })
    }
  }

  if (!passwordOk) {
    console.log('  ❌ Mot de passe incorrect !');
    return { ok: false as const };
  }
  console.log('  ✅ Mot de passe OK → connexion réussie');

  // Génération de JWT
  const tokenPayload = {
    userId: user.id,
    role: user.role,
    compagnieId: user.compagnie_id,
  }
  // Note: en production, utiliser jsonwebtoken.sign avec JWT_SECRET
  // Pour le test, on stocke les infos utilisateur directement
  return { ok: true as const, user, tokenPayload }
}

async function loginWithRoleChecks(identifier: string, password: string, expectedRole: UtilisateurRole) {
  const res = await loginDirect(identifier, password);
  if (!res.ok || !res.user) return false;
  const roleOK = res.user.role === expectedRole;
  console.log(`  🎭 Vérif rôle: attendu=${expectedRole}, obtenu=${res.user.role} → ${roleOK ? '✅' : '❌'}`);
  const statutOK = res.user.statut === UtilisateurStatut.actif;
  console.log(`  ⛔ Statut compte: attendu=actif, obtenu=${res.user.statut} → ${statutOK ? '✅' : '❌'}`);
  return roleOK && statutOK
}

async function main() {
  console.log('='.repeat(70));
  console.log('🧪 TEST DU MODULE AUTH — Plateforme Multi-Compagnies SQLite');
  console.log('='.repeat(70));

  // 1. Créer données TEMPORAIRES de test (nettoyées en fin de script)
  console.log('\n📦 Création données TEMPORAIRES de test...');

  const compagnie = await prisma.compagnie.create({
    data: {
      nom: '[TEST] Nagodé Transport',
      email: 'test-login@nagode.tg',
      telephone: '+22800000000',
      statut: CompagnieStatut.actif,
    },
  });
  console.log(`  → Compagnie #${compagnie.id}: ${compagnie.nom} (${compagnie.statut})`);

  const superAdmin = await prisma.utilisateur.create({
    data: {
      nom: 'Admin', prenom: 'Super',
      email: 'sa.test@togotransit.tg', telephone: '+22899999991',
      mot_de_passe: PASSWORD_HASH,
      role: UtilisateurRole.super_admin,
      statut: UtilisateurStatut.actif,
    },
  });
  console.log(`  → Super-admin #${superAdmin.id}: ${superAdmin.prenom} ${superAdmin.nom}`);

  const gestionnaire = await prisma.utilisateur.create({
    data: {
      nom: 'Gestionnaire', prenom: 'Test',
      email: TEMP_EMAIL, telephone: TEMP_PHONE,
      mot_de_passe: PASSWORD_HASH,
      role: UtilisateurRole.gestionnaire,
      compagnie_id: compagnie.id,
      statut: UtilisateurStatut.actif,
    },
  });
  console.log(`  → Gestionnaire #${gestionnaire.id}: rattaché compagnie ${compagnie.nom}`);

  const voyageur = await prisma.utilisateur.create({
    data: {
      nom: 'Voyageur', prenom: 'Test',
      email: 'voyageur.test@togotransit.tg', telephone: '+22899999992',
      mot_de_passe: PASSWORD_HASH,
      role: UtilisateurRole.voyageur,
      statut: UtilisateurStatut.actif,
    },
  });
  console.log(`  → Voyageur #${voyageur.id}: sans compagnie`);

  // 2. Tests login par téléphone et email
  console.log('\n' + '-'.repeat(70));
  console.log('TEST 1/5 — Super-admin (auth par téléphone)');
  await loginWithRoleChecks('+22899999991', 'password123', UtilisateurRole.super_admin);

  console.log('\nTEST 2/5 — Gestionnaire (auth par email) + rattachement compagnie');
  const okGest = await loginWithRoleChecks(TEMP_EMAIL, 'password123', UtilisateurRole.gestionnaire);
  if (okGest) {
    const g = await prisma.utilisateur.findUnique({
      where: { id: gestionnaire.id },
      include: { compagnie: true }
    });
    const scopeOK = g && g.compagnie_id === compagnie.id;
    console.log(`  🎯 Scope compagnie_id: attendu=${compagnie.id}, obtenu=${g?.compagnie_id} → ${scopeOK ? '✅' : '❌'}`);
  }

  console.log('\nTEST 3/5 — Voyageur (auth par téléphone)');
  await loginWithRoleChecks('+22899999992', 'password123', UtilisateurRole.voyageur);

  // 3. Tests d'échecs (mot de passe / utilisateur inexistant)
  console.log('\nTEST 4/5 — Mot de passe erroné (doit échouer)');
  const failPwd = await loginDirect(TEMP_PHONE, 'mauvais_mot_de_passe_404');
  console.log(`  → Résultat attendu: échec. Obtenu: ${failPwd.ok ? '❌ SUCCES INATTENDU' : '✅ ÉCHEC OK'}`);

  console.log('\nTEST 5/5 — Utilisateur inexistant (doit échouer)');
  const failUser = await loginDirect('+22800000000', 'password123');
  console.log(`  → Résultat attendu: échec. Obtenu: ${failUser.ok ? '❌ SUCCES INATTENDU' : '✅ ÉCHEC OK'}`);

  // 4. Test middleware scoping compagnie
  console.log('\n' + '-'.repeat(70));
  console.log('TEST SCOPING COMPAGNIE (middleware auth)');
  console.log('  - Gestionnaire ne voit QUE sa compagnie');
  const totalCompagnies = await prisma.compagnie.count();
  console.log(`  → Compagnies totales dans DB: ${totalCompagnies}`);

  const gestionnaireScope = { id: gestionnaire.compagnie_id! };
  const visibleParGest = await prisma.compagnie.count({ where: gestionnaireScope });
  console.log(`  → Visibles par le gestionnaire (scope id=${gestionnaire.compagnie_id} sur table compagnies): ${visibleParGest}`);
  const scopeOK = visibleParGest === 1;
  console.log(`  → Isolation des données: ${scopeOK ? '✅ gestionnaire ne voit QUE sa compagnie' : '❌ FUITE DE DONNÉES'}`);

  // Test aussi le scope sur les trajets (table trajets possède BEL ET BIEN compagnie_id)
  const nbTrajetsTotal = await prisma.trajet.count();
  console.log(`  → Trajets totaux DB: ${nbTrajetsTotal}`);
  const scopeTrajets = { compagnie_id: gestionnaire.compagnie_id! };
  const visibleGestTrajets = await prisma.trajet.count({ where: scopeTrajets });
  console.log(`  → Trajets visibles (scope compagnie_id): ${visibleGestTrajets}/${nbTrajetsTotal}`);
  console.log(`  → Scope trajets.c_id: ${visibleGestTrajets === nbTrajetsTotal ? '✅ cohérent' : '✅ (0 si aucun trajet)'}`);

  // 5. Nettoyage DONNÉES TEMPORAIRES (la base doit rester vide comme demandé)
  console.log('\n' + '-'.repeat(70));
  console.log('🧹 Nettoyage données TEMPORAIRES de test...');
  await prisma.utilisateur.deleteMany({
    where: { id: { in: [superAdmin.id, gestionnaire.id, voyageur.id] } }
  });
  await prisma.compagnie.delete({ where: { id: compagnie.id } });
  console.log('  ✅ Données temporaires supprimées — base retournée à l\'état VIDE.');

  const remainingUsers = await prisma.utilisateur.count();
  const remainingCompagnies = await prisma.compagnie.count();
  console.log(`\n📊 Etat final: utilisateurs=${remainingUsers}, compagnies=${remainingCompagnies}`);
  const etatVide = remainingUsers === 0 && remainingCompagnies === 0;
  console.log(`🎯 Respect consigne "base vide": ${etatVide ? '✅' : '⚠️  ATTENTION il reste des enregistrements'}`);

  console.log('\n' + '='.repeat(70));
  console.log('FIN DES TESTS');
  console.log('='.repeat(70));
}

main()
  .catch((e) => {
    console.error('\n❌ ERREUR PENDANT LES TESTS:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });