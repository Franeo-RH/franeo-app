import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionBrute } from "@/lib/session";

// POST : le client ou le salarié valide la lecture d'une communication
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getSessionBrute();
  if (!u || (u.role !== "CLIENT" && u.role !== "SALARIE") || !u.entrepriseId) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const com = await prisma.communication.findUnique({ where: { id } });
  const cibles = u.role === "CLIENT" ? ["CLIENTS", "TOUS"] : ["SALARIES", "TOUS"];
  if (!com || !cibles.includes(com.cible) || (com.entrepriseId && com.entrepriseId !== u.entrepriseId)) {
    return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  }
  await prisma.lectureCommunication.upsert({
    where: { communicationId_utilisateurId: { communicationId: id, utilisateurId: u.id } },
    create: { communicationId: id, utilisateurId: u.id },
    update: {},
  });
  return NextResponse.json({ succes: true });
}
