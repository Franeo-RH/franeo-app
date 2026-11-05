import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";
import { contexteHierarchie } from "@/lib/hierarchie";
import { journaliser } from "@/lib/journal";

const TYPES = ["HEURE_SUPPLEMENTAIRE", "PRIME", "NOTE_FRAIS", "ACOMPTE"] as const;

/** POST { salarieId, type, valeur, commentaire?, mois, annee } : saisie d'une variable par un manager autorisé (ou un dirigeant) */
export async function POST(request: NextRequest) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  const ctx = await contexteHierarchie(s.salarie.id);
  if (!ctx || !ctx.peutSaisirVariables || ctx.role === "SALARIE") return NextResponse.json({ erreur: "Vous n'avez pas le droit de saisir des variables." }, { status: 403 });
  if (!s.utilisateur.entreprise?.abonnementPaieId) return NextResponse.json({ erreur: "Pas de formule paie pour votre entreprise." }, { status: 400 });
  const b = await request.json().catch(() => ({}));
  if (!ctx.equipeIds.has(String(b.salarieId))) return NextResponse.json({ erreur: "Ce salarié ne fait pas partie de votre équipe." }, { status: 403 });
  if (!TYPES.includes(b.type)) return NextResponse.json({ erreur: "Type invalide" }, { status: 400 });
  const valeur = parseFloat(String(b.valeur ?? "").replace(",", "."));
  const mois = Number(b.mois), annee = Number(b.annee);
  if (!Number.isFinite(valeur) || valeur <= 0 || !(mois >= 1 && mois <= 12) || !(annee >= 2020)) return NextResponse.json({ erreur: "Valeur ou mois invalide" }, { status: 400 });
  const v = await prisma.variablePaie.create({
    data: { salarieId: b.salarieId, entrepriseId: s.utilisateur.entrepriseId!, type: b.type, valeur, mois, annee, commentaire: typeof b.commentaire === "string" ? b.commentaire.slice(0, 300) : null },
    include: { salarie: { select: { prenom: true, nom: true } } },
  });
  await journaliser(s.utilisateur.entrepriseId, `${s.salarie.prenom} ${s.salarie.nom} (manager)`, "Saisie variable", `${v.salarie.prenom} ${v.salarie.nom} : ${b.type} ${valeur} — ${mois}/${annee}`);
  return NextResponse.json({ succes: true });
}
