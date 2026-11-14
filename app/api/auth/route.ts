import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ouvrirSession } from "@/lib/jeton-session";
import { effacerEchecs, estBloque, hachageFactice, ipDe, journaliser, noterEchec } from "@/lib/securite";

// Anti-force brute partagé entre tous les serveurs (table TentativeConnexion) :
// 8 essais ratés par compte, 30 par adresse IP, sur 15 minutes
const FENETRE = 15 * 60 * 1000;
const MAX_COMPTE = 8;
const MAX_IP = 30;

export async function POST(request: NextRequest) {
  const corps = await request.json().catch(() => ({}));
  const email = typeof corps?.email === "string" ? corps.email.trim().toLowerCase().slice(0, 200) : "";
  const motDePasse = typeof corps?.motDePasse === "string" ? corps.motDePasse.slice(0, 200) : "";
  if (!email || !motDePasse) {
    return NextResponse.json({ erreur: "Email ou mot de passe incorrect" }, { status: 401 });
  }

  const ip = ipDe(request);
  const cleCompte = `login:email:${email}`;
  const cleIp = `login:ip:${ip}`;
  if ((await estBloque(cleCompte, MAX_COMPTE, FENETRE)) || (await estBloque(cleIp, MAX_IP, FENETRE))) {
    await journaliser({ action: "LOGIN_BLOQUE", email, request });
    return NextResponse.json({ erreur: "Trop de tentatives. Réessayez dans 15 minutes, ou utilisez « Mot de passe oublié »." }, { status: 429 });
  }

  // Email sans tenir compte des majuscules
  const utilisateur = await prisma.utilisateur.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  // Même durée de vérification que le compte existe ou non (pas de découverte des comptes par le temps de réponse)
  const valide = await bcrypt.compare(motDePasse, utilisateur?.motDePasse ?? hachageFactice());

  if (!utilisateur || !valide) {
    await Promise.all([noterEchec(cleCompte, MAX_COMPTE, FENETRE), noterEchec(cleIp, MAX_IP, FENETRE)]);
    await journaliser({ action: "LOGIN_ECHEC", email, entrepriseId: utilisateur?.entrepriseId, request });
    return NextResponse.json({ erreur: "Email ou mot de passe incorrect" }, { status: 401 });
  }

  // Compte désactivé par l'admin (les comptes salariés coupés voient un message dans leur espace)
  if (utilisateur.actif === false && utilisateur.role !== "SALARIE") {
    return NextResponse.json({ erreur: "Ce compte est désactivé. Contactez FRANEO RH." }, { status: 403 });
  }

  await effacerEchecs(cleCompte);
  await journaliser({ action: "LOGIN", utilisateur, request });

  const response = NextResponse.json({ succes: true, role: utilisateur.role });
  // Cookie de session signé, valable 7 jours
  return ouvrirSession(response, utilisateur, 60 * 60 * 24 * 7);
}
