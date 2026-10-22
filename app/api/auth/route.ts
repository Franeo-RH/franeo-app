import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {

  const { email, motDePasse } = await request.json();

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { email },
  });

  if (!utilisateur) {
    return NextResponse.json(
      { erreur: "Email ou mot de passe incorrect" },
      { status: 401 }
    );
  }

  const motDePasseValide = await bcrypt.compare(
    motDePasse,
    utilisateur.motDePasse
  );

  if (!motDePasseValide) {
    return NextResponse.json(
      { erreur: "Email ou mot de passe incorrect" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({
    succes: true,
    role: utilisateur.role,
  });

  response.cookies.set("userId", utilisateur.id, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 jours
  });

  return response;
}