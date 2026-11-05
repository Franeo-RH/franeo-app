import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aAccesPaie, aDroit } from "@/lib/droits";
import { journaliser } from "@/lib/journal";

const TYPES: Record<string, "HEURE_SUPPLEMENTAIRE" | "PRIME" | "NOTE_FRAIS" | "ACOMPTE"> = {
  HEURE_SUPPLEMENTAIRE: "HEURE_SUPPLEMENTAIRE", HS: "HEURE_SUPPLEMENTAIRE", "HEURES SUPP": "HEURE_SUPPLEMENTAIRE", "HEURES SUPPLEMENTAIRES": "HEURE_SUPPLEMENTAIRE", "HEURE SUPPLEMENTAIRE": "HEURE_SUPPLEMENTAIRE",
  PRIME: "PRIME", PRIMES: "PRIME",
  NOTE_FRAIS: "NOTE_FRAIS", FRAIS: "NOTE_FRAIS", "NOTE DE FRAIS": "NOTE_FRAIS", "NOTES DE FRAIS": "NOTE_FRAIS",
  ACOMPTE: "ACOMPTE", ACOMPTES: "ACOMPTE",
};
const norm = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toUpperCase();

/**
 * POST { mois, annee, lignes: [{ matricule?, nom?, prenom?, type, valeur, commentaire? }], valider?: boolean }
 * Sans valider : contrôle seulement (aperçu ligne par ligne). Avec valider=true : création des variables valides.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (!aAccesPaie(session.entreprise) || !aDroit(session.entreprise?.permissions, "paie.import")) return NextResponse.json({ erreur: "Action non autorisée pour votre compte." }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const mois = Number(b.mois), annee = Number(b.annee);
  if (!(mois >= 1 && mois <= 12) || !(annee >= 2020 && annee <= 2100)) return NextResponse.json({ erreur: "Mois invalide" }, { status: 400 });
  const lignes: Record<string, unknown>[] = Array.isArray(b.lignes) ? b.lignes.slice(0, 1000) : [];
  if (lignes.length === 0) return NextResponse.json({ erreur: "Aucune ligne à importer." }, { status: 400 });

  const salaries = await prisma.salarie.findMany({ where: { entrepriseId: session.entrepriseId }, select: { id: true, matricule: true, nom: true, prenom: true } });
  const resultats = lignes.map((l, i) => {
    const mat = norm(l.matricule);
    const s = (mat && salaries.find((x) => norm(x.matricule) === mat))
      || salaries.find((x) => norm(x.nom) === norm(l.nom) && norm(x.prenom) === norm(l.prenom));
    const type = TYPES[norm(l.type).replace(/_/g, " ")] || TYPES[norm(l.type)];
    const valeur = parseFloat(String(l.valeur ?? "").replace(",", ".").replace(/\s/g, ""));
    const erreur = !s ? "Salarié introuvable (matricule ou nom + prénom)" : !type ? "Type inconnu (HS, PRIME, FRAIS, ACOMPTE)" : !Number.isFinite(valeur) || valeur <= 0 ? "Valeur invalide" : null;
    return { ligne: i + 2, salarie: s ? `${s.prenom} ${s.nom}` : String(l.nom ?? "") + " " + String(l.prenom ?? ""), salarieId: s?.id ?? null, type, valeur, commentaire: typeof l.commentaire === "string" ? l.commentaire.slice(0, 300) : l.commentaire != null ? String(l.commentaire).slice(0, 300) : null, erreur };
  });

  if (b.valider !== true) return NextResponse.json({ apercu: resultats });

  const ok = resultats.filter((r) => !r.erreur);
  if (ok.length) {
    await prisma.variablePaie.createMany({
      data: ok.map((r) => ({ salarieId: r.salarieId!, entrepriseId: session.entrepriseId!, type: r.type!, valeur: r.valeur, commentaire: r.commentaire || "Import en masse", mois, annee })),
    });
  }
  await journaliser(session.entrepriseId, session.prenom, "Import en masse", `${ok.length} variable(s) importée(s) pour ${mois}/${annee}${resultats.length - ok.length ? `, ${resultats.length - ok.length} ligne(s) ignorée(s)` : ""}`);
  return NextResponse.json({ succes: true, importees: ok.length, ignorees: resultats.length - ok.length });
}
