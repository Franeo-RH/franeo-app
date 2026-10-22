/*
  Warnings:

  - A unique constraint covering the columns `[entrepriseId,matricule]` on the table `Salarie` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Salarie" ADD COLUMN     "matricule" TEXT;

-- CreateTable
CREATE TABLE "RappelSalarie" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "libelle" TEXT,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "commentaire" TEXT,
    "traite" BOOLEAN NOT NULL DEFAULT false,
    "traiteAt" TIMESTAMP(3),
    "salarieId" TEXT NOT NULL,

    CONSTRAINT "RappelSalarie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RappelSalarie_dateEcheance_idx" ON "RappelSalarie"("dateEcheance");

-- CreateIndex
CREATE UNIQUE INDEX "Salarie_entrepriseId_matricule_key" ON "Salarie"("entrepriseId", "matricule");

-- AddForeignKey
ALTER TABLE "RappelSalarie" ADD CONSTRAINT "RappelSalarie_salarieId_fkey" FOREIGN KEY ("salarieId") REFERENCES "Salarie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
