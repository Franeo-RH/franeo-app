import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const entreprises = await prisma.entreprise.findMany({
    where: { demo: false },
    orderBy: { nom: "asc" },
  });

  return NextResponse.json(entreprises);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const data = await request.json();

  if (!data.nom) {
    return NextResponse.json({ erreur: "Le nom est obligatoire" }, { status: 400 });
  }

  if (!data.emailClient || !data.motDePasseClient) {
    return NextResponse.json({ erreur: "Email et mot de passe client obligatoires" }, { status: 400 });
  }

  // Vérifier si l'email client existe déjà
  const emailExistant = await prisma.utilisateur.findUnique({
    where: { email: data.emailClient },
  });

  if (emailExistant) {
    return NextResponse.json({ erreur: "Cet email est déjà utilisé" }, { status: 400 });
  }

  // Créer l'entreprise
  const entreprise = await prisma.entreprise.create({
    data: {
      nom: data.nom,
      siret: data.siret || null,
      email: data.email || null,
      telephone: data.telephone || null,
      siteWeb: data.siteWeb || null,
      rue: data.rue || null,
      codePostal: data.codePostal || null,
      ville: data.ville || null,
      pays: data.pays || null,
      banque: data.banque || null,
      iban: data.iban || null,
      bic: data.bic || null,
      abonnementId: data.abonnementId || null,
    },
  });

  // Créer l'accès client
  await prisma.utilisateur.create({
    data: {
      email: data.emailClient,
      motDePasse: await bcrypt.hash(data.motDePasseClient, 10),
      prenom: data.prenomClient || "Client",
      role: "CLIENT",
      entrepriseId: entreprise.id,
    },
  });

  return NextResponse.json({ succes: true, entreprise });
}