-- CreateTable
CREATE TABLE "DemandeEvolutionPaie" (
    "id" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "ancienneFormuleId" TEXT,
    "nouvelleFormuleId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traiteeAt" TIMESTAMP(3),

    CONSTRAINT "DemandeEvolutionPaie_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DemandeEvolutionPaie" ADD CONSTRAINT "DemandeEvolutionPaie_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeEvolutionPaie" ADD CONSTRAINT "DemandeEvolutionPaie_ancienneFormuleId_fkey" FOREIGN KEY ("ancienneFormuleId") REFERENCES "AbonnementPaie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeEvolutionPaie" ADD CONSTRAINT "DemandeEvolutionPaie_nouvelleFormuleId_fkey" FOREIGN KEY ("nouvelleFormuleId") REFERENCES "AbonnementPaie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
