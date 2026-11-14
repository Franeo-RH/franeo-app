// lib/securite.ts
// Sécurité commune : anti-force brute partagé (base de données), jetons de lien hachés,
// règles de mot de passe, adresse IP, journal d'audit.

import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/* ───────── Adresse IP ───────── */
export function ipDe(request: NextRequest | Request): string {
  const h = request.headers;
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "inconnue").trim().slice(0, 64);
}

/* ───────── Anti-force brute (partagé entre les serveurs) ───────── */

/** Le compteur est-il dépassé ? (max essais ratés dans la fenêtre) */
export async function estBloque(cle: string, max: number, fenetreMs: number): Promise<boolean> {
  try {
    const t = await prisma.tentativeConnexion.findUnique({ where: { cle } });
    if (!t) return false;
    if (t.bloqueJusqua && t.bloqueJusqua > new Date()) return true;
    return Date.now() - t.debut.getTime() < fenetreMs && t.essais >= max;
  } catch {
    return false; // la sécurité ne doit pas empêcher de se connecter si la table n'existe pas encore
  }
}

/** Compte un essai raté ; au-delà de max, bloque la clé pendant la fenêtre */
export async function noterEchec(cle: string, max: number, fenetreMs: number) {
  try {
    const t = await prisma.tentativeConnexion.findUnique({ where: { cle } });
    const neuf = !t || Date.now() - t.debut.getTime() >= fenetreMs;
    const essais = neuf ? 1 : t!.essais + 1;
    const bloqueJusqua = essais >= max ? new Date(Date.now() + fenetreMs) : null;
    await prisma.tentativeConnexion.upsert({
      where: { cle },
      create: { cle, essais, debut: new Date(), bloqueJusqua },
      update: neuf ? { essais, debut: new Date(), bloqueJusqua } : { essais, bloqueJusqua },
    });
  } catch { /* table absente : on ignore */ }
}

export async function effacerEchecs(cle: string) {
  await prisma.tentativeConnexion.deleteMany({ where: { cle } }).catch(() => {});
}

/* ───────── Mots de passe ───────── */

/** Règle commune : 10 caractères minimum, au moins une lettre et un chiffre (recommandations CNIL avec blocage des essais) */
export function erreurMotDePasse(mdp: unknown): string | null {
  const m = typeof mdp === "string" ? mdp : "";
  if (m.length < 10) return "Le mot de passe doit contenir au moins 10 caractères.";
  if (m.length > 200) return "Mot de passe trop long.";
  if (!/[A-Za-zÀ-ÿ]/.test(m) || !/\d/.test(m)) return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  return null;
}

export const hacherMotDePasse = (mdp: string) => bcrypt.hash(mdp, 12);

let facticeCache: string | null = null;
/** Hachage factice : la vérification prend le même temps qu'un compte existe ou non (pas d'énumération des comptes) */
export function hachageFactice(): string {
  if (!facticeCache) facticeCache = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 10);
  return facticeCache;
}

/* ───────── Jetons des liens (mot de passe oublié, invitations) ───────── */

/** Seule l'empreinte du jeton est enregistrée : une fuite de la base ne donne pas les liens valides */
export const empreinteJeton = (jeton: string) => crypto.createHash("sha256").update(jeton).digest("hex");

/** Crée un lien à usage unique pour cet email ; renvoie le jeton à mettre dans le lien */
export async function creerJetonLien(email: string, dureeMs: number): Promise<string> {
  const jeton = crypto.randomBytes(32).toString("hex");
  await prisma.tokenReset.deleteMany({ where: { email } });
  await prisma.tokenReset.create({ data: { token: empreinteJeton(jeton), email, expiresAt: new Date(Date.now() + dureeMs) } });
  return jeton;
}

/** Retrouve un lien valide (accepte aussi les anciens liens enregistrés en clair, envoyés avant la mise à jour) */
export async function lireJetonLien(jeton: string) {
  if (!jeton || typeof jeton !== "string" || jeton.length > 200) return null;
  return prisma.tokenReset.findFirst({ where: { token: { in: [empreinteJeton(jeton), jeton] } } });
}

/* ───────── Journal d'audit ───────── */

export type ActionAudit =
  | "LOGIN" | "LOGIN_ECHEC" | "LOGIN_BLOQUE" | "LOGOUT" | "MDP_CHANGE" | "MDP_RESET" | "MDP_OUBLIE"
  | "EXPORT" | "DROITS" | "SALARIE_SUPPR" | "COMPTE_SUPPR" | "RGPD_EXPORT" | "RGPD_ANONYMISATION" | "LOGO";

export async function journaliser(e: {
  action: ActionAudit; utilisateur?: { id: string; email?: string | null; role?: string | null; entrepriseId?: string | null } | null;
  email?: string | null; entrepriseId?: string | null; cible?: string | null; details?: string | null; request?: NextRequest | Request | null;
}) {
  try {
    await prisma.journalAudit.create({
      data: {
        action: e.action,
        utilisateurId: e.utilisateur?.id ?? null,
        email: (e.utilisateur?.email ?? e.email ?? null)?.slice(0, 200) ?? null,
        role: e.utilisateur?.role ?? null,
        entrepriseId: e.entrepriseId ?? e.utilisateur?.entrepriseId ?? null,
        cible: e.cible?.slice(0, 300) ?? null,
        details: e.details?.slice(0, 1000) ?? null,
        ip: e.request ? ipDe(e.request) : null,
      },
    });
  } catch (err) {
    console.error("[Audit] non enregistré", err);
  }
}

/** Retire des données personnelles évidentes d'un texte envoyé à un service externe (IA) */
export function masquerDonneesPersonnelles(texte: string): string {
  return texte
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[e-mail]")
    .replace(/\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}(\s?\d{2})?\b/g, "[n° SS]")
    .replace(/\bFR\d{2}[\s\d]{20,30}\b/gi, "[IBAN]")
    .replace(/(\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/g, "[téléphone]");
}
