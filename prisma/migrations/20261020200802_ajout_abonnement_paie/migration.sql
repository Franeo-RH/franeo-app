-- AlterTable
ALTER TABLE "Entreprise" ADD COLUMN     "abonnementPaieId" TEXT,
ADD COLUMN     "bulletinsUtilises" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AbonnementPaie" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "couleur" TEXT NOT NULL DEFAULT '#6366f1',
    "prixMensuel" DOUBLE PRECISION NOT NULL,
    "bulletinsInclus" INTEGER NOT NULL,
    "prixBulletinSupp" DOUBLE PRECISION NOT NULL,
    "relancesVariables" BOOLEAN NOT NULL DEFAULT false,
    "relancesSalaries" BOOLEAN NOT NULL DEFAULT false,
    "modificationsIncluses" BOOLEAN NOT NULL DEFAULT false,
    "regularisationsInclus" BOOLEAN NOT NULL DEFAULT false,
    "demandesComplexes" BOOLEAN NOT NULL DEFAULT false,
    "veillePaie" BOOLEAN NOT NULL DEFAULT false,
    "conseilPaie" BOOLEAN NOT NULL DEFAULT false,
    "suiviRH" BOOLEAN NOT NULL DEFAULT false,
    "suiviIJSS" BOOLEAN NOT NULL DEFAULT false,
    "relancesIJSS" BOOLEAN NOT NULL DEFAULT false,
    "recouvrementIJSS" BOOLEAN NOT NULL DEFAULT false,
    "tableauBord" TEXT NOT NULL DEFAULT 'none',
    "pointPaie" BOOLEAN NOT NULL DEFAULT false,
    "recommandationsPaie" BOOLEAN NOT NULL DEFAULT false,
    "traitementPrioritaire" BOOLEAN NOT NULL DEFAULT false,
    "assistanceURSSAF" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbonnementPaie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AbonnementPaie_code_key" ON "AbonnementPaie"("code");

-- AddForeignKey
ALTER TABLE "Entreprise" ADD CONSTRAINT "Entreprise_abonnementPaieId_fkey" FOREIGN KEY ("abonnementPaieId") REFERENCES "AbonnementPaie"("id") ON DELETE SET NULL ON UPDATE CASCADE;
