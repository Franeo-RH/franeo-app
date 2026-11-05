import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";
import { contexteHierarchie } from "@/lib/hierarchie";
import { chargerReleve } from "@/lib/releves";

/** GET : ce que le salarié connecté voit de son organisation (N+1, direction) et, pour un manager ou dirigeant, son équipe à valider */
export async function GET() {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  const ctx = await contexteHierarchie(s.salarie.id);
  if (!ctx) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const ids = [...ctx.equipeIds];

  const [releves, absences, frais] = await Promise.all([
    prisma.releveMois.findMany({ where: { salarieId: { in: ids }, statut: "Envoyé" }, include: { salarie: { select: { prenom: true, nom: true } } }, orderBy: { envoyeAt: "asc" } }),
    prisma.absence.findMany({ where: { salarieId: { in: ids }, statut: "En attente" }, include: { salarie: { select: { prenom: true, nom: true } } }, orderBy: { dateDebut: "asc" } }),
    prisma.noteFrais.findMany({ where: { salarieId: { in: ids }, statut: "En attente" }, include: { salarie: { select: { prenom: true, nom: true } } }, orderBy: { date: "asc" } }),
  ]);
  const detailsReleves = await Promise.all(releves.map((r) => chargerReleve(r.salarieId, r.mois, r.annee)));

  return NextResponse.json({
    role: ctx.role,
    n1: ctx.n1,
    direction: ctx.direction,
    voitSalaires: ctx.voitSalaires,
    peutSaisirVariables: ctx.peutSaisirVariables,
    equipe: ctx.equipe,
    releves: releves.map((r, i) => ({ id: r.id, salarie: r.salarie, ...detailsReleves[i] })),
    absences: absences.map((a) => ({ id: a.id, type: a.type, dateDebut: a.dateDebut, dateFin: a.dateFin, commentaire: a.commentaire, salarie: a.salarie })),
    frais: frais.map((f) => ({ id: f.id, date: f.date, montant: f.montant, motif: f.motif, salarie: f.salarie })),
  });
}
