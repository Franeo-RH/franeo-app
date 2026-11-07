import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { lireFichier } from "@/lib/fichiers";

/** POST (formulaire, champ « fichier ») : ajoute une pièce jointe à une demande RH ponctuelle (client ou admin) */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const q = await prisma.questionRH.findUnique({ where: { id }, select: { id: true, entrepriseId: true, statut: true } });
  if (!q || (session.role === "CLIENT" && q.entrepriseId !== session.entrepriseId)) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const n = await prisma.pieceJointe.count({ where: { questionId: id } });
  if (n >= 10) return NextResponse.json({ erreur: "10 pièces jointes maximum par demande." }, { status: 400 });
  const form = await request.formData().catch(() => null);
  const lu = await lireFichier(form?.get("fichier") ?? null);
  if ("erreur" in lu) return NextResponse.json({ erreur: lu.erreur }, { status: 400 });
  const pj = await prisma.pieceJointe.create({
    data: {
      entrepriseId: q.entrepriseId, questionId: id, nom: lu.fichier.nom, mime: lu.fichier.mime, taille: lu.fichier.taille, contenu: lu.fichier.contenu,
      auteur: session.role === "ADMIN" ? "FRANEO RH" : session.prenom, role: session.role,
    },
    select: { id: true },
  });
  await prisma.questionRH.update({ where: { id }, data: { updatedAt: new Date() } });
  return NextResponse.json({ succes: true, id: pj.id });
}
