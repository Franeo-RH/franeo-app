// app/api/auth/code/route.ts — 2e étape de la connexion (double authentification)
// POST { jeton, code, confiance? } : vérifie le code et ouvre la session
// POST { jeton, renvoyer: true }   : envoie un nouveau code (3 fois par quart d'heure au plus)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ouvrirSession, lireJetonUsage } from "@/lib/jeton-session";
import { envoyerCode, memoriserAppareil, verifierCode } from "@/lib/double-facteur";
import { estBloque, journaliser, noterEchec } from "@/lib/securite";

const FENETRE = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const b = await request.json().catch(() => ({}));
  const jeton = typeof b.jeton === "string" ? b.jeton : "";

  if (b.renvoyer === true) {
    const j = lireJetonUsage("2fa", jeton);
    if (!j) return NextResponse.json({ erreur: "La connexion a expiré : saisissez de nouveau votre mot de passe.", recommencer: true }, { status: 401 });
    const cle = `code:renvoi:${j.userId}`;
    if (await estBloque(cle, 3, FENETRE)) return NextResponse.json({ erreur: "Trop de codes demandés : réessayez dans quelques minutes." }, { status: 429 });
    await noterEchec(cle, 3, FENETRE);
    const u = await prisma.utilisateur.findUnique({ where: { id: j.userId }, select: { id: true, email: true, prenom: true, motDePasse: true } });
    if (!u) return NextResponse.json({ erreur: "Compte introuvable", recommencer: true }, { status: 401 });
    const r = await envoyerCode(u);
    if (!r.envoye) return NextResponse.json({ erreur: "L'e-mail n'a pas pu partir. Réessayez dans un instant." }, { status: 502 });
    return NextResponse.json({ succes: true, jeton: r.jeton });
  }

  const v = await verifierCode(jeton, typeof b.code === "string" ? b.code : "");
  if (!v.ok) {
    const id = lireJetonUsage("2fa", jeton)?.userId;
    if (id) await journaliser({ action: "CODE_ECHEC", utilisateur: { id }, request });
    return NextResponse.json({ erreur: v.erreur, recommencer: v.recommencer ?? false }, { status: 401 });
  }
  const u = await prisma.utilisateur.findUnique({ where: { id: v.utilisateurId } });
  if (!u) return NextResponse.json({ erreur: "Compte introuvable", recommencer: true }, { status: 401 });
  await journaliser({ action: "LOGIN", utilisateur: u, request, details: "avec code de connexion" });
  const res = NextResponse.json({ succes: true, role: u.role });
  if (b.confiance === true) memoriserAppareil(res, u);
  return ouvrirSession(res, u, 60 * 60 * 24 * 7);
}
