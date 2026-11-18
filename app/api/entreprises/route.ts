import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { emailPropre, emailValide, envoyerActivation, motDePasseProvisoire } from "@/lib/invitation";

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

  // Le client choisit lui-même son mot de passe grâce au lien reçu par e-mail
  const emailClient = emailPropre(data.emailClient);
  if (!emailValide(emailClient)) {
    return NextResponse.json({ erreur: "L'e-mail du client est obligatoire et doit être valide" }, { status: 400 });
  }

  const emailExistant = await prisma.utilisateur.findFirst({ where: { email: { equals: emailClient, mode: "insensitive" } }, select: { id: true } });
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
      email: emailClient,
      motDePasse: await motDePasseProvisoire(),
      prenom: data.prenomClient || "Client",
      role: "CLIENT",
      entrepriseId: entreprise.id,
    },
  });

  const activation = await envoyerActivation(request, { email: emailClient, prenom: data.prenomClient, entreprise: entreprise.nom, premierCompte: true });
  return NextResponse.json({ succes: true, entreprise, email: emailClient, ...activation });
}