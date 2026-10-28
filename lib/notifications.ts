// lib/notifications.ts
// Mails automatiques à l'administrateur (tickets RH, helpdesk, demandes sur les salariés…).
// Variables Vercel facultatives : MAIL_ADMIN (destinataire), MAIL_FROM (expéditeur d'un domaine validé
// sur Resend, ex. « Franeo <notifications@franeo-rh.com> »), APP_URL (adresse de l'app pour les liens).

import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const DESTINATAIRE = process.env.MAIL_ADMIN || "lfranchino@franeo-rh.com";
const EXPEDITEUR = process.env.MAIL_FROM || "Franeo <onboarding@resend.dev>";
const APP_URL = (process.env.APP_URL || "https://franeo-app.vercel.app").replace(/\/$/, "");

const echapper = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** N'empêche jamais l'action en cours : en cas d'erreur d'envoi, on l'écrit seulement dans les logs */
export async function notifierAdmin(options: {
  sujet: string;
  titre: string;
  lignes: string[];
  lien?: string; // chemin dans l'app, ex. "/admin/tickets/123"
  entrepriseId?: string; // si l'entreprise est la démo, aucun mail n'est envoyé
}) {
  if (!process.env.RESEND_API_KEY) return;
  if (options.entrepriseId) {
    const ent = await prisma.entreprise.findUnique({ where: { id: options.entrepriseId }, select: { demo: true } }).catch(() => null);
    if (ent?.demo) return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const url = options.lien ? `${APP_URL}${options.lien}` : APP_URL;
    await resend.emails.send({
      from: EXPEDITEUR,
      to: DESTINATAIRE,
      subject: `[Franeo] ${options.sujet}`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#111827">
          <h2 style="color:#f97316;margin:0 0 12px">${echapper(options.titre)}</h2>
          ${options.lignes.map((l) => `<p style="margin:4px 0;font-size:14px">${echapper(l)}</p>`).join("")}
          <p style="margin:20px 0 0">
            <a href="${url}" style="background:#f97316;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Ouvrir dans Franeo</a>
          </p>
        </div>`,
    });
  } catch (e) {
    console.error("Mail admin non envoyé :", e);
  }
}
