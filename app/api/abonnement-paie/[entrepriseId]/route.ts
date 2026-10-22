import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ entrepriseId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { entrepriseId } = await params;
  const body = await req.json();
  const abonnementPaieId = body.abonnementPaieId ?? body.formuleId ?? null;

  await prisma.entreprise.update({
    where: { id: entrepriseId },
    data: { abonnementPaieId: abonnementPaieId || null },
  });

  return NextResponse.json({ ok: true });
}