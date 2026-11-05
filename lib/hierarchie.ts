import { prisma } from "@/lib/prisma";

export const ROLES_RH: Record<string, { label: string; icone: string }> = {
  SALARIE: { label: "Salarié", icone: "👤" },
  MANAGER: { label: "Manager", icone: "🧑‍💼" },
  DIRIGEANT: { label: "Dirigeant", icone: "👑" },
};

export type MembreEquipe = {
  id: string; prenom: string; nom: string; poste: string; service: string | null;
  roleRH: string; managerId: string | null; salaireMensuel: number | null;
};

/**
 * Contexte hiérarchique d'un salarié connecté à son espace :
 * - DIRIGEANT : voit et valide toute l'entreprise ;
 * - MANAGER : voit et valide les salariés placés sous lui (directement ou par ses managers) ;
 * - SALARIE : ne voit que lui-même.
 */
export async function contexteHierarchie(salarieId: string) {
  const moi = await prisma.salarie.findUnique({
    where: { id: salarieId },
    select: { id: true, entrepriseId: true, prenom: true, nom: true, roleRH: true, managerId: true, voitSalairesEquipe: true, saisieVariables: true },
  });
  if (!moi) return null;
  const tous = await prisma.salarie.findMany({
    where: { entrepriseId: moi.entrepriseId, statut: "Actif" },
    select: { id: true, prenom: true, nom: true, poste: true, service: true, roleRH: true, managerId: true, salaireMensuel: true },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  let equipe: MembreEquipe[] = [];
  if (moi.roleRH === "DIRIGEANT") {
    equipe = tous.filter((s) => s.id !== moi.id);
  } else if (moi.roleRH === "MANAGER") {
    const ids = new Set<string>();
    let frontiere = [moi.id];
    while (frontiere.length) {
      const suivants = tous.filter((s) => s.managerId && frontiere.includes(s.managerId) && !ids.has(s.id) && s.id !== moi.id);
      suivants.forEach((s) => ids.add(s.id));
      frontiere = suivants.map((s) => s.id);
    }
    equipe = tous.filter((s) => ids.has(s.id));
  }
  const voitSalaires = moi.roleRH === "DIRIGEANT" || moi.voitSalairesEquipe;
  if (!voitSalaires) equipe = equipe.map((s) => ({ ...s, salaireMensuel: null }));

  const n1 = moi.managerId ? tous.find((s) => s.id === moi.managerId) ?? null : null;
  const direction = tous.filter((s) => s.roleRH === "DIRIGEANT" && s.id !== moi.id);

  return {
    moi,
    role: moi.roleRH as "SALARIE" | "MANAGER" | "DIRIGEANT",
    equipe,
    equipeIds: new Set(equipe.map((s) => s.id)),
    n1: n1 ? { id: n1.id, prenom: n1.prenom, nom: n1.nom, poste: n1.poste } : null,
    direction: direction.map((d) => ({ id: d.id, prenom: d.prenom, nom: d.nom, poste: d.poste })),
    voitSalaires,
    peutSaisirVariables: moi.roleRH === "DIRIGEANT" || moi.saisieVariables,
  };
}

/** Destinataire d'une question : le N+1, sinon le premier dirigeant (null = la direction via l'espace client) */
export async function destinataireN1(salarieId: string): Promise<string | null> {
  const s = await prisma.salarie.findUnique({ where: { id: salarieId }, select: { managerId: true, entrepriseId: true } });
  if (!s) return null;
  if (s.managerId) return s.managerId;
  const dir = await prisma.salarie.findFirst({ where: { entrepriseId: s.entrepriseId, roleRH: "DIRIGEANT", statut: "Actif", NOT: { id: salarieId } }, select: { id: true } });
  return dir?.id ?? null;
}
