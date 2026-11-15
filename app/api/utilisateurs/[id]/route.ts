import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { emailPropre, emailValide } from "@/lib/invitation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const data = await request.json();

  // Le mot de passe n'est jamais choisi par l'admin : bouton « Renvoyer le lien d'activation »
  const updateData: { prenom?: string; email?: string } = {};

  if (typeof data.prenom === "string" && data.prenom.trim()) updateData.prenom = data.prenom.trim().slice(0, 100);
  if (data.email) {
    const email = emailPropre(data.email);
    if (!emailValide(email)) return NextResponse.json({ erreur: "E-mail invalide" }, { status: 400 });
    const pris = await prisma.utilisateur.findFirst({ where: { email: { equals: email, mode: "insensitive" }, NOT: { id } }, select: { id: true } });
    if (pris) return NextResponse.json({ erreur: "Cet email est déjà utilisé" }, { status: 400 });
    updateData.email = email;
  }

  const utilisateur = await prisma.utilisateur.update({
    where: { id },
    data: updateData,
    select: { id: true, prenom: true, email: true },
  });

  return NextResponse.json({ succes: true, utilisateur });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.utilisateur.delete({ where: { id } });

  return NextResponse.json({ succes: true });
}