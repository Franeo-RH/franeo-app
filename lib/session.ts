import { cookies } from "next/headers";
import { prisma } from "./prisma";

/** Utilisateur connecté, même si son entreprise est suspendue (sert à afficher l'écran « compte suspendu ») */
export async function getSessionBrute() {
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
}

/** Session normale : un client dont l'entreprise est suspendue n'a plus aucun accès (pages et API) */
export async function getSession() {
  const utilisateur = await getSessionBrute();
  if (utilisateur && utilisateur.role === "CLIENT" && utilisateur.entreprise && utilisateur.entreprise.actif === false) {
    return null;
  }
  return utilisateur;
}
