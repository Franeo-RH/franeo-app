// lib/jeton-session.ts
// Cookie de session SIGNÉ : impossible de se faire passer pour quelqu'un d'autre en modifiant le cookie.
// Format : <identifiant>.<expiration>.<empreinte du mot de passe>.<signature HMAC-SHA256>
// - la signature utilise un secret connu du serveur seulement (SESSION_SECRET sur Vercel) ;
// - l'expiration est contrôlée côté serveur ;
// - l'empreinte du mot de passe déconnecte toutes les sessions quand le mot de passe change.
import crypto from "crypto";
import type { NextResponse } from "next/server";

export const NOM_COOKIE = "franeo_session";
export const ANCIEN_COOKIE = "userId"; // ancien cookie non signé : ignoré, et effacé à la déconnexion

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  // Sans SESSION_SECRET : secret dérivé de l'adresse de la base (connue du serveur seulement).
  // Mieux vaut définir SESSION_SECRET sur Vercel.
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("SESSION_SECRET manquant : impossible de signer les sessions.");
  return crypto.createHash("sha256").update(`franeo-session:${base}`).digest("hex");
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const deB64 = (s: string) => Buffer.from(s, "base64url").toString();
const signer = (contenu: string) => crypto.createHmac("sha256", secret()).update(contenu).digest("base64url");

/** Empreinte courte du mot de passe (haché) : change dès que le mot de passe change */
export function empreinte(motDePasseHache: string): string {
  return crypto.createHash("sha256").update(motDePasseHache).digest("base64url").slice(0, 16);
}

export function creerJeton(userId: string, motDePasseHache: string, dureeSecondes: number): string {
  const exp = Math.floor(Date.now() / 1000) + dureeSecondes;
  const contenu = `${b64(userId)}.${exp}.${empreinte(motDePasseHache)}`;
  return `${contenu}.${signer(contenu)}`;
}

/** Vérifie le jeton : signature, expiration. Renvoie l'identifiant et l'empreinte, ou null. */
export function lireJeton(jeton: string | undefined | null): { userId: string; empreinte: string } | null {
  if (!jeton) return null;
  const morceaux = jeton.split(".");
  if (morceaux.length !== 4) return null;
  const [id64, exp, emp, sig] = morceaux;
  const attendu = signer(`${id64}.${exp}.${emp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(attendu);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (!/^\d+$/.test(exp) || Number(exp) * 1000 < Date.now()) return null;
  return { userId: deB64(id64), empreinte: emp };
}

/** Pose le cookie de session signé sur la réponse */
export function ouvrirSession(res: NextResponse, utilisateur: { id: string; motDePasse: string }, dureeSecondes: number) {
  res.cookies.set(NOM_COOKIE, creerJeton(utilisateur.id, utilisateur.motDePasse, dureeSecondes), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: dureeSecondes,
  });
  res.cookies.set(ANCIEN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

/** Efface les cookies de session */
export function fermerSession(res: NextResponse) {
  res.cookies.set(NOM_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  res.cookies.set(ANCIEN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
