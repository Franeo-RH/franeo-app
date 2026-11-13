import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aDroit, type ActionId } from "@/lib/droits";

/** Accès client à l'option Projets : renvoie l'entreprise et ce que l'utilisateur peut voir / faire */
export async function accesProjets(droit: ActionId = "projets.voir") {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) {
    return { ok: false as const, refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  }
  const perms = session.entreprise?.permissions;
  if (!aDroit(perms, "projets.voir") || !aDroit(perms, droit)) {
    return { ok: false as const, refus: NextResponse.json({ erreur: "L'option Projets n'est pas activée pour votre compte. Contactez FRANEO RH." }, { status: 403 }) };
  }
  return {
    ok: true as const,
    session,
    entrepriseId: session.entrepriseId,
    voitCouts: aDroit(perms, "projets.couts"),
    peutGerer: aDroit(perms, "projets.gerer"),
  };
}

const n = (v: unknown) => (v === "" || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const d = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? new Date(v.slice(0, 10) + "T00:00:00Z") : null);
const t = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Lecture des champs d'un projet envoyés par le formulaire */
export function lireProjet(b: Record<string, unknown>) {
  const erreurs: string[] = [];
  const nom = t(b.nom, 120);
  if (!nom) erreurs.push("Le nom du projet est obligatoire.");
  const dateDebut = d(b.dateDebut);
  if (!dateDebut) erreurs.push("La date de début est obligatoire.");
  const dateFin = d(b.dateFin);
  if (dateDebut && dateFin && dateFin < dateDebut) erreurs.push("La date de fin est avant la date de début.");
  const modeVente = ["FORFAIT", "REGIE", "INTERNE"].includes(String(b.modeVente)) ? String(b.modeVente) : "FORFAIT";
  const statut = ["PREVU", "EN_COURS", "TERMINE", "ANNULE"].includes(String(b.statut)) ? String(b.statut) : "PREVU";
  const seuil = n(b.seuilAlerte);
  return {
    erreurs,
    data: {
      nom: nom ?? "", code: t(b.code, 30), client: t(b.client, 120), description: t(b.description, 2000),
      couleur: typeof b.couleur === "string" && /^#[0-9a-f]{6}$/i.test(b.couleur) ? b.couleur : "#ea580c",
      statut, dateDebut: dateDebut ?? new Date(), dateFin, modeVente,
      prixVente: n(b.prixVente), tauxJournalier: n(b.tauxJournalier), joursVendus: n(b.joursVendus),
      budgetHeures: n(b.budgetHeures), seuilAlerte: seuil && seuil > 0 && seuil <= 100 ? Math.round(seuil) : 80,
      responsableId: t(b.responsableId, 40),
    },
  };
}

export const lire = { n, d, t };
