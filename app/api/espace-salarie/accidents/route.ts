// app/api/espace-salarie/accidents/route.ts
// GET  : accidents déclarés par le salarié connecté (et leur avancement)
// POST : le salarié déclare un accident du travail ou de trajet ; son employeur est prévenu par e-mail

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { champsDeclaration } from "@/lib/accidents-serveur";
import { notifierAdmin, notifierClients } from "@/lib/notifications";
import { TYPES_AT } from "@/lib/accidents";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  const l = await prisma.accidentTravail.findMany({
    where: { salarieId: s.salarie.id },
    select: { id: true, type: true, dateAccident: true, heure: true, lieu: true, circonstances: true, statut: true, createdAt: true },
    orderBy: { dateAccident: "desc" },
    take: 20,
  });
  return NextResponse.json(l);
}

export async function POST(request: NextRequest) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  if (!aDroit(s.utilisateur.entreprise?.permissions, "espace.absences")) return NextResponse.json({ erreur: "Fonction non activée par votre employeur." }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const d = champsDeclaration(b);
  if (!(d.dateAccident instanceof Date)) return NextResponse.json({ erreur: "Indiquez la date de l'accident." }, { status: 400 });
  if (d.dateAccident.getTime() > Date.now() + 86400000) return NextResponse.json({ erreur: "La date de l'accident ne peut pas être dans le futur." }, { status: 400 });
  if (!d.circonstances) return NextResponse.json({ erreur: "Décrivez ce qui s'est passé." }, { status: 400 });
  const entrepriseId = s.utilisateur.entrepriseId!;
  const recent = await prisma.accidentTravail.count({ where: { salarieId: s.salarie.id, createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recent) return NextResponse.json({ erreur: "Votre déclaration vient d'être envoyée." }, { status: 429 });

  const at = await prisma.accidentTravail.create({
    data: { ...(d as object), dateAccident: d.dateAccident, entrepriseId, salarieId: s.salarie.id, declarePar: "SALARIE", auteur: `${s.salarie.prenom} ${s.salarie.nom}`, statut: "A_DECLARER", connuLe: new Date() } as Parameters<typeof prisma.accidentTravail.create>[0]["data"],
  });
  const nom = `${s.salarie.prenom} ${s.salarie.nom}`;
  const lignes = [
    `${nom} a déclaré un ${(TYPES_AT[at.type] ?? "accident").toLowerCase()} survenu le ${at.dateAccident.toLocaleDateString("fr-FR")}${at.heure ? ` à ${at.heure}` : ""}.`,
    "Vous devez le déclarer à la CPAM dans les 48 heures (dimanches et jours fériés non compris). Toutes les informations sont dans Gestion RH › Accidents du travail.",
  ];
  await notifierClients(entrepriseId, { sujet: `Accident déclaré par ${nom}`, titre: "🩹 Accident du travail à déclarer", lignes, lien: "/client/salaries/accidents" });
  await notifierAdmin({ sujet: `Accident déclaré par ${nom}`, titre: "🩹 Accident du travail déclaré par un salarié", lignes, lien: "/admin/salaries/accidents", entrepriseId });
  return NextResponse.json({ succes: true, id: at.id });
}
