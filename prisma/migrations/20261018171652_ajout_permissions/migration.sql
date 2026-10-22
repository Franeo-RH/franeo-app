-- AlterTable
ALTER TABLE "Entreprise" ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY['salaries', 'paie', 'tickets', 'absences']::TEXT[];
