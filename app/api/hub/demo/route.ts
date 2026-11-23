import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";
import { EMAIL_DEMO, EMAIL_DEMO_CABINET, EMAIL_DEMO_MANAGER, EMAIL_DEMO_SALARIE, reinitialiserDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const refus = () => NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

/** GET (portail) : état de la démo (entreprise, salariés, comptes, remise à zéro) */
export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const [e, reglage] = await Promise.all([
    prisma.entreprise.findFirst({ where: { demo: true }, orderBy: { createdAt: "asc" }, select: { id: true, nom: true, permissions: true, abonnement: { select: { nom: true } }, abonnementPaie: { select: { nom: true } }, _count: { select: { salaries: true, utilisateurs: true } } } }),
    prisma.reglageApp.findUnique({ where: { id: "global" } }).catch(() => null),
  ]);
  return NextResponse.json({
    entreprise: e ? { id: e.id, nom: e.nom, offre: [e.abonnementPaie?.nom && `Paie ${e.abonnementPaie.nom}`, e.abonnement?.nom && `RH ${e.abonnement.nom}`].filter(Boolean).join(" · ") || "Sans formule", options: e.permissions.filter((p) => ["option-documents", "option-medical", "projets"].includes(p)), salaries: e._count.salaries, comptes: e._count.utilisateurs } : null,
    profils: [
      { profil: "Dirigeant", email: EMAIL_DEMO }, { profil: "Salarié", email: EMAIL_DEMO_SALARIE },
      { profil: "Manager", email: EMAIL_DEMO_MANAGER }, { profil: "Cabinet", email: EMAIL_DEMO_CABINET },
    ],
    resetAuto: reglage?.demoResetAuto !== false,
    dernierReset: reglage?.demoDernierReset ?? null,
    liens: e ? { fiche: `/admin/entreprises/${e.id}`, modifier: `/admin/entreprises/${e.id}/modifier`, salaries: `/admin/entreprises/${e.id}?onglet=salaries`, permissions: `/admin/entreprises/${e.id}/permissions`, acces: `/admin/entreprises/${e.id}/acces` } : null,
    lienPublic: "/login",
  });
}

/** POST (portail) { action: "reinitialiser" } ou { action: "auto", valeur: boolean } */
export async function POST(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const b = await request.json().catch(() => ({}));
  if (b.action === "reinitialiser") {
    try {
      await reinitialiserDemo();
    } catch (e) {
      console.error("Réinitialisation démo (portail)", e);
      return NextResponse.json({ erreur: "La réinitialisation a échoué. Réessayez dans un instant." }, { status: 500 });
    }
    await prisma.reglageApp.upsert({ where: { id: "global" }, create: { id: "global", demoDernierReset: new Date() }, update: { demoDernierReset: new Date() } });
    return NextResponse.json({ succes: true });
  }
  if (b.action === "auto" && typeof b.valeur === "boolean") {
    await prisma.reglageApp.upsert({ where: { id: "global" }, create: { id: "global", demoResetAuto: b.valeur }, update: { demoResetAuto: b.valeur } });
    return NextResponse.json({ succes: true });
  }
  return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
}
