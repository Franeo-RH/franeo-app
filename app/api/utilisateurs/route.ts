import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { prenom, email, motDePasse, entrepriseId } = await request.json();

  if (!prenom || !email || !motDePasse || !entrepriseId) {
    return NextResponse.json({ erreur: "Tous les champs sont obligatoires" }, { status: 400 });
  }

  const emailExistant = await prisma.utilisateur.findUnique({ where: { email } });
  if (emailExistant) {
    return NextResponse.json({ erreur: "Cet email est déjà utilisé" }, { status: 400 });
  }

  const utilisateur = await prisma.utilisateur.create({
    data: {
      prenom,
      email,
      motDePasse: await bcrypt.hash(motDePasse, 10),
      role: "CLIENT",
      entrepriseId,
    },
  });

  return NextResponse.json({ succes: true, utilisateur });
}