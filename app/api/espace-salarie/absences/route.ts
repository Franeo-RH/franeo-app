import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";
import { notifierClients } from "@/lib/notifications";
import { LIBELLES_ABSENCE, TYPES_ABSENCE_SALARIE } from "@/lib/espace-salarie";

// Le salarié déclare une absence : elle part « En attente » chez son employeur
export async function POST(request: NextRequest) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });

  const { type, dateDebut, dateFin, commentaire } = await request.json();
  if (!TYPES_ABSENCE_SALARIE.some((t) => t.value === type)) {
    return NextResponse.json({ erreur: "Type d'absence non disponible." }, { status: 400 });
  }
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime()) || fin < debut) {
    return NextResponse.json({ erreur: "Vérifiez les dates (la fin doit être après le début)." }, { status: 400 });
  }

  // Pas deux absences sur les mêmes jours (hors demandes refusées)
  const chevauche = await prisma.absence.findFirst({
    where: { salarieId: s.salarie.id, statut: { not: "Refusé" }, dateDebut: { lte: fin }, dateFin: { gte: debut } },
    orderBy: { dateDebut: "asc" },
  });
  if (chevauche) {
    const fr = (d: Date) => new Date(d).toLocaleDateString("fr-FR");
    return NextResponse.json(
      {
        erreur: `Vous avez déjà une absence sur ces dates : ${LIBELLES_ABSENCE[chevauche.type] || chevauche.type} du ${fr(chevauche.dateDebut)} au ${fr(chevauche.dateFin)} (${chevauche.statut.toLowerCase()}). Choisissez d'autres dates ou annulez d'abord la demande existante.`,
      },
      { status: 409 }
    );
  }

  const absence = await prisma.absence.create({
    data: {
      salarieId: s.salarie.id,
      entrepriseId: s.utilisateur.entrepriseId!,
      type,
      dateDebut: debut,
      dateFin: fin,
      commentaire: typeof commentaire === "string" && commentaire.trim() ? commentaire.trim().slice(0, 500) : null,
      declareeParSalarie: true,
    },
  });

  const jours = Math.round((fin.getTime() - debut.getTime()) / 86400000) + 1;
  await notifierClients(s.utilisateur.entrepriseId!, {
    sujet: `Demande d'absence de ${s.salarie.prenom} ${s.salarie.nom}`,
    titre: "📅 Nouvelle demande d'absence",
    lignes: [
      `${s.salarie.prenom} ${s.salarie.nom} demande : ${LIBELLES_ABSENCE[type] || type}`,
      `Du ${debut.toLocaleDateString("fr-FR")} au ${fin.toLocaleDateString("fr-FR")} (${jours} jour(s) calendaires)`,
      ...(absence.commentaire ? [`Message : ${absence.commentaire}`] : []),
      "Validez ou refusez la demande dans Paie › Absences.",
    ],
    lien: "/client/salaries/absences",
  });

  return NextResponse.json({ succes: true, absence });
}
