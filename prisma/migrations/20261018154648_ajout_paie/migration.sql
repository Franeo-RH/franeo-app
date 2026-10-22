-- CreateEnum
CREATE TYPE "TypeVariable" AS ENUM ('HEURE_SUPPLEMENTAIRE', 'PRIME', 'ABSENCE', 'NOTE_FRAIS', 'ACOMPTE');

-- CreateTable
CREATE TABLE "VariablePaie" (
    "id" TEXT NOT NULL,
    "type" "TypeVariable" NOT NULL,
    "valeur" DOUBLE PRECISION NOT NULL,
    "commentaire" TEXT,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'En attente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salarieId" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,

    CONSTRAINT "VariablePaie_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VariablePaie" ADD CONSTRAINT "VariablePaie_salarieId_fkey" FOREIGN KEY ("salarieId") REFERENCES "Salarie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariablePaie" ADD CONSTRAINT "VariablePaie_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
