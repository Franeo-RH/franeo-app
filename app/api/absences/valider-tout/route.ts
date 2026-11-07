import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { journaliser } from "@/lib/journal";

/**
 * POST { entrepriseId? } : valide d'un coup toutes les absences en attente.
 * Client : les demandes de ses salariés (espace salarié). Admin : toutes celles de l'entreprise choisie (ou de tous les clients).
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (session.role === "CLIENT" && !aDroit(session.entreprise?.permissions, "absences.valider")) return NextResponse.json({ erreur: "Action non autorisée pour votre compte." }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const where = session.role === "ADMIN"
    ? { statut: "En attente", ...(b.entrepriseId ? { entrepriseId: String(b.entrepriseId) } : { entreprise: { demo: false } }) }
    : { statut: "En attente", entrepriseId: session.entrepriseId ?? "-", declareeParSalarie: true };
  const r = await prisma.absence.updateMany({ where, data: { statut: "Validé", motifRefus: null } });
  if (session.role === "CLIENT") await journaliser(session.entrepriseId, session.prenom, "Validation groupée", `${r.count} absence(s) validée(s)`);
  return NextResponse.json({ succes: true, validees: r.count });
}
