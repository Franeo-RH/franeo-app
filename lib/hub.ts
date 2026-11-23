// lib/hub.ts
// Raccordement au portail admin FRANEO (admin.franeo-rh.com) :
// - le portail lit le résumé de l'app (GET /api/hub/resume) avec la clé partagée HUB_SECRET ;
// - le portail ouvre l'admin sans nouvelle connexion (GET /api/hub/sso?jeton=…) : jeton signé avec HUB_SECRET,
//   valable 60 secondes et utilisable une seule fois, pour un compte ADMIN existant de cette app.

import crypto from "crypto";

const secret = () => process.env.HUB_SECRET || "";
export const hubActif = () => secret().length >= 32;

const egal = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** En-tête « Authorization: Bearer <HUB_SECRET> » envoyé par le portail */
export function appelDuPortail(authorization: string | null): boolean {
  if (!hubActif() || !authorization?.startsWith("Bearer ")) return false;
  return egal(authorization.slice(7), secret());
}

const utilises = new Map<string, number>(); // jetons déjà utilisés (mémoire courte, le jeton expire en 60 s)

export type JetonSso = { email: string; app: string; exp: number; n: string; retour?: string; integre?: boolean };

export function lireJetonSso(jeton: string | null, app: string): JetonSso | null {
  if (!hubActif() || !jeton || jeton.length > 1500) return null;
  const [corps, sig] = jeton.split(".");
  if (!corps || !sig) return null;
  const attendu = crypto.createHmac("sha256", secret()).update(`sso:${corps}`).digest("base64url");
  if (!egal(sig, attendu)) return null;
  let p: JetonSso;
  try { p = JSON.parse(Buffer.from(corps, "base64url").toString()); } catch { return null; }
  if (p.app !== app || typeof p.email !== "string" || typeof p.n !== "string" || !(p.exp * 1000 > Date.now())) return null;
  const maintenant = Date.now();
  for (const [k, t] of utilises) if (t < maintenant) utilises.delete(k);
  if (utilises.has(p.n)) return null;
  utilises.set(p.n, p.exp * 1000);
  return p;
}

/** Chemin de retour interne uniquement (jamais une adresse externe) */
export const retourSur = (r: string | undefined, defaut: string) => (r && /^\/(?!\/)[\w\-/?=&%.]*$/.test(r) ? r : defaut);
