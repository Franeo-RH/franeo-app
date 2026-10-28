import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// DELETE (admin) : retirer une communication (elle disparaît des tableaux de bord)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  await prisma.communication.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ succes: true });
}
