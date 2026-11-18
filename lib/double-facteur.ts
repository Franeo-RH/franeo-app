// lib/double-facteur.ts
// Double authentification : après le bon mot de passe, un code à 6 chiffres est envoyé par e-mail.
//  - le code expire au bout de 10 minutes, 5 essais au plus ; seule son empreinte est enregistrée ;
//  - « Faire confiance à cet appareil » : plus de code sur ce navigateur pendant 30 jours
//    (cookie signé, annulé dès que le mot de passe change).
// Réglage : DEUX_FACTEURS=non sur Vercel pour la couper (déconseillé). Sans RESEND_API_KEY en local, le code
// s'affiche dans le terminal de « npm run dev ».

import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { creerJetonUsage, lireJetonUsage, empreinte } from "@/lib/jeton-session";

export const COOKIE_APPAREIL = "franeo_appareil";
const DUREE_CODE_MS = 10 * 60 * 1000;
const DUREE_ETAPE_S = 15 * 60;
const DUREE_APPAREIL_S = 30 * 24 * 3600;
export const ESSAIS_MAX = 5;

type Compte = { id: string; email: string; prenom: string; motDePasse: string };

export function doubleFacteurActif(): boolean {
  if (process.env.DEUX_FACTEURS === "non") return false;
  return !!process.env.RESEND_API_KEY || process.env.NODE_ENV !== "production";
}

const hacherCode = (utilisateurId: string, code: string) => crypto.createHash("sha256").update(`${utilisateurId}:${code}`).digest("hex");

/** Cet appareil a-t-il été déclaré « de confiance » par ce compte (et le mot de passe n'a pas changé) ? */
export function appareilDeConfiance(request: NextRequest, compte: Compte): boolean {
  const j = lireJetonUsage("appareil", request.cookies.get(COOKIE_APPAREIL)?.value);
  return !!j && j.userId === compte.id && j.empreinte === empreinte(compte.motDePasse);
}

export function memoriserAppareil(res: NextResponse, compte: Compte) {
  res.cookies.set(COOKIE_APPAREIL, creerJetonUsage("appareil", compte.id, compte.motDePasse, DUREE_APPAREIL_S), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DUREE_APPAREIL_S,
  });
}

/** « l•••••@exemple.fr » */
export const emailMasque = (e: string) => e.replace(/^(.)[^@]*(@.*)$/, (_m, a: string, b: string) => `${a}•••••${b}`);

/** Crée un code, l'envoie par e-mail et renvoie le jeton de l'étape « code » (ce n'est pas une session) */
export async function envoyerCode(compte: Compte): Promise<{ jeton: string; envoye: boolean }> {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.codeConnexion.deleteMany({ where: { utilisateurId: compte.id } });
  await prisma.codeConnexion.create({ data: { utilisateurId: compte.id, empreinte: hacherCode(compte.id, code), expiresAt: new Date(Date.now() + DUREE_CODE_MS) } });
  let envoye = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.MAIL_FROM || "Franeo <noreply@franeo-rh.com>",
        to: compte.email,
        subject: `${code} : votre code de connexion FRANEO RH`,
        text: `Bonjour ${compte.prenom},\n\nVotre code de connexion : ${code}\nIl est valable 10 minutes.\n\nSi vous n'êtes pas à l'origine de cette connexion, changez votre mot de passe.`,
        html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;color:#111827">
          <h2 style="color:#f97316;margin:0 0 12px">Votre code de connexion</h2>
          <p style="font-size:14px">Bonjour ${compte.prenom.replace(/[<>&"]/g, "")},</p>
          <p style="font-size:34px;font-weight:bold;letter-spacing:8px;margin:18px 0;background:#fff7ed;border-radius:12px;padding:14px;text-align:center">${code}</p>
          <p style="font-size:13px;color:#4b5563">Ce code est valable 10 minutes. Si vous n'êtes pas à l'origine de cette connexion, ignorez ce message et changez votre mot de passe.</p>
        </div>`,
      });
      envoye = true;
    } catch (e) {
      console.error("Code de connexion non envoyé :", e);
    }
  } else {
    // Test en local sans service d'e-mail : le code s'affiche dans le terminal
    console.log(`\n🔐 Code de connexion pour ${compte.email} : ${code}\n`);
    envoye = true;
  }
  return { jeton: creerJetonUsage("2fa", compte.id, compte.motDePasse, DUREE_ETAPE_S), envoye };
}

/** Vérifie le code saisi. Renvoie le compte si tout est bon. */
export async function verifierCode(jeton: string, code: string): Promise<{ ok: true; utilisateurId: string } | { ok: false; erreur: string; recommencer?: boolean }> {
  const j = lireJetonUsage("2fa", jeton);
  if (!j) return { ok: false, erreur: "La connexion a expiré : saisissez de nouveau votre mot de passe.", recommencer: true };
  const u = await prisma.utilisateur.findUnique({ where: { id: j.userId }, select: { id: true, motDePasse: true } });
  if (!u || empreinte(u.motDePasse) !== j.empreinte) return { ok: false, erreur: "La connexion a expiré : saisissez de nouveau votre mot de passe.", recommencer: true };
  const c = await prisma.codeConnexion.findFirst({ where: { utilisateurId: u.id }, orderBy: { createdAt: "desc" } });
  if (!c || c.expiresAt < new Date()) return { ok: false, erreur: "Ce code a expiré : demandez-en un nouveau." };
  if (c.essais >= ESSAIS_MAX) return { ok: false, erreur: "Trop d'essais : demandez un nouveau code." };
  const saisi = (code || "").replace(/\D/g, "").slice(0, 6);
  const a = Buffer.from(hacherCode(u.id, saisi)), b = Buffer.from(c.empreinte);
  if (saisi.length !== 6 || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    await prisma.codeConnexion.update({ where: { id: c.id }, data: { essais: { increment: 1 } } });
    const reste = ESSAIS_MAX - c.essais - 1;
    return { ok: false, erreur: reste > 0 ? `Code incorrect (${reste} essai${reste > 1 ? "s" : ""} restant${reste > 1 ? "s" : ""}).` : "Code incorrect : demandez un nouveau code." };
  }
  await prisma.codeConnexion.deleteMany({ where: { utilisateurId: u.id } });
  return { ok: true, utilisateurId: u.id };
}
