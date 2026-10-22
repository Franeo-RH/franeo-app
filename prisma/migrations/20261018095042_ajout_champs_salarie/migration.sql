/*
  Warnings:

  - Added the required column `updatedAt` to the `Salarie` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Salarie" ADD COLUMN     "avantages" TEXT,
ADD COLUMN     "categorie" TEXT,
ADD COLUMN     "codePostal" TEXT,
ADD COLUMN     "coefficient" TEXT,
ADD COLUMN     "conventionCollective" TEXT,
ADD COLUMN     "dateDebut" TIMESTAMP(3),
ADD COLUMN     "dateFin" TIMESTAMP(3),
ADD COLUMN     "dateNaissance" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "heuresHebdomadaires" DOUBLE PRECISION,
ADD COLUMN     "lieuNaissance" TEXT,
ADD COLUMN     "manager" TEXT,
ADD COLUMN     "nationalite" TEXT,
ADD COLUMN     "numeroSecuriteSociale" TEXT,
ADD COLUMN     "pays" TEXT,
ADD COLUMN     "primes" DOUBLE PRECISION,
ADD COLUMN     "rue" TEXT,
ADD COLUMN     "salaireAnnuel" DOUBLE PRECISION,
ADD COLUMN     "salaireMensuel" DOUBLE PRECISION,
ADD COLUMN     "statut" TEXT NOT NULL DEFAULT 'Actif',
ADD COLUMN     "telephone" TEXT,
ADD COLUMN     "typeContrat" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "ville" TEXT;

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "dateAjout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salarieId" TEXT NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_salarieId_fkey" FOREIGN KEY ("salarieId") REFERENCES "Salarie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
