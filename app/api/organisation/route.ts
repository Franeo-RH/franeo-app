import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";

/** GET (?entrepriseId= pour l'admin) : salariés actifs, établissements et services de l'entreprise (listes, organigramme) */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const entrepriseId = session.role === "ADMIN" ? request.nextUrl.searchParams.get("entrepriseId") || "" : session.entrepriseId || "";
  if (!entrepriseId) return NextResponse.json({ salaries: [], etablissements: [], services: [] });
  const voitSalaires = session.role === "ADMIN" || aDroit(session.entreprise?.permissions, "salaries.salaires");
  const [salaries, etablissements, services] = await Promise.all([
    prisma.salarie.findMany({
      where: { entrepriseId, statut: "Actif" },
      select: { id: true, prenom: true, nom: true, poste: true, service: true, etablissement: true, roleRH: true, managerId: true, salaireMensuel: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
    prisma.etablissement.findMany({ where: { entrepriseId }, orderBy: { createdAt: "asc" } }),
    prisma.service.findMany({ where: { entrepriseId }, orderBy: [{ ordre: "asc" }, { nom: "asc" }] }),
  ]);
  return NextResponse.json({
    salaries: voitSalaires ? salaries : salaries.map((s) => ({ ...s, salaireMensuel: null })),
    etablissements,
    services,
  });
}

/**
 * PUT { salarieId, managerId?, service? } : déplacement dans l'organigramme (glisser-déposer).
 * Le N+1 et le service sont des informations d'organisation : jamais soumises à validation.
 */
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (session.role === "CLIENT" && !aDroit(session.entreprise?.permissions, "rh.services")) return NextResponse.json({ erreur: "Action non autorisée pour votre compte." }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const s = await prisma.salarie.findUnique({ where: { id: String(b.salarieId ?? "") }, select: { id: true, entrepriseId: true } });
  if (!s || (session.role === "CLIENT" && s.entrepriseId !== session.entrepriseId)) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });

  const data: { managerId?: string | null; service?: string | null } = {};
  if (b.managerId !== undefined) {
    const m = b.managerId ? String(b.managerId) : null;
    if (m === s.id) return NextResponse.json({ erreur: "Un salarié ne peut pas être son propre manager." }, { status: 400 });
    if (m) {
      // Pas de boucle : le nouveau manager ne doit pas être sous ce salarié
      const tous = await prisma.salarie.findMany({ where: { entrepriseId: s.entrepriseId }, select: { id: true, managerId: true } });
      let c: string | null = m;
      for (let i = 0; c && i < 100; i++) {
        if (c === s.id) return NextResponse.json({ erreur: "Impossible : ce manager fait déjà partie de l'équipe de ce salarié." }, { status: 400 });
        c = tous.find((t) => t.id === c)?.managerId ?? null;
      }
      if (!tous.some((t) => t.id === m)) return NextResponse.json({ erreur: "Manager introuvable" }, { status: 400 });
    }
    data.managerId = m;
  }
  if (b.service !== undefined) data.service = b.service ? String(b.service).slice(0, 80) : null;
  await prisma.salarie.update({ where: { id: s.id }, data });
  return NextResponse.json({ succes: true });
}
