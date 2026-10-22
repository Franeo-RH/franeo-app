import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const { token, motDePasse } = await request.json();

  if (!token || !motDePasse) {
    return NextResponse.json({ erreur: "Token et mot de passe requis" }, { status: 400 });
  }

  const tokenReset = await prisma.tokenReset.findUnique({ where: { token } });

  if (!tokenReset) {
    return NextResponse.json({ erreur: "Lien invalide" }, { status: 400 });
  }

  if (tokenReset.expiresAt < new Date()) {
    await prisma.tokenReset.delete({ where: { token } });
    return NextResponse.json({ erreur: "Lien expiré, faites une nouvelle demande" }, { status: 400 });
  }

  await prisma.utilisateur.update({
    where: { email: tokenReset.email },
    data: { motDePasse: await bcrypt.hash(motDePasse, 10) },
  });

  await prisma.tokenReset.delete({ where: { token } });

  return NextResponse.json({ succes: true });
}