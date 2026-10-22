-- CreateTable
CREATE TABLE "DemandeRecrutement" (
    "id" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Reçue',
    "poste" TEXT NOT NULL,
    "typeContrat" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3),
    "salaireMini" DOUBLE PRECISION,
    "salaireMaxi" DOUBLE PRECISION,
    "primes" TEXT,
    "missions" TEXT NOT NULL,
    "profil" TEXT NOT NULL,
    "experience" TEXT,
    "formation" TEXT,
    "commentaire" TEXT,
    "cgvAcceptees" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entrepriseId" TEXT NOT NULL,

    CONSTRAINT "DemandeRecrutement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DemandeRecrutement" ADD CONSTRAINT "DemandeRecrutement_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
