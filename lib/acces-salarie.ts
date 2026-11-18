// lib/acces-salarie.ts
// Accès d'un salarié à son espace : création (ou réactivation) du compte, puis e-mail pour choisir son mot de passe.
// Utilisé par la fiche salarié (« Inviter »), par l'ajout d'un salarié (case « Créer un accès ») et à la validation
// d'une demande d'ajout par FRANEO RH.

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { envoyerActivation, motDePasseProvisoire } from "@/lib/invitation";

export type ResultatAcces =
  | { ok: true; email: string; mailEnvoye: boolean; lien: string | null }
  | { ok: false; erreur: string; statut: number };

export async function creerAccesSalarie(salarieId: string, request: NextRequest | null, relance = false): Promise<ResultatAcces> {
  const salarie = await prisma.salarie.findUnique({ where: { id: salarieId }, include: { entreprise: { select: { nom: true, demo: true, permissions: true } }, compte: true } });
  if (!salarie) return { ok: false, erreur: "Salarié introuvable", statut: 404 };
  if (salarie.entreprise.demo) return { ok: false, erreur: "L'espace salarié n'est pas disponible dans la démo.", statut: 403 };
  if (!salarie.entreprise.permissions.includes("espace-salaries")) return { ok: false, erreur: "L'espace salarié n'est pas activé pour cette entreprise.", statut: 403 };
  const email = (salarie.compte?.email || salarie.email || "").trim().toLowerCase();
  if (!email) return { ok: false, erreur: "Renseignez d'abord l'e-mail du salarié dans sa fiche.", statut: 400 };
  if (salarie.dateFin && new Date(salarie.dateFin) < new Date()) return { ok: false, erreur: "Ce salarié a quitté l'entreprise.", statut: 400 };

  if (salarie.compte) {
    await prisma.utilisateur.update({ where: { id: salarie.compte.id }, data: { actif: true } });
  } else {
    const existant = await prisma.utilisateur.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
    if (existant) return { ok: false, erreur: "Cet e-mail est déjà utilisé par un autre compte Franeo.", statut: 409 };
    await prisma.utilisateur.create({
      data: { email, prenom: salarie.prenom, role: "SALARIE", entrepriseId: salarie.entrepriseId, salarieId: salarie.id, motDePasse: await motDePasseProvisoire() },
    });
  }
  const r = await envoyerActivation(request, { email, prenom: salarie.prenom, entreprise: salarie.entreprise.nom, salarie: true, relance });
  return { ok: true, email, ...r };
}
