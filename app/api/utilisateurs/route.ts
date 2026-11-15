import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { emailPropre, emailValide, envoyerActivation, motDePasseProvisoire } from "@/lib/invitation";

/** Admin : nouvel accès client. Le client reçoit un e-mail pour choisir son mot de passe. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const corps = await request.json().catch(() => ({}));
  const prenom = typeof corps.prenom === "string" ? corps.prenom.trim().slice(0, 100) : "";
  const email = emailPropre(corps.email);
  const entrepriseId = typeof corps.entrepriseId === "string" ? corps.entrepriseId : "";
  if (!prenom || !emailValide(email) || !entrepriseId) {
    return NextResponse.json({ erreur: "Prénom et e-mail valides obligatoires" }, { status: 400 });
  }

  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { nom: true } });
  if (!entreprise) return NextResponse.json({ erreur: "Entreprise introuvable" }, { status: 404 });

  const emailExistant = await prisma.utilisateur.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
  if (emailExistant) {
    return NextResponse.json({ erreur: "Cet email est déjà utilisé" }, { status: 400 });
  }

  const utilisateur = await prisma.utilisateur.create({
    data: { prenom, email, motDePasse: await motDePasseProvisoire(), role: "CLIENT", entrepriseId },
    select: { id: true, prenom: true, email: true },
  });

  const activation = await envoyerActivation(request, { email, prenom, entreprise: entreprise.nom });
  return NextResponse.json({ succes: true, utilisateur, email, ...activation });
}
