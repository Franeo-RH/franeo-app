// lib/rup.ts
// Registre unique du personnel (art. L1221-13 et D1221-23 du Code du travail) : tous les salariés, dans l'ordre
// des embauches, conservés 5 ans après leur départ.

import { prisma } from "@/lib/prisma";

export const COLONNES_RUP = [
  "N°", "Nom", "Prénom", "Sexe", "Date de naissance", "Nationalité", "Emploi", "Qualification",
  "Type de contrat", "Temps de travail", "Date d'entrée", "Date de sortie", "Titre de travail (échéance)", "Matricule",
];

export type LigneRup = { id: string; sexe: string | null; cellules: string[] };

const fr = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "");
const CINQ_ANS = 5 * 365.25 * 86400000;

export async function registrePersonnel(entrepriseId: string, filtre: object = {}): Promise<LigneRup[]> {
  const salaries = await prisma.salarie.findMany({
    where: { entrepriseId, ...filtre, OR: [{ dateFin: null }, { dateFin: { gte: new Date(Date.now() - CINQ_ANS) } }] },
    select: { id: true, nom: true, prenom: true, sexe: true, dateNaissance: true, nationalite: true, poste: true, categorie: true, coefficient: true, position: true, typeContrat: true, heuresHebdomadaires: true, dateDebut: true, dateFin: true, titreSejour: true, matricule: true, anonymiseLe: true, createdAt: true },
  });
  salaries.sort((a, b) => (a.dateDebut ?? a.createdAt).getTime() - (b.dateDebut ?? b.createdAt).getTime());
  return salaries.map((s, i) => {
    const qualif = [s.categorie, s.coefficient ? `coef. ${s.coefficient}` : null, s.position ? `position ${s.position}` : null].filter(Boolean).join(" · ");
    const h = s.heuresHebdomadaires;
    const etranger = s.nationalite && !/^fran(ç|c)ais/i.test(s.nationalite.trim());
    return {
      id: s.id,
      sexe: s.sexe,
      cellules: [
        String(i + 1), s.nom, s.prenom, s.sexe === "F" ? "F" : s.sexe === "M" ? "M" : "", fr(s.dateNaissance), s.nationalite ?? "", s.poste, qualif,
        s.typeContrat ?? "", h ? (h < 35 ? `Temps partiel (${h} h)` : `Temps plein (${h} h)`) : "", fr(s.dateDebut), fr(s.dateFin),
        s.titreSejour ? fr(s.titreSejour) : etranger ? "À renseigner" : "", s.matricule ?? "",
      ],
    };
  });
}
