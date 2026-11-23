import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";

export const dynamic = "force-dynamic";
const refus = () => NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

/** GET (portail) ?statut=NOUVELLE|TRAITEE|VALIDEE|REFUSEE : demandes de contact et d'inscription reçues par le site */
export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const statut = request.nextUrl.searchParams.get("statut");
  const [l, codes, comptes] = await Promise.all([
    prisma.demandeInscription.findMany({ where: statut ? { statut } : {}, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.codePromo.findMany({ select: { code: true, beneficiaire: true } }).catch(() => [] as { code: string; beneficiaire: string | null }[]),
    prisma.demandeInscription.groupBy({ by: ["statut"], _count: true }).catch(() => [] as { statut: string; _count: number }[]),
  ]);
  const parrains = await prisma.entreprise.findMany({ where: { codeParrainage: { in: l.map((d) => d.codeParrainage).filter((c): c is string => !!c) } }, select: { codeParrainage: true, nom: true } });
  const origine = (code: string | null) => {
    if (!code) return { canal: "SITE", libelle: "Formulaire du site" };
    const p = codes.find((c) => c.code.toUpperCase() === code.toUpperCase());
    if (p) return { canal: "CODE_PROMO", libelle: `Code promo ${p.code}${p.beneficiaire ? ` (${p.beneficiaire})` : ""}` };
    const e = parrains.find((x) => x.codeParrainage?.toUpperCase() === code.toUpperCase());
    return e ? { canal: "PARRAINAGE", libelle: `Parrainé par ${e.nom}` } : { canal: "SITE", libelle: `Code saisi : ${code}` };
  };
  return NextResponse.json({
    compteurs: Object.fromEntries(comptes.map((c) => [c.statut, c._count])),
    contacts: l.map((d) => ({
      id: d.id, type: d.type, statut: d.statut, societe: d.societe, prenom: d.prenom, nom: d.nom, email: d.email, telephone: d.telephone,
      effectif: d.effectif, besoins: d.besoins, message: d.message, code: d.codeParrainage, origine: origine(d.codeParrainage),
      date: d.createdAt, traiteeLe: d.traiteeAt, entrepriseId: d.entrepriseId,
      lien: d.entrepriseId ? `/admin/entreprises/${d.entrepriseId}` : "/admin/entreprises/nouveaux-clients",
    })),
  });
}

/** PUT (portail) { id, statut: TRAITEE | NOUVELLE | REFUSEE } : suivi d'une demande (la validation d'une inscription se fait dans « Nouveaux clients ») */
export async function PUT(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const b = await request.json().catch(() => ({}));
  if (!["TRAITEE", "NOUVELLE", "REFUSEE"].includes(b.statut)) return NextResponse.json({ erreur: "Statut invalide" }, { status: 400 });
  const d = await prisma.demandeInscription.findUnique({ where: { id: String(b.id || "") }, select: { statut: true } });
  if (!d) return NextResponse.json({ erreur: "Demande introuvable" }, { status: 404 });
  if (d.statut === "VALIDEE") return NextResponse.json({ erreur: "Cette inscription est déjà validée." }, { status: 400 });
  await prisma.demandeInscription.update({ where: { id: String(b.id) }, data: { statut: b.statut, traiteeAt: b.statut === "NOUVELLE" ? null : new Date() } });
  return NextResponse.json({ succes: true });
}
