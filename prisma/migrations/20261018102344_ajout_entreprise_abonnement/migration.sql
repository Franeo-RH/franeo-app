-- AlterTable
ALTER TABLE "Entreprise" ADD COLUMN     "abonnementId" TEXT,
ADD COLUMN     "banque" TEXT,
ADD COLUMN     "bic" TEXT,
ADD COLUMN     "codePostal" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "pays" TEXT,
ADD COLUMN     "rue" TEXT,
ADD COLUMN     "siret" TEXT,
ADD COLUMN     "siteWeb" TEXT,
ADD COLUMN     "telephone" TEXT,
ADD COLUMN     "ticketsUtilises" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ville" TEXT;

-- CreateTable
CREATE TABLE "Abonnement" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prixMensuel" DOUBLE PRECISION NOT NULL,
    "ticketsRH" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeEvolution" (
    "id" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'En attente',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entrepriseId" TEXT NOT NULL,
    "abonnementId" TEXT NOT NULL,

    CONSTRAINT "DemandeEvolution_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Entreprise" ADD CONSTRAINT "Entreprise_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "Abonnement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeEvolution" ADD CONSTRAINT "DemandeEvolution_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
