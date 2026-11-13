import { prisma } from "@/lib/prisma";
import { heuresDuJour } from "@/lib/badge";

export type LignePresence = {
  salarie: { id: string; prenom: string; nom: string; poste: string };
  pointages: { type: string; at: Date; dansZone: boolean | null; motif: string | null; etablissement: string | null }[];
  heures: number;
  etat: "ABSENT" | "PRESENT" | "PAUSE" | "PARTI";
  horsZone: number;
  oubli: boolean;
};

/** Tableau des présences d'une journée pour une liste de salariés */
export async function presencesDuJour(salarieIds: string[], jour: string, aujourdhui: string): Promise<LignePresence[]> {
  const [salaries, pointages] = await Promise.all([
    prisma.salarie.findMany({ where: { id: { in: salarieIds } }, select: { id: true, prenom: true, nom: true, poste: true }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
    prisma.pointage.findMany({ where: { salarieId: { in: salarieIds }, jour }, orderBy: { at: "asc" }, select: { salarieId: true, type: true, at: true, dansZone: true, motif: true, etablissement: true } }),
  ]);
  return salaries.map((s) => {
    const p = pointages.filter((x) => x.salarieId === s.id);
    const dernier = p[p.length - 1]?.type;
    const etat = !dernier ? "ABSENT" : dernier === "DEPART" ? "PARTI" : dernier === "PAUSE" ? "PAUSE" : "PRESENT";
    return {
      salarie: s,
      pointages: p.map(({ type, at, dansZone, motif, etablissement }) => ({ type, at, dansZone, motif, etablissement })),
      heures: heuresDuJour(p),
      etat,
      horsZone: p.filter((x) => x.dansZone === false).length,
      // journée passée sans départ = oubli de pointage
      oubli: jour < aujourdhui && !!dernier && dernier !== "DEPART",
    };
  });
}
