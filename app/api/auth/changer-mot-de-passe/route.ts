import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { estSessionDemo } from "@/lib/demo";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  if (estSessionDemo(session)) {
    return NextResponse.json({ erreur: "Le mot de passe ne peut pas être modifié dans la démo." }, { status: 403 });
  }

  const { motDePasseActuel, nouveauMotDePasse } = await request.json();

  if (!motDePasseActuel || !nouveauMotDePasse) {
    return NextResponse.json({ erreur: "Tous les champs sont requis" }, { status: 400 });
  }

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: session.id },
  });

  if (!utilisateur) {
    return NextResponse.json({ erreur: "Utilisateur introuvable" }, { status: 404 });
  }

  const motDePasseValide = await bcrypt.compare(motDePasseActuel, utilisateur.motDePasse);

  if (!motDePasseValide) {
    return NextResponse.json({ erreur: "Mot de passe actuel incorrect" }, { status: 400 });
  }

  await prisma.utilisateur.update({
    where: { id: session.id },
    data: { motDePasse: await bcrypt.hash(nouveauMotDePasse, 10) },
  });

  return NextResponse.json({ succes: true });
}