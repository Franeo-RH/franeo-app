import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireJetonSso, retourSur } from "@/lib/hub";
import { creerJeton, NOM_COOKIE, ouvrirSession } from "@/lib/jeton-session";
import { journaliser } from "@/lib/securite";

export const dynamic = "force-dynamic";

/** GET ?jeton=… : ouverture de l'admin depuis le portail FRANEO, sans nouvelle connexion (compte ADMIN existant) */
export async function GET(request: NextRequest) {
  const p = lireJetonSso(request.nextUrl.searchParams.get("jeton"), "rh");
  const base = request.nextUrl.origin;
  if (!p) return NextResponse.redirect(`${base}/login?erreur=portail`);
  const u = await prisma.utilisateur.findFirst({ where: { email: { equals: p.email, mode: "insensitive" }, role: "ADMIN" } });
  if (!u) return NextResponse.redirect(`${base}/login?erreur=portail`);
  const res = NextResponse.redirect(`${base}${retourSur(p.retour, "/admin/dashboard")}`);
  if (p.integre) {
    // Affichage dans le portail (autre sous-domaine ou autre domaine) : cookie « tiers » autorisé et cloisonné au portail
    res.cookies.set(NOM_COOKIE, creerJeton(u.id, u.motDePasse, 8 * 3600), { httpOnly: true, secure: true, sameSite: "none", partitioned: true, path: "/", maxAge: 8 * 3600 });
  } else ouvrirSession(res, u, 8 * 3600);
  await journaliser({ action: "LOGIN", utilisateur: u, details: "Ouverture depuis le portail admin FRANEO", request });
  return res;
}
