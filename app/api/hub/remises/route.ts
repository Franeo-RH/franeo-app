import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";
import { appelInterne } from "@/lib/hub-interne";
import { commissionsDuMois } from "@/lib/commissions";

export const dynamic = "force-dynamic";
const refus = () => NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

/**
 * GET (portail) ?vue=factures|codes|parrainages|commissions[&mois=2027-01&base=ENCAISSE|FACTURE&statut=impayes|toutes]
 * Factures et impayés, codes promo, parrainages et commissions de Franeo RH.
 */
export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const p = request.nextUrl.searchParams;
  const vue = p.get("vue") ?? "factures";
  const m = /^(\d{4})-(\d{2})$/.exec(p.get("mois") || "");
  const now = new Date();
  const annee = m ? +m[1] : now.getFullYear(), mois = m ? +m[2] : now.getMonth() + 1;

  if (vue === "factures") {
    const impayes = p.get("statut") !== "toutes";
    const f = await prisma.facturation.findMany({
      where: { entreprise: { demo: false }, ...(impayes ? { statut: { not: "Payé" } } : { mois, annee }) },
      include: { entreprise: { select: { id: true, nom: true, email: true } } }, orderBy: [{ annee: "desc" }, { mois: "desc" }], take: 500,
    });
    return NextResponse.json({ factures: f.map((x) => ({ id: x.id, client: x.entreprise, mois: x.mois, annee: x.annee, montant: x.montant, statut: x.statut, echeance: x.dateLimitePaie, relances: x.relances, derniereRelance: x.derniereRelance, enRetard: x.statut !== "Payé" && !!x.dateLimitePaie && x.dateLimitePaie < now })) });
  }
  if (vue === "codes") {
    const codes = await prisma.codePromo.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ codes });
  }
  if (vue === "parrainages") {
    const filleuls = await prisma.entreprise.findMany({ where: { demo: false, parrainId: { not: null } }, select: { id: true, nom: true, createdAt: true, parrainId: true, actif: true, commissionPct: true, commissionBeneficiaire: true } });
    const parrains = await prisma.entreprise.findMany({ where: { id: { in: filleuls.map((f) => f.parrainId!) } }, select: { id: true, nom: true, codeParrainage: true } });
    return NextResponse.json({ parrainages: filleuls.map((f) => ({ filleul: { id: f.id, nom: f.nom, actif: f.actif }, parrain: parrains.find((x) => x.id === f.parrainId) ?? null, depuis: f.createdAt, commission: f.commissionPct ? `${f.commissionPct} % → ${f.commissionBeneficiaire ?? "parrain"}` : null })) });
  }
  if (vue === "commissions") {
    const base = p.get("base") === "FACTURE" ? "FACTURE" : "ENCAISSE";
    return NextResponse.json({ mois: `${annee}-${String(mois).padStart(2, "0")}`, base, commissions: await commissionsDuMois(mois, annee, base) });
  }
  return NextResponse.json({ erreur: "Vue inconnue" }, { status: 400 });
}

/** POST (portail) { action, email, … } : code.creer · code.actif { id, actif } · code.supprimer { id } · commission.verse { entrepriseId, mois, base, verse } */
export async function POST(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const b = await request.json().catch(() => ({}));
  const email = typeof b.email === "string" ? b.email : null;
  const sur = (v: unknown) => (/^[\w-]{1,60}$/.test(String(v ?? "")) ? String(v) : "");
  const rep = async (r: Response) => { const d = await r.json().catch(() => ({})); return NextResponse.json(r.ok ? { succes: true } : { erreur: d?.erreur ?? `Refusé (${r.status})` }, { status: r.ok ? 200 : r.status }); };
  switch (b.action) {
    case "code.creer": return rep(await appelInterne(request, email, "/api/admin/codes-promo", { methode: "POST", corps: { code: b.code, type: b.type, valeur: b.valeur, portee: b.portee, nbMois: b.nbMois, finValidite: b.finValidite, maxUtilisations: b.maxUtilisations, note: b.note, commissionPct: b.commissionPct, commissionMois: b.commissionMois, beneficiaire: b.beneficiaire } }));
    case "code.actif": return rep(await appelInterne(request, email, `/api/admin/codes-promo/${sur(b.id)}`, { methode: "PATCH", corps: { actif: !!b.actif } }));
    case "code.supprimer": return rep(await appelInterne(request, email, `/api/admin/codes-promo/${sur(b.id)}`, { methode: "DELETE" }));
    case "commission.verse": {
      const m = /^(\d{4})-(\d{2})$/.exec(String(b.mois || ""));
      if (!m) return NextResponse.json({ erreur: "Mois invalide" }, { status: 400 });
      return rep(await appelInterne(request, email, "/api/admin/commissions", { methode: "POST", corps: { entrepriseId: sur(b.entrepriseId), mois: +m[2], annee: +m[1], base: b.base === "FACTURE" ? "FACTURE" : "ENCAISSE", verse: !!b.verse } }));
    }
  }
  return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
}
