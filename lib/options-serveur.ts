// lib/options-serveur.ts
// État des options (Projets, Documents & contrats) pour la page Abonnement et les pages verrouillées.

import { prisma } from "@/lib/prisma";
import { aAccesDocuments, aAccesMedical, documentsInclus, medicalInclus, projetsInclus } from "@/lib/droits";
import type { EtatOption } from "@/components/OptionPayante";

type Session = { entrepriseId?: string | null; entreprise?: { permissions?: string[] | null; abonnement?: { nom: string } | null; abonnementPaie?: { nom: string } | null } | null };

async function demandeEnCours(entrepriseId: string, type: string) {
  return !!(await prisma.demandeService.findFirst({ where: { entrepriseId, type, statut: { in: ["EN_ATTENTE", "EN_COURS"] } }, select: { id: true } }));
}

export async function etatOptions(session: Session) {
  const perms = session.entreprise?.permissions || [];
  const id = session.entrepriseId ?? "-";
  const [dP, dD, dM] = await Promise.all([demandeEnCours(id, "OPTION_PROJETS"), demandeEnCours(id, "OPTION_DOCUMENTS"), demandeEnCours(id, "OPTION_MEDICAL")]);
  const projets: EtatOption = perms.includes("projets") ? "active" : dP ? "demandee" : "disponible";
  const documents: EtatOption = aAccesDocuments(session.entreprise) ? "active" : dD ? "demandee" : "disponible";
  const medical: EtatOption = aAccesMedical(session.entreprise) ? "active" : dM ? "demandee" : "disponible";
  return {
    projets, documents, medical,
    medicalInclus: medicalInclus(session.entreprise),
    projetsInclus: projetsInclus(session.entreprise),
    documentsInclus: documentsInclus(session.entreprise),
  };
}
