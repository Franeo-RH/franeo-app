import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import crypto from "crypto";
import { EMAIL_DEMO } from "@/lib/demo";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ erreur: "Email requis" }, { status: 400 });
  }

  // Compte de démonstration : aucun email n'est envoyé
  if (String(email).toLowerCase() === EMAIL_DEMO) {
    return NextResponse.json({ succes: true });
  }

  const utilisateur = await prisma.utilisateur.findUnique({ where: { email } });

  // On répond toujours OK pour ne pas révéler si l'email existe
  if (!utilisateur) {
    return NextResponse.json({ succes: true });
  }

  // Supprimer les anciens tokens pour cet email
  await prisma.tokenReset.deleteMany({ where: { email } });

  // Créer un nouveau token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 heure

  await prisma.tokenReset.create({
    data: { token, email, expiresAt },
  });

  const lien = `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/reinitialiser-mot-de-passe?token=${token}`;

  await resend.emails.send({
    from: "Franeo <onboarding@resend.dev>",
    to: email,
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

  return NextResponse.json({ succes: true });
}