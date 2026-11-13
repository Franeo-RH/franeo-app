import { NextRequest, NextResponse } from "next/server";
import { excelDepuisLignes, reponseExcel } from "@/lib/excel-marque";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";
import { contexteHierarchie } from "@/lib/hierarchie";
import { LIBELLES_ABSENCE } from "@/lib/espace-salarie";
import { NOMS_MOIS } from "@/lib/heures";

const csv = (lignes: (string | number | null | undefined)[][]) =>
  "﻿" + lignes.map((l) => l.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
const fr = (d: Date) => new Date(d).toLocaleDateString("fr-FR");

/** GET ?type=absences|releves|frais|equipe : extraction de l'équipe d'un manager ou dirigeant (fichier CSV lisible par Excel) */
export async function GET(request: NextRequest) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  const ctx = await contexteHierarchie(s.salarie.id);
  if (!ctx || ctx.role === "SALARIE") return NextResponse.json({ erreur: "Réservé aux managers et dirigeants." }, { status: 403 });
  const ids = [...ctx.equipeIds];
  const type = request.nextUrl.searchParams.get("type") || "absences";
  let lignes: (string | number | null | undefined)[][] = [];

  if (type === "equipe") {
    lignes = [["Nom", "Prénom", "Poste", "Service", "Rôle", ...(ctx.voitSalaires ? ["Salaire mensuel"] : [])]];
    for (const m of ctx.equipe) lignes.push([m.nom, m.prenom, m.poste, m.service, m.roleRH, ...(ctx.voitSalaires ? [m.salaireMensuel] : [])]);
  } else if (type === "releves") {
    const r = await prisma.releveMois.findMany({ where: { salarieId: { in: ids } }, include: { salarie: true, jours: true }, orderBy: [{ annee: "desc" }, { mois: "desc" }] });
    lignes = [["Salarié", "Mois", "Statut", "Heures", "Heures supp.", "Commentaire"]];
    for (const x of r) lignes.push([`${x.salarie.prenom} ${x.salarie.nom}`, `${NOMS_MOIS[x.mois - 1]} ${x.annee}`, x.statut, x.jours.reduce((a, j) => a + (j.heures || 0), 0), x.jours.reduce((a, j) => a + j.heuresSupp, 0), x.commentaire]);
  } else if (type === "frais") {
    const f = await prisma.noteFrais.findMany({ where: { salarieId: { in: ids } }, include: { salarie: true }, orderBy: { date: "desc" } });
    lignes = [["Salarié", "Date", "Montant (€)", "Motif", "Statut"]];
    for (const x of f) lignes.push([`${x.salarie.prenom} ${x.salarie.nom}`, fr(x.date), x.montant, x.motif, x.statut]);
  } else {
    const a = await prisma.absence.findMany({ where: { salarieId: { in: ids } }, include: { salarie: true }, orderBy: { dateDebut: "desc" } });
    lignes = [["Salarié", "Type", "Du", "Au", "Statut", "Commentaire"]];
    for (const x of a) lignes.push([`${x.salarie.prenom} ${x.salarie.nom}`, LIBELLES_ABSENCE[x.type] || x.type, fr(x.dateDebut), fr(x.dateFin), x.statut, x.commentaire]);
  }
  void csv;
  return reponseExcel(await excelDepuisLignes(`Équipe ${type}`, lignes, { entrepriseId: s.utilisateur.entrepriseId }), `equipe-${type}`);
}
