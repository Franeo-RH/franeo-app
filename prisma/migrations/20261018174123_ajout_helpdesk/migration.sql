-- CreateEnum
CREATE TYPE "CategorieSupport" AS ENUM ('BUG', 'QUESTION', 'SUGGESTION', 'PROBLEME_TECHNIQUE');

-- AlterTable
ALTER TABLE "Entreprise" ALTER COLUMN "permissions" SET DEFAULT ARRAY['salaries', 'paie', 'tickets', 'absences', 'entreprise', 'helpdesk']::TEXT[];

-- CreateTable
CREATE TABLE "TicketSupport" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categorie" "CategorieSupport" NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Ouvert',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entrepriseId" TEXT NOT NULL,

    CONSTRAINT "TicketSupport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTicketSupport" (
    "id" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "auteur" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticketId" TEXT NOT NULL,

    CONSTRAINT "MessageTicketSupport_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TicketSupport" ADD CONSTRAINT "TicketSupport_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTicketSupport" ADD CONSTRAINT "MessageTicketSupport_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "TicketSupport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
