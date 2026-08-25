-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CompagnieStatut" AS ENUM ('actif', 'suspendu', 'en_attente');

-- CreateEnum
CREATE TYPE "UtilisateurRole" AS ENUM ('voyageur', 'gestionnaire', 'super_admin');

-- CreateEnum
CREATE TYPE "UtilisateurStatut" AS ENUM ('actif', 'bloqué');

-- CreateEnum
CREATE TYPE "VehiculeStatut" AS ENUM ('disponible', 'en_maintenance', 'hors_service');

-- CreateEnum
CREATE TYPE "TrajetStatut" AS ENUM ('planifié', 'en_cours', 'terminé', 'annulé');

-- CreateEnum
CREATE TYPE "ReservationStatut" AS ENUM ('en_attente', 'confirmée', 'annulée');

-- CreateEnum
CREATE TYPE "PaiementMethode" AS ENUM ('flooz', 'tmoney', 'carte', 'autre');

-- CreateEnum
CREATE TYPE "PaiementStatut" AS ENUM ('en_attente', 'réussi', 'échoué');

-- CreateEnum
CREATE TYPE "BilletStatut" AS ENUM ('valide', 'utilisé', 'annulé');

-- CreateTable
CREATE TABLE "compagnies" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "logo" TEXT,
    "description" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "adresse_siege" TEXT,
    "statut" "CompagnieStatut" NOT NULL DEFAULT 'en_attente',
    "date_inscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compagnies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT NOT NULL,
    "mot_de_passe" TEXT NOT NULL,
    "role" "UtilisateurRole" NOT NULL DEFAULT 'voyageur',
    "compagnie_id" INTEGER,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "UtilisateurStatut" NOT NULL DEFAULT 'actif',

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "villes" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "region" TEXT,

    CONSTRAINT "villes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agences_locales" (
    "id" SERIAL NOT NULL,
    "compagnie_id" INTEGER NOT NULL,
    "ville_id" INTEGER NOT NULL,
    "nom_agence" TEXT NOT NULL,
    "adresse" TEXT,
    "telephone" TEXT,

    CONSTRAINT "agences_locales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicules" (
    "id" SERIAL NOT NULL,
    "compagnie_id" INTEGER NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nombre_places" INTEGER NOT NULL,
    "statut" "VehiculeStatut" NOT NULL DEFAULT 'disponible',

    CONSTRAINT "vehicules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trajets" (
    "id" SERIAL NOT NULL,
    "compagnie_id" INTEGER NOT NULL,
    "vehicule_id" INTEGER NOT NULL,
    "ville_depart_id" INTEGER NOT NULL,
    "ville_arrivee_id" INTEGER NOT NULL,
    "date_depart" TIMESTAMP(3) NOT NULL,
    "heure_depart" TIMESTAMP(3) NOT NULL,
    "duree_estimee" TIMESTAMP(3),
    "prix" DOUBLE PRECISION NOT NULL,
    "places_disponibles" INTEGER NOT NULL,
    "statut" "TrajetStatut" NOT NULL DEFAULT 'planifié',
    "driver_id" INTEGER,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "lastUpdate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trajets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "utilisateur_id" INTEGER NOT NULL,
    "trajet_id" INTEGER NOT NULL,
    "nombre_places" INTEGER NOT NULL,
    "montant_total" DOUBLE PRECISION NOT NULL,
    "statut" "ReservationStatut" NOT NULL DEFAULT 'en_attente',
    "date_reservation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passagers" (
    "id" SERIAL NOT NULL,
    "reservation_id" INTEGER NOT NULL,
    "nom_complet" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "numero_siege" TEXT,

    CONSTRAINT "passagers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements" (
    "id" SERIAL NOT NULL,
    "reservation_id" INTEGER NOT NULL,
    "methode" "PaiementMethode" NOT NULL,
    "reference_transaction" TEXT,
    "montant" DOUBLE PRECISION NOT NULL,
    "statut" "PaiementStatut" NOT NULL DEFAULT 'en_attente',
    "date_paiement" TIMESTAMP(3),

    CONSTRAINT "paiements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billets" (
    "id" SERIAL NOT NULL,
    "reservation_id" INTEGER NOT NULL,
    "code_qr" TEXT NOT NULL,
    "numero_billet" TEXT NOT NULL,
    "date_emission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "BilletStatut" NOT NULL DEFAULT 'valide',

    CONSTRAINT "billets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avis" (
    "id" SERIAL NOT NULL,
    "utilisateur_id" INTEGER NOT NULL,
    "compagnie_id" INTEGER NOT NULL,
    "trajet_id" INTEGER NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT,
    "date_avis" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tripId" INTEGER,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fares" (
    "id" SERIAL NOT NULL,
    "compagnie_id" INTEGER,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "pricePerKg" DOUBLE PRECISION NOT NULL,
    "baseFare" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "zone" TEXT NOT NULL,

    CONSTRAINT "fares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "systemsettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "companyName" TEXT NOT NULL DEFAULT 'TogoTransit S.A.',
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maintenance" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "systemsettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pods" (
    "id" SERIAL NOT NULL,
    "parcelId" INTEGER NOT NULL,
    "signatureUrl" TEXT,
    "photoUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcels" (
    "id" SERIAL NOT NULL,
    "compagnie_id" INTEGER,
    "trackingId" TEXT NOT NULL,
    "senderId" INTEGER,
    "driverId" INTEGER,
    "senderName" TEXT NOT NULL,
    "senderPhone" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "receiverPhone" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "deliveryType" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "statusHistory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compagnies_statut_idx" ON "compagnies"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_telephone_key" ON "utilisateurs"("telephone");

-- CreateIndex
CREATE INDEX "utilisateurs_role_idx" ON "utilisateurs"("role");

-- CreateIndex
CREATE INDEX "utilisateurs_compagnie_id_idx" ON "utilisateurs"("compagnie_id");

-- CreateIndex
CREATE INDEX "utilisateurs_statut_idx" ON "utilisateurs"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "villes_nom_key" ON "villes"("nom");

-- CreateIndex
CREATE INDEX "villes_region_idx" ON "villes"("region");

-- CreateIndex
CREATE INDEX "agences_locales_compagnie_id_idx" ON "agences_locales"("compagnie_id");

-- CreateIndex
CREATE INDEX "agences_locales_ville_id_idx" ON "agences_locales"("ville_id");

-- CreateIndex
CREATE UNIQUE INDEX "agences_locales_compagnie_id_ville_id_nom_agence_key" ON "agences_locales"("compagnie_id", "ville_id", "nom_agence");

-- CreateIndex
CREATE UNIQUE INDEX "vehicules_immatriculation_key" ON "vehicules"("immatriculation");

-- CreateIndex
CREATE INDEX "vehicules_compagnie_id_idx" ON "vehicules"("compagnie_id");

-- CreateIndex
CREATE INDEX "vehicules_statut_idx" ON "vehicules"("statut");

-- CreateIndex
CREATE INDEX "trajets_ville_depart_id_ville_arrivee_id_date_depart_idx" ON "trajets"("ville_depart_id", "ville_arrivee_id", "date_depart");

-- CreateIndex
CREATE INDEX "trajets_compagnie_id_idx" ON "trajets"("compagnie_id");

-- CreateIndex
CREATE INDEX "trajets_statut_idx" ON "trajets"("statut");

-- CreateIndex
CREATE INDEX "trajets_vehicule_id_idx" ON "trajets"("vehicule_id");

-- CreateIndex
CREATE INDEX "trajets_driver_id_idx" ON "trajets"("driver_id");

-- CreateIndex
CREATE INDEX "reservations_utilisateur_id_idx" ON "reservations"("utilisateur_id");

-- CreateIndex
CREATE INDEX "reservations_trajet_id_idx" ON "reservations"("trajet_id");

-- CreateIndex
CREATE INDEX "reservations_statut_idx" ON "reservations"("statut");

-- CreateIndex
CREATE INDEX "passagers_reservation_id_idx" ON "passagers"("reservation_id");

-- CreateIndex
CREATE INDEX "paiements_reservation_id_idx" ON "paiements"("reservation_id");

-- CreateIndex
CREATE INDEX "paiements_statut_idx" ON "paiements"("statut");

-- CreateIndex
CREATE INDEX "paiements_methode_idx" ON "paiements"("methode");

-- CreateIndex
CREATE UNIQUE INDEX "billets_numero_billet_key" ON "billets"("numero_billet");

-- CreateIndex
CREATE INDEX "billets_reservation_id_idx" ON "billets"("reservation_id");

-- CreateIndex
CREATE INDEX "billets_statut_idx" ON "billets"("statut");

-- CreateIndex
CREATE INDEX "billets_numero_billet_idx" ON "billets"("numero_billet");

-- CreateIndex
CREATE INDEX "avis_utilisateur_id_idx" ON "avis"("utilisateur_id");

-- CreateIndex
CREATE INDEX "avis_compagnie_id_idx" ON "avis"("compagnie_id");

-- CreateIndex
CREATE INDEX "avis_trajet_id_idx" ON "avis"("trajet_id");

-- CreateIndex
CREATE UNIQUE INDEX "pods_parcelId_key" ON "pods"("parcelId");

-- CreateIndex
CREATE UNIQUE INDEX "parcels_trackingId_key" ON "parcels"("trackingId");

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_compagnie_id_fkey" FOREIGN KEY ("compagnie_id") REFERENCES "compagnies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agences_locales" ADD CONSTRAINT "agences_locales_compagnie_id_fkey" FOREIGN KEY ("compagnie_id") REFERENCES "compagnies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agences_locales" ADD CONSTRAINT "agences_locales_ville_id_fkey" FOREIGN KEY ("ville_id") REFERENCES "villes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicules" ADD CONSTRAINT "vehicules_compagnie_id_fkey" FOREIGN KEY ("compagnie_id") REFERENCES "compagnies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trajets" ADD CONSTRAINT "trajets_compagnie_id_fkey" FOREIGN KEY ("compagnie_id") REFERENCES "compagnies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trajets" ADD CONSTRAINT "trajets_vehicule_id_fkey" FOREIGN KEY ("vehicule_id") REFERENCES "vehicules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trajets" ADD CONSTRAINT "trajets_ville_depart_id_fkey" FOREIGN KEY ("ville_depart_id") REFERENCES "villes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trajets" ADD CONSTRAINT "trajets_ville_arrivee_id_fkey" FOREIGN KEY ("ville_arrivee_id") REFERENCES "villes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trajets" ADD CONSTRAINT "trajets_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_trajet_id_fkey" FOREIGN KEY ("trajet_id") REFERENCES "trajets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passagers" ADD CONSTRAINT "passagers_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billets" ADD CONSTRAINT "billets_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis" ADD CONSTRAINT "avis_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis" ADD CONSTRAINT "avis_compagnie_id_fkey" FOREIGN KEY ("compagnie_id") REFERENCES "compagnies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis" ADD CONSTRAINT "avis_trajet_id_fkey" FOREIGN KEY ("trajet_id") REFERENCES "trajets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trajets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fares" ADD CONSTRAINT "fares_compagnie_id_fkey" FOREIGN KEY ("compagnie_id") REFERENCES "compagnies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pods" ADD CONSTRAINT "pods_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_compagnie_id_fkey" FOREIGN KEY ("compagnie_id") REFERENCES "compagnies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

