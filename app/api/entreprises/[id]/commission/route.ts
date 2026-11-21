import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { definirCommission, retirerCommission } from "@/lib/commissions";

type Ctx = { params: Promise<{ id: string }> };

/** PUT (admin) { pct, nbMois?, beneficiaire, debut: "AAAA-MM" } : commission à reverser sur le CA de ce client */
export async function PUT(request: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const pct = parseFloat(String(b.pct ?? "").replace(",", "."));
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return NextResponse.json({ erreur: "Pourcentage entre 0 et 100." }, { status: 400 });
  const beneficiaire = typeof b.beneficiaire === "string" ? b.beneficiaire.trim() : "";
  if (!beneficiaire) return NextResponse.json({ erreur: "Indiquez à qui la commission est reversée." }, { status: 400 });
  const nbMois = b.nbMois === "" || b.nbMois == null ? null : parseInt(String(b.nbMois), 10);
  if (nbMois != null && (!Number.isFinite(nbMois) || nbMois < 1 || nbMois > 240)) return NextResponse.json({ erreur: "Durée invalide." }, { status: 400 });
  const m = /^(\d{4})-(\d{2})$/.exec(String(b.debut || ""));
  if (!m) return NextResponse.json({ erreur: "Mois de début invalide." }, { status: 400 });
  try {
    await definirCommission((await params).id, { pct, nbMois, beneficiaire, source: "MANUELLE", debut: { mois: +m[2], annee: +m[1] } }, session.email);
  } catch {
    return NextResponse.json({ erreur: "La base n'est pas à jour : lancez « npx prisma db push »." }, { status: 500 });
  }
  return NextResponse.json({ succes: true });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  await retirerCommission((await params).id, session.email);
  return NextResponse.json({ succes: true });
}
