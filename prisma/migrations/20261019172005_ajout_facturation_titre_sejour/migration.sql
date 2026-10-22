-- AlterTable
ALTER TABLE "Salarie" ADD COLUMN     "titreSejour" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Facturation" (
    "id" TEXT NOT NULL,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "dateLimitePaie" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'En attente',
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entrepriseId" TEXT NOT NULL,

    CONSTRAINT "Facturation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Facturation" ADD CONSTRAINT "Facturation_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
