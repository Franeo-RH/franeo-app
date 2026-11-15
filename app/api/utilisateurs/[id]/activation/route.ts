// app/api/utilisateurs/[id]/activation/route.ts
// Admin : renvoie au client l'e-mail lui permettant de choisir (ou de changer) son mot de passe.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { envoyerActivation } from "@/lib/invitation";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const u = await prisma.utilisateur.findUnique({ where: { id }, select: { email: true, prenom: true, entreprise: { select: { nom: true, demo: true } } } });
  if (!u) return NextResponse.json({ erreur: "Accès introuvable" }, { status: 404 });
  if (u.entreprise?.demo) return NextResponse.json({ erreur: "Non disponible pour la démo." }, { status: 403 });
  const activation = await envoyerActivation(request, { email: u.email, prenom: u.prenom, entreprise: u.entreprise?.nom, relance: true });
  return NextResponse.json({ succes: true, email: u.email, ...activation });
}
