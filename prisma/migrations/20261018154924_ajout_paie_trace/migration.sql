/*
  Warnings:

  - Added the required column `updatedAt` to the `VariablePaie` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VariablePaie" ADD COLUMN     "dateReset" TIMESTAMP(3),
ADD COLUMN     "dateValidation" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
