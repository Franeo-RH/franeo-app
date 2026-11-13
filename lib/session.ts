import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { empreinte, lireJeton, NOM_COOKIE } from "./jeton-session";

/**
 * Utilisateur connecté, quel que soit son rôle et même si son entreprise est suspendue.
 * `cache` : une seule requête à la base par affichage de page, même si le layout, la page
 * et les composants appellent la session chacun de leur côté.
 */
// Mémoire courte des sessions (15 s) : évite de relire l'utilisateur et son entreprise en base
// à chaque appel d'API d'une même page. Les changements de droits s'appliquent au plus tard 15 s après.
type UtilisateurSession = NonNullable<Awaited<ReturnType<typeof lireUtilisateur>>>;
const MEMOIRE_MS = 15_000;
const memoireSessions = new Map<string, { expire: number; u: UtilisateurSession }>();

function lireUtilisateur(id: string) {
  return prisma.utilisateur.findUnique({
    where: { id },
    include: {
      entreprise: {
        include: { abonnement: true },
      },
    },
  });
}

/** À appeler après un changement de droits, de mot de passe ou de statut (vide la mémoire de cette instance) */
export function oublierSessions(userId?: string) {
  if (userId) memoireSessions.delete(userId);
  else memoireSessions.clear();
}

export const getSessionBrute = cache(async () => {
  const cookieStore = await cookies();
  // Cookie signé : un cookie modifié ou expiré est refusé
  const jeton = lireJeton(cookieStore.get(NOM_COOKIE)?.value);
  if (!jeton) return null;

  const m = memoireSessions.get(jeton.userId);
  // Mémoire ignorée si le mot de passe ne correspond plus (changé depuis) : on relit la base
  let utilisateur: UtilisateurSession | null = m && m.expire > Date.now() && empreinte(m.u.motDePasse) === jeton.empreinte ? m.u : null;
  if (!utilisateur) {
    utilisateur = await lireUtilisateur(jeton.userId);
    if (utilisateur) {
      if (memoireSessions.size > 500) memoireSessions.clear();
      memoireSessions.set(jeton.userId, { expire: Date.now() + MEMOIRE_MS, u: utilisateur });
    } else memoireSessions.delete(jeton.userId);
  }

  // Mot de passe changé depuis l'ouverture de la session : la session n'est plus valable
  if (!utilisateur || empreinte(utilisateur.motDePasse) !== jeton.empreinte) return null;

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
