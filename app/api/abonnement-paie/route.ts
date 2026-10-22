import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const formules = await prisma.abonnementPaie.findMany({
    orderBy: { prixMensuel: "asc" },
  });

  return NextResponse.json(formules);
}