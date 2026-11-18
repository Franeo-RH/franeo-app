// lib/jeton-session.ts
// Cookie de session SIGNÉ : impossible de se faire passer pour quelqu'un d'autre en modifiant le cookie.
// Format : <identifiant>.<expiration>.<empreinte du mot de passe>.<signature HMAC-SHA256>
// - la signature utilise un secret connu du serveur seulement (SESSION_SECRET sur Vercel) ;
// - l'expiration est contrôlée côté serveur ;
// - l'empreinte du mot de passe déconnecte toutes les sessions quand le mot de passe change.
import crypto from "crypto";
import { COOKIE_DEMO } from "@/lib/demo-lecture";
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

/**
 * demo : session « Tester la démo ». La marque fait partie de la signature : impossible de la retirer
 * (effacer le cookie franeo_demo ne suffit plus à sortir de la consultation seule).
 */
export function creerJeton(userId: string, motDePasseHache: string, dureeSecondes: number, demo = false): string {
  const exp = Math.floor(Date.now() / 1000) + dureeSecondes;
  const contenu = `${b64(userId)}.${exp}.${empreinte(motDePasseHache)}`;
  return `${contenu}.${signer(demo ? `demo:${contenu}` : contenu)}`;
}

/**
 * Jetons à usage particulier (étape « code » de la double authentification, appareil de confiance).
 * La signature inclut l'usage : un tel jeton ne peut jamais servir de cookie de session.
 */
export function creerJetonUsage(usage: string, userId: string, motDePasseHache: string, dureeSecondes: number): string {
  const exp = Math.floor(Date.now() / 1000) + dureeSecondes;
  const contenu = `${b64(userId)}.${exp}.${empreinte(motDePasseHache)}`;
  return `${contenu}.${signer(`${usage}:${contenu}`)}`;
}

export function lireJetonUsage(usage: string, jeton: string | undefined | null): { userId: string; empreinte: string } | null {
  if (!jeton || jeton.length > 400) return null;
  const morceaux = jeton.split(".");
  if (morceaux.length !== 4) return null;
  const [id64, exp, emp, sig] = morceaux;
  const attendu = signer(`${usage}:${id64}.${exp}.${emp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(attendu);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (!/^\d+$/.test(exp) || Number(exp) * 1000 < Date.now()) return null;
  return { userId: deB64(id64), empreinte: emp };
}

const egal = (x: string, y: string) => {
  const a = Buffer.from(x), b = Buffer.from(y);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/** Vérifie le jeton : signature, expiration. Renvoie l'identifiant, l'empreinte et la marque démo, ou null. */
export function lireJeton(jeton: string | undefined | null): { userId: string; empreinte: string; demo: boolean } | null {
  if (!jeton || jeton.length > 400) return null;
  const morceaux = jeton.split(".");
  if (morceaux.length !== 4) return null;
  const [id64, exp, emp, sig] = morceaux;
  const contenu = `${id64}.${exp}.${emp}`;
  const demo = !egal(sig, signer(contenu));
  if (demo && !egal(sig, signer(`demo:${contenu}`))) return null;
  if (!/^\d+$/.test(exp) || Number(exp) * 1000 < Date.now()) return null;
  return { userId: deB64(id64), empreinte: emp, demo };
}

/** Pose le cookie de session signé sur la réponse (demo : session « Tester la démo », en consultation seule) */
export function ouvrirSession(res: NextResponse, utilisateur: { id: string; motDePasse: string }, dureeSecondes: number, options: { demo?: boolean } = {}) {
  res.cookies.set(NOM_COOKIE, creerJeton(utilisateur.id, utilisateur.motDePasse, dureeSecondes, !!options.demo), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: dureeSecondes,
  });
  res.cookies.set(ANCIEN_COOKIE, "", { path: "/", maxAge: 0 });
  // Marque de la démo (lue par proxy.ts) : posée pour la démo, effacée pour toute autre connexion
  res.cookies.set(COOKIE_DEMO, options.demo ? "1" : "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: options.demo ? dureeSecondes : 0 });
  return res;
}

/** Efface les cookies de session */
export function fermerSession(res: NextResponse) {
  res.cookies.set(NOM_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  res.cookies.set(COOKIE_DEMO, "", { path: "/", maxAge: 0 });
  res.cookies.set(ANCIEN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
