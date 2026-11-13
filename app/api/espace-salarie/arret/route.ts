import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { lireFichier } from "@/lib/fichiers";
import { LIBELLES_ABSENCE } from "@/lib/espace-salarie";

const EXPEDITEUR = process.env.MAIL_FROM || "Franeo <noreply@franeo-rh.com>";
const NATURES: Record<string, string> = {
  INITIAL: "Arrêt de travail initial",
  PROLONGATION: "Prolongation d'arrêt de travail",
  ACCIDENT: "Arrêt pour accident du travail / de trajet",
};
const fr = (d: Date) => d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * POST (formulaire) : dateDebut, dateFin, nature, commentaire?, fichier (arrêt de travail, PDF ou photo).
 * L'absence « Arrêt maladie » est créée (en attente) et l'arrêt part par e-mail, en pièce jointe, aux dirigeants.
 * Le fichier n'est PAS conservé dans l'application (donnée de santé) : il n'existe que dans l'e-mail.
 */
export async function POST(request: NextRequest) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  if (!aDroit(s.utilisateur.entreprise?.permissions, "espace.absences")) return NextResponse.json({ erreur: "Fonction non activée par votre employeur." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ erreur: "Formulaire invalide" }, { status: 400 });
  const debut = new Date(`${form.get("dateDebut")}T12:00:00`);
  const fin = new Date(`${form.get("dateFin")}T12:00:00`);
  if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime()) || fin < debut) {
    return NextResponse.json({ erreur: "Vérifiez les dates (la fin doit être après le début)." }, { status: 400 });
  }
  const nature = NATURES[String(form.get("nature"))] ? String(form.get("nature")) : "INITIAL";
  const commentaire = String(form.get("commentaire") || "").trim().slice(0, 500);
  const lu = await lireFichier(form.get("fichier"), /\.(pdf|jpe?g|png|webp|heic)$/i);
  if ("erreur" in lu) return NextResponse.json({ erreur: lu.erreur === "Aucun fichier reçu." ? "Joignez votre arrêt de travail (photo ou PDF)." : lu.erreur.replace("PDF, image, Word, Excel, texte", "PDF ou photo") }, { status: 400 });

  const entrepriseId = s.utilisateur.entrepriseId!;
  const chevauche = await prisma.absence.findFirst({
    where: { salarieId: s.salarie.id, statut: { not: "Refusé" }, dateDebut: { lte: fin }, dateFin: { gte: debut } },
  });
  if (chevauche && nature !== "PROLONGATION") {
    return NextResponse.json({ erreur: `Vous avez déjà une absence sur ces dates (${LIBELLES_ABSENCE[chevauche.type] || chevauche.type} du ${fr(chevauche.dateDebut)} au ${fr(chevauche.dateFin)}). S'il s'agit d'une prolongation, choisissez « Prolongation ».` }, { status: 409 });
  }

  // Destinataires : comptes employeur de l'entreprise + salariés « Dirigeant » ayant un e-mail
  const [comptes, dirigeants, entreprise] = await Promise.all([
    prisma.utilisateur.findMany({ where: { entrepriseId, role: "CLIENT", actif: true }, select: { email: true } }),
    prisma.salarie.findMany({ where: { entrepriseId, roleRH: "DIRIGEANT", statut: "Actif", email: { not: null } }, select: { email: true } }),
    prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { nom: true, demo: true } }),
  ]);
  const destinataires = [...new Set([...comptes.map((c) => c.email), ...dirigeants.map((d) => d.email!)].map((e) => e.trim().toLowerCase()).filter(Boolean))];

  const nom = `${s.salarie.prenom} ${s.salarie.nom}`;
  const jours = Math.round((fin.getTime() - debut.getTime()) / 86400000) + 1;

  // Démo : rien n'est envoyé
  if (!entreprise?.demo) {
    if (!process.env.RESEND_API_KEY || destinataires.length === 0) {
      return NextResponse.json({ erreur: "L'envoi à votre employeur est impossible pour le moment. Transmettez-lui votre arrêt directement." }, { status: 503 });
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: EXPEDITEUR,
      to: destinataires,
      subject: `Arrêt de travail — ${nom} — du ${fr(debut)} au ${fr(fin)}`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#111827">
          <h2 style="color:#f97316;margin:0 0 12px">🤒 ${NATURES[nature]}</h2>
          <p style="margin:6px 0;font-size:14px"><strong>${echapper(nom)}</strong> (${echapper(s.salarie.poste)}) a déclaré un arrêt de travail dans son espace salarié.</p>
          <p style="margin:6px 0;font-size:14px">Du <strong>${fr(debut)}</strong> au <strong>${fr(fin)}</strong> inclus (${jours} jour(s) calendaires).</p>
          ${commentaire ? `<p style="margin:6px 0;font-size:14px">Message : ${echapper(commentaire)}</p>` : ""}
          <p style="margin:6px 0;font-size:14px">L'arrêt est joint à cet e-mail. Pour des raisons de confidentialité, il n'est pas conservé dans l'application : enregistrez-le dans votre dossier du personnel.</p>
          <p style="margin:12px 0 0;font-size:12px;color:#6b7280">${echapper(entreprise?.nom ?? "")} · envoyé par FRANEO RH</p>
        </div>`,
      attachments: [{ filename: lu.fichier.nom, content: lu.fichier.contenu }],
    });
    if (error) {
      console.error("Arrêt de travail : mail refusé par Resend", error);
      return NextResponse.json({ erreur: "L'envoi à votre employeur a échoué. Réessayez dans un instant ou transmettez-lui votre arrêt directement." }, { status: 502 });
    }
  }

  // L'absence n'est créée qu'une fois l'e-mail parti (ou en démo)
  if (!chevauche) {
    await prisma.absence.create({
      data: {
        salarieId: s.salarie.id, entrepriseId, type: "MALADIE", dateDebut: debut, dateFin: fin, declareeParSalarie: true,
        commentaire: `${NATURES[nature]} déclaré par le salarié — arrêt envoyé par e-mail à l'employeur${commentaire ? ` · ${commentaire}` : ""}`.slice(0, 500),
      },
    });
  } else {
    // Prolongation qui chevauche : on prolonge l'absence existante
    await prisma.absence.update({
      where: { id: chevauche.id },
      data: { dateFin: fin > chevauche.dateFin ? fin : chevauche.dateFin, commentaire: `${chevauche.commentaire ?? ""} · Prolongation jusqu'au ${fr(fin)}`.slice(0, 500) },
    });
  }

  return NextResponse.json({
    succes: true,
    message: entreprise?.demo ? "✅ Arrêt enregistré (démo : aucun e-mail envoyé)." : `✅ Arrêt envoyé à votre employeur (${destinataires.length} destinataire(s)).`,
  });
}
