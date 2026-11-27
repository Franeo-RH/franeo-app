import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireJetonSso } from "@/lib/hub";
import { creerJeton, NOM_COOKIE } from "@/lib/jeton-session";
import { journaliser } from "@/lib/securite";

export const dynamic = "force-dynamic";
const COOKIE_INTERVENTION = "franeo_intervention";
const DUREE = 2 * 3600; // 2 h

/**
 * GET ?jeton=… : un admin FRANEO (compte ADMIN existant, venu du portail) intervient dans l'espace d'un client,
 * connecté comme son dirigeant, pour l'aider sur n'importe quelle demande. Tracé dans le journal de sécurité.
 * GET ?fin=1 : termine l'intervention.
 */
export async function GET(request: NextRequest) {
  const base = request.nextUrl.origin;
  const page = (t: string) => new NextResponse(`<p style="font-family:Arial;padding:24px">${t}</p>`, { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  const cookie = { httpOnly: true, secure: true, sameSite: "none" as const, partitioned: true, path: "/" };
  if (request.nextUrl.searchParams.get("fin") === "1") {
    const res = new NextResponse(`<p style="font-family:Arial;padding:24px">Intervention terminée.</p>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    res.cookies.set(NOM_COOKIE, "", { ...cookie, maxAge: 0 });
    res.cookies.set(COOKIE_INTERVENTION, "", { ...cookie, httpOnly: false, maxAge: 0 });
    return res;
  }
  const p = lireJetonSso(request.nextUrl.searchParams.get("jeton"), "rh");
  if (!p || !p.client) return page("Lien expiré : relancez l'intervention depuis le portail.");
  const admin = await prisma.utilisateur.findFirst({ where: { email: { equals: p.email, mode: "insensitive" }, role: "ADMIN" } });
  if (!admin) return page("Aucun compte admin FRANEO RH avec votre adresse.");
  // Le dirigeant principal du client (compte actif, sans limite d'établissement)
  const u = await prisma.utilisateur.findFirst({ where: { entrepriseId: p.client, role: "CLIENT", actif: true, etablissementId: null }, orderBy: { createdAt: "asc" }, include: { entreprise: { select: { nom: true } } } });
  if (!u) return page("Ce client n'a pas encore de compte dirigeant actif : créez-lui un accès d'abord.");
  const res = NextResponse.redirect(`${base}/client/dashboard`);
  res.cookies.set(NOM_COOKIE, creerJeton(u.id, u.motDePasse, DUREE), { ...cookie, maxAge: DUREE });
  res.cookies.set(COOKIE_INTERVENTION, encodeURIComponent(p.nom || admin.email), { ...cookie, httpOnly: false, maxAge: DUREE });
  await journaliser({ action: "LOGIN", utilisateur: u, email: admin.email, entrepriseId: p.client, details: `Intervention FRANEO depuis le portail par ${admin.email} (${u.entreprise?.nom ?? ""})`, request });
  return res;
}
