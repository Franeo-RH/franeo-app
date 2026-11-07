import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aAccesContrats } from "@/lib/droits";
import { notifierAdmin } from "@/lib/notifications";

/** GET : contrats générés (client : les siens ; admin : tous) */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const l = await prisma.demandeContrat.findMany({
    where: session.role === "ADMIN" ? { entreprise: { demo: false } } : { entrepriseId: session.entrepriseId ?? "-" },
    include: { entreprise: { select: { nom: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return NextResponse.json(l);
}

/** POST (client) { salarieId?, trameNom, typeContrat, intitule, donnees, verification? } : trace d'un contrat généré */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (!aAccesContrats(session.entreprise)) return NextResponse.json({ erreur: "Les contrats automatiques sont inclus à partir de la formule RH Sérénité." }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const donnees: Record<string, string> = {};
  if (b.donnees && typeof b.donnees === "object") for (const [k, v] of Object.entries(b.donnees as Record<string, unknown>).slice(0, 200)) donnees[k.slice(0, 60)] = String(v ?? "").slice(0, 1000);
  const c = await prisma.demandeContrat.create({
    data: {
      entrepriseId: session.entrepriseId,
      salarieId: typeof b.salarieId === "string" && b.salarieId ? b.salarieId : null,
      trameNom: typeof b.trameNom === "string" ? b.trameNom.slice(0, 120) : null,
      typeContrat: String(b.typeContrat || "Contrat").slice(0, 40),
      intitule: String(b.intitule || "Contrat").slice(0, 160),
      donnees, auteur: session.prenom, verification: b.verification === true,
    },
  });
  if (c.verification) {
    await notifierAdmin({
      sujet: `Contrat à vérifier — ${session.entreprise?.nom ?? ""}`,
      titre: "📝 Contrat généré : vérification demandée",
      lignes: [`${session.entreprise?.nom ?? ""} (${session.prenom}) : ${c.intitule}`],
      lien: "/admin/salaries/contrats",
      entrepriseId: session.entrepriseId,
    });
  }
  return NextResponse.json({ succes: true, id: c.id });
}
