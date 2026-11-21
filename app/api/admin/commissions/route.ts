import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { commissionsDuMois } from "@/lib/commissions";
import { journaliser } from "@/lib/journal";

/** POST (admin) { entrepriseId, mois, annee, base, verse: boolean } : note (ou annule) le versement d'une commission */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const mois = parseInt(String(b.mois), 10), annee = parseInt(String(b.annee), 10);
  if (!(mois >= 1 && mois <= 12) || !(annee > 2000)) return NextResponse.json({ erreur: "Mois invalide" }, { status: 400 });
  const entrepriseId = String(b.entrepriseId || "");
  if (!b.verse) {
    await prisma.commissionVersee.deleteMany({ where: { entrepriseId, mois, annee } });
    return NextResponse.json({ succes: true });
  }
  const l = (await commissionsDuMois(mois, annee, b.base === "FACTURE" ? "FACTURE" : "ENCAISSE")).find((x) => x.entrepriseId === entrepriseId);
  if (!l) return NextResponse.json({ erreur: "Aucune commission due pour ce client ce mois-ci." }, { status: 400 });
  await prisma.commissionVersee.upsert({
    where: { entrepriseId_mois_annee: { entrepriseId, mois, annee } },
    create: { entrepriseId, mois, annee, base: l.base, pct: l.pct, montant: l.montant, beneficiaire: l.beneficiaire, par: session.email },
    update: { base: l.base, pct: l.pct, montant: l.montant, beneficiaire: l.beneficiaire, par: session.email, verseLe: new Date() },
  });
  await journaliser(entrepriseId, session.email, "Commission", `Commission de ${String(mois).padStart(2, "0")}/${annee} versée à ${l.beneficiaire} : ${l.montant.toFixed(2)} €`);
  return NextResponse.json({ succes: true });
}
