/*
  Warnings:

  - The values [ABSENCE] on the enum `TypeVariable` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "TypeAbsence" AS ENUM ('CONGE_PAYE', 'RTT', 'CONGE_SANS_SOLDE', 'CONGE_EXCEPTIONNEL', 'CONGE_NAISSANCE', 'MATERNITE_PATERNITE', 'MALADIE', 'ABSENCE_NON_REMUNEREE');

-- AlterEnum
BEGIN;
CREATE TYPE "TypeVariable_new" AS ENUM ('HEURE_SUPPLEMENTAIRE', 'PRIME', 'NOTE_FRAIS', 'ACOMPTE');
ALTER TABLE "VariablePaie" ALTER COLUMN "type" TYPE "TypeVariable_new" USING ("type"::text::"TypeVariable_new");
ALTER TYPE "TypeVariable" RENAME TO "TypeVariable_old";
ALTER TYPE "TypeVariable_new" RENAME TO "TypeVariable";
DROP TYPE "TypeVariable_old";
COMMIT;

-- CreateTable
CREATE TABLE "Absence" (
    "id" TEXT NOT NULL,
    "type" "TypeAbsence" NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "commentaire" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'En attente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "salarieId" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_salarieId_fkey" FOREIGN KEY ("salarieId") REFERENCES "Salarie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
