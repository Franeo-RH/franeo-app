// lib/invitation.ts
// Activation des comptes clients créés par l'admin : le client reçoit un e-mail avec un lien
// pour choisir lui-même son mot de passe. L'admin ne connaît jamais ce mot de passe.

import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { creerJetonLien } from "@/lib/securite";
import { envoyerMail } from "@/lib/notifications";

/** Durée de validité du lien d'activation */
export const DUREE_LIEN_JOURS = 7;

export const emailPropre = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase().slice(0, 200) : "");
export const emailValide = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/** Mot de passe aléatoire inutilisable, en attendant que le client choisisse le sien */
export const motDePasseProvisoire = () => bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12);

/**
 * Crée un lien d'activation et l'envoie par e-mail.
 * Renvoie `lien` uniquement si l'e-mail n'a pas pu partir (pour le transmettre autrement).
 */
export async function envoyerActivation(request: NextRequest | null, o: { email: string; prenom?: string | null; entreprise?: string | null; relance?: boolean; salarie?: boolean }) {
  const jeton = await creerJetonLien(o.email, DUREE_LIEN_JOURS * 24 * 3600 * 1000);
  const base = (process.env.NEXT_PUBLIC_URL || process.env.APP_URL || request?.nextUrl.origin || "https://franeo-app.vercel.app").replace(/\/$/, "");
  const lien = `${base}/reinitialiser-mot-de-passe?token=${jeton}&activation=1`;
  const prenom = o.prenom && o.prenom !== "Client" ? ` ${o.prenom}` : "";
  const envoye = await envoyerMail({
    a: o.email,
    sujet: o.relance ? "Votre lien d'activation FRANEO RH" : o.salarie ? `${o.entreprise ?? "Votre employeur"} vous ouvre votre espace salarié` : "Bienvenue sur FRANEO RH : activez votre compte",
    titre: o.relance ? "Votre nouveau lien d'activation" : "Bienvenue sur FRANEO RH 👋",
    lignes: [
      `Bonjour${prenom},`,
      o.salarie
        ? `${o.entreprise ? `${o.entreprise} vous` : "Votre employeur vous"} ouvre un accès à votre espace salarié FRANEO RH : vos absences, congés, relevés d'heures, notes de frais et documents, depuis votre téléphone ou votre ordinateur.`
        : o.entreprise ? `Votre espace client « ${o.entreprise} » est prêt.` : "Votre espace client FRANEO RH est prêt.",
      "Cliquez sur le bouton ci-dessous pour choisir votre mot de passe et activer votre compte.",
      `Votre identifiant de connexion : ${o.email}`,
      `Ce lien est valable ${DUREE_LIEN_JOURS} jours et ne fonctionne qu'une fois. Passé ce délai, demandez-en un nouveau via « Mot de passe oublié ».`,
    ],
    lien,
    bouton: "Activer mon compte",
  });
  return { mailEnvoye: envoye, lien: envoye ? null : lien };
}
