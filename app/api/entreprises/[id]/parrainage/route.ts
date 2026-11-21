import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { journaliser } from "@/lib/journal";
import { assurerCode } from "@/lib/parrainage";
import { appliquerCode } from "@/lib/codes-promo";

/** POST (admin) { action: "code" | "rattacher" | "detacher", code? } */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const b = await request.json().catch(() => ({}));

  if (b.action === "code") {
    const code = await assurerCode(id).catch(() => null);
    return code ? NextResponse.json({ succes: true, code }) : NextResponse.json({ erreur: "Code impossible à créer (entreprise de démonstration ?)" }, { status: 400 });
  }
  if (b.action === "rattacher") {
    const erreur = await appliquerCode(id, String(b.code || ""), session.email).catch((e) => `Erreur base de données (lancez « npx prisma db push ») : ${String(e?.message || e).slice(0, 120)}`);
    return erreur ? NextResponse.json({ erreur }, { status: 400 }) : NextResponse.json({ succes: true });
  }
  if (b.action === "detacher") {
    const e = await prisma.entreprise.findUnique({ where: { id }, select: { parrainId: true } });
    if (!e?.parrainId) return NextResponse.json({ erreur: "Aucune marraine" }, { status: 400 });
    await prisma.entreprise.update({ where: { id }, data: { parrainId: null } });
    await journaliser(id, session.email, "Parrainage", "Lien de parrainage retiré (les remises déjà créées restent : supprimez-les si besoin)");
    return NextResponse.json({ succes: true });
  }
  return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
}
