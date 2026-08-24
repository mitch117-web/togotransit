-- =============================================================
--  MIGRATION INITIALE — Plateforme Multi-Compagnies TogoTransit
--  Moteur : SQLite 3
--  Contraintes : TEXT + CHECK à la place des ENUMs natifs
--  Règle : AUCUNE donnée factice insérée (structure vide)
--  Règle places_disponibles ≤ capacité : logique applicative
-- =============================================================

PRAGMA foreign_keys = ON;

-- -------------------------------------------------------------
--  1. COMPAGNIES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "compagnies" (
    "id"                  INTEGER PRIMARY KEY AUTOINCREMENT,
    "nom"                 TEXT NOT NULL,
    "logo"                TEXT,
    "description"         TEXT,
    "telephone"           TEXT,
    "email"               TEXT,
    "adresse_siege"       TEXT,
    "statut"              TEXT NOT NULL DEFAULT 'en_attente'
                              CHECK("statut" IN ('actif','suspendu','en_attente')),
    "date_inscription"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_compagnies_statut" ON "compagnies"("statut");

-- -------------------------------------------------------------
--  2. UTILISATEURS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "utilisateurs" (
    "id"                 INTEGER PRIMARY KEY AUTOINCREMENT,
    "nom"                TEXT NOT NULL,
    "prenom"             TEXT NOT NULL,
    "email"              TEXT UNIQUE,
    "telephone"          TEXT NOT NULL UNIQUE,
    "mot_de_passe"       TEXT NOT NULL,
    "role"               TEXT NOT NULL DEFAULT 'voyageur'
                             CHECK("role" IN ('voyageur','gestionnaire','super_admin')),
    "compagnie_id"       INTEGER,
    "date_creation"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut"             TEXT NOT NULL DEFAULT 'actif'
                             CHECK("statut" IN ('actif','bloqué')),
    CONSTRAINT "fk_utilisateurs_compagnie"
        FOREIGN KEY ("compagnie_id") REFERENCES "compagnies"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_utilisateurs_role"         ON "utilisateurs"("role");
CREATE INDEX IF NOT EXISTS "idx_utilisateurs_compagnie_id" ON "utilisateurs"("compagnie_id");
CREATE INDEX IF NOT EXISTS "idx_utilisateurs_statut"       ON "utilisateurs"("statut");

-- -------------------------------------------------------------
--  3. VILLES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "villes" (
    "id"       INTEGER PRIMARY KEY AUTOINCREMENT,
    "nom"      TEXT NOT NULL UNIQUE,
    "region"   TEXT
);
CREATE INDEX IF NOT EXISTS "idx_villes_region" ON "villes"("region");

-- -------------------------------------------------------------
--  4. AGENCES_LOCALES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "agences_locales" (
    "id"            INTEGER PRIMARY KEY AUTOINCREMENT,
    "compagnie_id"  INTEGER NOT NULL,
    "ville_id"      INTEGER NOT NULL,
    "nom_agence"    TEXT NOT NULL,
    "adresse"       TEXT,
    "telephone"     TEXT,
    CONSTRAINT "fk_agences_compagnie"
        FOREIGN KEY ("compagnie_id") REFERENCES "compagnies"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_agences_ville"
        FOREIGN KEY ("ville_id") REFERENCES "villes"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_agences_locales_compagnie_id" ON "agences_locales"("compagnie_id");
CREATE INDEX IF NOT EXISTS "idx_agences_locales_ville_id"     ON "agences_locales"("ville_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uk_agences_compagnie_ville_nom"
    ON "agences_locales"("compagnie_id","ville_id","nom_agence");

-- -------------------------------------------------------------
--  5. VEHICULES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "vehicules" (
    "id"               INTEGER PRIMARY KEY AUTOINCREMENT,
    "compagnie_id"     INTEGER NOT NULL,
    "immatriculation"  TEXT NOT NULL UNIQUE,
    "type"             TEXT NOT NULL,
    "nombre_places"    INTEGER NOT NULL,
    "statut"           TEXT NOT NULL DEFAULT 'disponible'
                           CHECK("statut" IN ('disponible','en_maintenance','hors_service')),
    CONSTRAINT "fk_vehicules_compagnie"
        FOREIGN KEY ("compagnie_id") REFERENCES "compagnies"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_vehicules_compagnie_id" ON "vehicules"("compagnie_id");
CREATE INDEX IF NOT EXISTS "idx_vehicules_statut"       ON "vehicules"("statut");

-- -------------------------------------------------------------
--  6. TRAJETS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "trajets" (
    "id"                  INTEGER PRIMARY KEY AUTOINCREMENT,
    "compagnie_id"        INTEGER NOT NULL,
    "vehicule_id"         INTEGER NOT NULL,
    "ville_depart_id"     INTEGER NOT NULL,
    "ville_arrivee_id"    INTEGER NOT NULL,
    "date_depart"         DATE NOT NULL,
    "heure_depart"        TIME NOT NULL,
    "duree_estimee"       TIME,
    "prix"                REAL NOT NULL,
    "places_disponibles"  INTEGER NOT NULL,
    "statut"              TEXT NOT NULL DEFAULT 'planifié'
                              CHECK("statut" IN ('planifié','en_cours','terminé','annulé')),
    "driver_id"           INTEGER,
    "currentLat"          REAL,
    "currentLng"          REAL,
    "lastUpdate"          DATETIME,
    "createdAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_trajets_compagnie"
        FOREIGN KEY ("compagnie_id") REFERENCES "compagnies"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_trajets_vehicule"
        FOREIGN KEY ("vehicule_id") REFERENCES "vehicules"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_trajets_ville_depart"
        FOREIGN KEY ("ville_depart_id") REFERENCES "villes"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_trajets_ville_arrivee"
        FOREIGN KEY ("ville_arrivee_id") REFERENCES "villes"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_trajets_driver"
        FOREIGN KEY ("driver_id") REFERENCES "utilisateurs"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
);
-- Index clé pour la recherche multi-compagnies (ville départ/arrivée + date)
CREATE INDEX IF NOT EXISTS "idx_trajets_recherche"
    ON "trajets"("ville_depart_id","ville_arrivee_id","date_depart");
CREATE INDEX IF NOT EXISTS "idx_trajets_compagnie_id" ON "trajets"("compagnie_id");
CREATE INDEX IF NOT EXISTS "idx_trajets_statut"       ON "trajets"("statut");
CREATE INDEX IF NOT EXISTS "idx_trajets_vehicule_id"  ON "trajets"("vehicule_id");
CREATE INDEX IF NOT EXISTS "idx_trajets_driver_id"    ON "trajets"("driver_id");

-- -------------------------------------------------------------
--  7. RESERVATIONS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "reservations" (
    "id"                INTEGER PRIMARY KEY AUTOINCREMENT,
    "utilisateur_id"    INTEGER NOT NULL,
    "trajet_id"         INTEGER NOT NULL,
    "nombre_places"     INTEGER NOT NULL,
    "montant_total"     REAL NOT NULL,
    "statut"            TEXT NOT NULL DEFAULT 'en_attente'
                            CHECK("statut" IN ('en_attente','confirmée','annulée')),
    "date_reservation"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_reservations_utilisateur"
        FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_reservations_trajet"
        FOREIGN KEY ("trajet_id") REFERENCES "trajets"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_reservations_utilisateur_id" ON "reservations"("utilisateur_id");
CREATE INDEX IF NOT EXISTS "idx_reservations_trajet_id"      ON "reservations"("trajet_id");
CREATE INDEX IF NOT EXISTS "idx_reservations_statut"         ON "reservations"("statut");

-- -------------------------------------------------------------
--  8. PASSAGERS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "passagers" (
    "id"              INTEGER PRIMARY KEY AUTOINCREMENT,
    "reservation_id"  INTEGER NOT NULL,
    "nom_complet"     TEXT NOT NULL,
    "telephone"       TEXT NOT NULL,
    "numero_siege"    TEXT,
    CONSTRAINT "fk_passagers_reservation"
        FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_passagers_reservation_id" ON "passagers"("reservation_id");

-- -------------------------------------------------------------
--  9. PAIEMENTS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "paiements" (
    "id"                    INTEGER PRIMARY KEY AUTOINCREMENT,
    "reservation_id"        INTEGER NOT NULL,
    "methode"               TEXT NOT NULL
                                CHECK("methode" IN ('flooz','tmoney','carte','autre')),
    "reference_transaction" TEXT,
    "montant"               REAL NOT NULL,
    "statut"                TEXT NOT NULL DEFAULT 'en_attente'
                                CHECK("statut" IN ('en_attente','réussi','échoué')),
    "date_paiement"         DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_paiements_reservation"
        FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_paiements_reservation_id" ON "paiements"("reservation_id");
CREATE INDEX IF NOT EXISTS "idx_paiements_statut"         ON "paiements"("statut");
CREATE INDEX IF NOT EXISTS "idx_paiements_methode"        ON "paiements"("methode");

-- -------------------------------------------------------------
-- 10. BILLETS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "billets" (
    "id"              INTEGER PRIMARY KEY AUTOINCREMENT,
    "reservation_id"  INTEGER NOT NULL,
    "code_qr"         TEXT NOT NULL,
    "numero_billet"   TEXT NOT NULL UNIQUE,
    "date_emission"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut"          TEXT NOT NULL DEFAULT 'valide'
                          CHECK("statut" IN ('valide','utilisé','annulé')),
    CONSTRAINT "fk_billets_reservation"
        FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_billets_reservation_id" ON "billets"("reservation_id");
CREATE INDEX IF NOT EXISTS "idx_billets_statut"         ON "billets"("statut");
CREATE INDEX IF NOT EXISTS "idx_billets_numero_billet"  ON "billets"("numero_billet");

-- -------------------------------------------------------------
-- 11. AVIS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "avis" (
    "id"              INTEGER PRIMARY KEY AUTOINCREMENT,
    "utilisateur_id"  INTEGER NOT NULL,
    "compagnie_id"    INTEGER NOT NULL,
    "trajet_id"       INTEGER NOT NULL,
    "note"            INTEGER NOT NULL CHECK("note" BETWEEN 1 AND 5),
    "commentaire"     TEXT,
    "date_avis"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_avis_utilisateur"
        FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_avis_compagnie"
        FOREIGN KEY ("compagnie_id") REFERENCES "compagnies"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_avis_trajet"
        FOREIGN KEY ("trajet_id") REFERENCES "trajets"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_avis_utilisateur_id" ON "avis"("utilisateur_id");
CREATE INDEX IF NOT EXISTS "idx_avis_compagnie_id"   ON "avis"("compagnie_id");
CREATE INDEX IF NOT EXISTS "idx_avis_trajet_id"      ON "avis"("trajet_id");

-- -------------------------------------------------------------
-- Tables rétrocompatibles (depuis l'appli mono-agence)
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "notifications" (
    "id"        INTEGER PRIMARY KEY AUTOINCREMENT,
    "userId"    INTEGER NOT NULL,
    "tripId"    INTEGER,
    "title"     TEXT NOT NULL,
    "message"   TEXT NOT NULL,
    "type"      TEXT NOT NULL,
    "isRead"    INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_notifications_user"
        FOREIGN KEY ("userId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_notifications_trip"
        FOREIGN KEY ("tripId") REFERENCES "trajets"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_notifications_userId" ON "notifications"("userId");
CREATE INDEX IF NOT EXISTS "idx_notifications_tripId" ON "notifications"("tripId");

CREATE TABLE IF NOT EXISTS "fares" (
    "id"            INTEGER PRIMARY KEY AUTOINCREMENT,
    "compagnie_id"  INTEGER,
    "origin"        TEXT NOT NULL,
    "destination"   TEXT NOT NULL,
    "pricePerKg"    REAL NOT NULL,
    "baseFare"      REAL NOT NULL,
    "category"      TEXT NOT NULL,
    "zone"          TEXT NOT NULL,
    CONSTRAINT "fk_fares_compagnie"
        FOREIGN KEY ("compagnie_id") REFERENCES "compagnies"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "systemsettings" (
    "id"            TEXT PRIMARY KEY DEFAULT 'global',
    "companyName"   TEXT NOT NULL DEFAULT 'TogoTransit S.A.',
    "currency"      TEXT NOT NULL DEFAULT 'XOF',
    "smsEnabled"    INTEGER NOT NULL DEFAULT 1,
    "maintenance"   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "parcels" (
    "id"              INTEGER PRIMARY KEY AUTOINCREMENT,
    "compagnie_id"    INTEGER,
    "trackingId"      TEXT NOT NULL UNIQUE,
    "senderId"        INTEGER,
    "driverId"        INTEGER,
    "senderName"      TEXT NOT NULL,
    "senderPhone"     TEXT NOT NULL,
    "receiverName"    TEXT NOT NULL,
    "receiverPhone"   TEXT NOT NULL,
    "weight"          REAL NOT NULL,
    "category"        TEXT NOT NULL,
    "deliveryType"    TEXT NOT NULL,
    "origin"          TEXT NOT NULL,
    "destination"     TEXT NOT NULL,
    "status"          TEXT NOT NULL,
    "price"           REAL NOT NULL,
    "paymentStatus"   TEXT NOT NULL,
    "paymentMethod"   TEXT,
    "statusHistory"   TEXT,
    "createdAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_parcels_compagnie"
        FOREIGN KEY ("compagnie_id") REFERENCES "compagnies"("id") ON DELETE SET NULL,
    CONSTRAINT "fk_parcels_sender"
        FOREIGN KEY ("senderId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL,
    CONSTRAINT "fk_parcels_driver"
        FOREIGN KEY ("driverId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_parcels_senderId"     ON "parcels"("senderId");
CREATE INDEX IF NOT EXISTS "idx_parcels_driverId"     ON "parcels"("driverId");
CREATE INDEX IF NOT EXISTS "idx_parcels_compagnie_id" ON "parcels"("compagnie_id");

CREATE TABLE IF NOT EXISTS "pods" (
    "id"           INTEGER PRIMARY KEY AUTOINCREMENT,
    "parcelId"     INTEGER NOT NULL UNIQUE,
    "signatureUrl" TEXT,
    "photoUrl"     TEXT,
    "latitude"     REAL,
    "longitude"    REAL,
    "deliveredAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_pods_parcel"
        FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE CASCADE
);

-- =============================================================
--  FIN DE MIGRATION
--  La base est initialisée : structure complète, AUCUNE donnée.
-- =============================================================
