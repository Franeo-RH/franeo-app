import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";

/** POST { contenu } ou { statut } : la direction répond ou clôt une question d'un salarié */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (!aDroit(session.entreprise?.permissions, "rh.questions")) return NextResponse.json({ erreur: "Action non autorisée pour votre compte." }, { status: 403 });
  const { id } = await params;
  const q = await prisma.questionInterne.findUnique({ where: { id } });
  if (!q || q.entrepriseId !== session.entrepriseId) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const b = await request.json().catch(() => ({}));
  if (b.statut === "CLOSE" || b.statut === "OUVERTE") {
    await prisma.questionInterne.update({ where: { id }, data: { statut: b.statut } });
    return NextResponse.json({ succes: true });
  }
  const contenu = typeof b.contenu === "string" ? b.contenu.trim() : "";
  if (!contenu) return NextResponse.json({ erreur: "Message vide" }, { status: 400 });
  await prisma.questionInterne.update({ where: { id }, data: { statut: "REPONDUE", messages: { create: { auteur: `${session.prenom} (direction)`, contenu: contenu.slice(0, 3000) } } } });
  return NextResponse.json({ succes: true });
}
