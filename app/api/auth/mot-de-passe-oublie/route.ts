import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { creerJetonLien, estBloque, journaliser, noterEchec } from "@/lib/securite";
import { Resend } from "resend";
import { EMAIL_DEMO } from "@/lib/demo";

// Expéditeur : une adresse du domaine validé sur Resend (franeo-rh.com).
// « onboarding@resend.dev » ne livre QUE l'adresse du compte Resend : les autres mails partent dans le vide.
const EXPEDITEUR = process.env.MAIL_FROM || "Franeo <noreply@franeo-rh.com>";

export async function POST(request: NextRequest) {
  const corps = await request.json().catch(() => ({}));
  const email = typeof corps?.email === "string" ? corps.email.trim().toLowerCase() : "";

  if (!email) {
    return NextResponse.json({ erreur: "Email requis" }, { status: 400 });
  }

  // Compte de démonstration : aucun email n'est envoyé
  if (String(email).toLowerCase() === EMAIL_DEMO) {
    return NextResponse.json({ succes: true });
  }

  // 3 demandes par heure et par adresse (évite d'inonder une boîte mail)
  const cle = `reset:email:${email}`;
  if (await estBloque(cle, 3, 60 * 60 * 1000)) return NextResponse.json({ succes: true });
  await noterEchec(cle, 3, 60 * 60 * 1000);

  // Recherche sans tenir compte des majuscules (« Prenom.Nom@… » = « prenom.nom@… »)
  const utilisateur = await prisma.utilisateur.findFirst({ where: { email: { equals: email, mode: "insensitive" }, actif: true } });

  // On répond toujours OK pour ne pas révéler si l'email existe
  if (!utilisateur) {
    return NextResponse.json({ succes: true });
  }

  // Lien à usage unique valable 1 heure (seule son empreinte est enregistrée)
  const token = await creerJetonLien(utilisateur.email, 1000 * 60 * 60);
  await journaliser({ action: "MDP_OUBLIE", utilisateur, request });

  // Adresse de l'app : variable Vercel, sinon l'adresse sur laquelle la demande a été faite
  const base = (process.env.NEXT_PUBLIC_URL || process.env.APP_URL || request.nextUrl.origin).replace(/\/$/, "");
  const lien = `${base}/reinitialiser-mot-de-passe?token=${token}`;

  if (!process.env.RESEND_API_KEY) {
    console.error("Mot de passe oublié : RESEND_API_KEY absente, aucun mail envoyé.");
    return NextResponse.json({ succes: true });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: EXPEDITEUR,
    to: utilisateur.email,
    subject: "Réinitialisation de votre mot de passe",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">Réinitialisation de mot de passe</h2>
        <p>Bonjour ${utilisateur.prenom},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe Franeo.</p>
        <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
        <a href="${lien}" style="
          display: inline-block;
          background-color: #f97316;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          margin: 16px 0;
        ">
          Réinitialiser mon mot de passe
        </a>
        <p style="color: #666; font-size: 14px;">Ce lien est valable 1 heure.</p>
        <p style="color: #666; font-size: 14px;">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">L'équipe Franeo</p>
      </div>
    `,
  });
  // Resend ne lève pas d'exception : l'erreur est renvoyée ici (visible dans Vercel › Logs)
  if (error) console.error("Mot de passe oublié : mail refusé par Resend", error);

  return NextResponse.json({ succes: true });
}