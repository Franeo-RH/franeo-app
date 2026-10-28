import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

/**
 * Utilisateur connecté, quel que soit son rôle et même si son entreprise est suspendue.
 * `cache` : une seule requête à la base par affichage de page, même si le layout, la page
 * et les composants appellent la session chacun de leur côté.
 */
export const getSessionBrute = cache(async () => {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;

  if (!userId) return null;

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: userId },
    include: {
      entreprise: {
        include: { abonnement: true },
      },
    },
  });

  return utilisateur;
});

/**
 * Session de l'espace admin / client.
 * - un client dont l'entreprise est suspendue n'a plus aucun accès ;
 * - un compte SALARIÉ n'a jamais accès aux pages et API admin/client (il a son propre espace).
 */
export async function getSession() {
  const utilisateur = await getSessionBrute();
  if (!utilisateur) return null;
  if (utilisateur.role === "SALARIE") return null;
  if (utilisateur.role === "CLIENT" && utilisateur.entreprise && utilisateur.entreprise.actif === false) {
    return null;
  }
  return utilisateur;
}

/** Raisons possibles d'un accès salarié refusé (affichées sur l'espace salarié) */
export type RefusEspaceSalarie = "non-connecte" | "suspendu" | "option-inactive" | "compte-coupe" | "sorti";

/**
 * Session de l'espace salarié : compte SALARIÉ actif, entreprise active avec l'option
 * « Espace salarié », salarié pas encore sorti.
 */
export async function getSessionSalarie(): Promise<
  | { ok: true; utilisateur: NonNullable<Awaited<ReturnType<typeof getSessionBrute>>>; salarie: { id: string; prenom: string; nom: string; poste: string; dateFin: Date | null } }
  | { ok: false; raison: RefusEspaceSalarie }
> {
  const utilisateur = await getSessionBrute();
  if (!utilisateur || utilisateur.role !== "SALARIE" || !utilisateur.salarieId || !utilisateur.entreprise) {
    return { ok: false, raison: "non-connecte" };
  }
  if (utilisateur.entreprise.actif === false) return { ok: false, raison: "suspendu" };
  if (!utilisateur.entreprise.permissions.includes("espace-salaries")) return { ok: false, raison: "option-inactive" };
  if (!utilisateur.actif) return { ok: false, raison: "compte-coupe" };

  const salarie = await prisma.salarie.findUnique({
    where: { id: utilisateur.salarieId },
    select: { id: true, prenom: true, nom: true, poste: true, dateFin: true, entrepriseId: true },
  });
  if (!salarie || salarie.entrepriseId !== utilisateur.entrepriseId) return { ok: false, raison: "compte-coupe" };
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  if (salarie.dateFin && new Date(salarie.dateFin) < aujourdhui) return { ok: false, raison: "sorti" };

  return { ok: true, utilisateur, salarie };
}
