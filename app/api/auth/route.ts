import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ouvrirSession } from "@/lib/jeton-session";

// Anti-force brute : 10 essais ratés par email et par adresse IP sur 15 minutes
const essais = new Map<string, number[]>();
const FENETRE = 15 * 60 * 1000;

export async function POST(request: NextRequest) {

  const { email, motDePasse } = await request.json().catch(() => ({}));
  if (typeof email !== "string" || typeof motDePasse !== "string") {
    return NextResponse.json({ erreur: "Email ou mot de passe incorrect" }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
  const cle = `${ip}|${email.toLowerCase()}`;
  const maintenant = Date.now();
  const recents = (essais.get(cle) || []).filter((t) => maintenant - t < FENETRE);
  if (recents.length >= 10) {
    return NextResponse.json({ erreur: "Trop de tentatives. Réessayez dans 15 minutes." }, { status: 429 });
  }
  const echec = () => {
    recents.push(maintenant);
    essais.set(cle, recents);
    if (essais.size > 5000) essais.delete(essais.keys().next().value as string);
    return NextResponse.json({ erreur: "Email ou mot de passe incorrect" }, { status: 401 });
  };

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { email },
  });

  if (!utilisateur) return echec();

  const motDePasseValide = await bcrypt.compare(
    motDePasse,
    utilisateur.motDePasse
  );

  if (!motDePasseValide) return echec();
  essais.delete(cle);

  const response = NextResponse.json({
    succes: true,
    role: utilisateur.role,
  });

  // Cookie de session signé, valable 7 jours
  return ouvrirSession(response, utilisateur, 60 * 60 * 24 * 7);
}