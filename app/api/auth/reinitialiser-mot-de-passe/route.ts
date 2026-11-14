import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erreurMotDePasse, hacherMotDePasse, journaliser, lireJetonLien, effacerEchecs } from "@/lib/securite";
import { oublierSessions } from "@/lib/session";

/** POST { token, motDePasse } : choisit un nouveau mot de passe depuis un lien (mot de passe oublié ou invitation) */
export async function POST(request: NextRequest) {
  const { token, motDePasse } = await request.json().catch(() => ({}));
  if (!token || !motDePasse) {
    return NextResponse.json({ erreur: "Lien et mot de passe requis" }, { status: 400 });
  }
  const regle = erreurMotDePasse(motDePasse);
  if (regle) return NextResponse.json({ erreur: regle }, { status: 400 });

  const tokenReset = await lireJetonLien(String(token));
  if (!tokenReset) {
    return NextResponse.json({ erreur: "Lien invalide ou déjà utilisé" }, { status: 400 });
  }
  if (tokenReset.expiresAt < new Date()) {
    await prisma.tokenReset.delete({ where: { id: tokenReset.id } }).catch(() => {});
    return NextResponse.json({ erreur: "Lien expiré, faites une nouvelle demande" }, { status: 400 });
  }

  const utilisateur = await prisma.utilisateur.update({
    where: { email: tokenReset.email },
    data: { motDePasse: await hacherMotDePasse(motDePasse) },
  });
  // Lien à usage unique ; les sessions ouvertes avec l'ancien mot de passe sont fermées
  await prisma.tokenReset.deleteMany({ where: { email: tokenReset.email } });
  await effacerEchecs(`login:email:${tokenReset.email.toLowerCase()}`);
  oublierSessions(utilisateur.id);
  await journaliser({ action: "MDP_RESET", utilisateur, request });

  return NextResponse.json({ succes: true });
}
