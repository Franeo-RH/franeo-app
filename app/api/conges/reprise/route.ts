// app/api/conges/reprise/route.ts
// GET  : salariés BTP et leur solde de reprise ; ?format=xlsx → modèle Excel à remplir
// POST { date, lignes: [{ salarieId, reste, enCours }] } : enregistre les soldes de reprise

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesReprise, jours, salariesBTP } from "@/lib/conges-reprise";
import { excelDepuisLignes, reponseExcel } from "@/lib/excel-marque";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const a = await accesReprise(request, false);
  if (!a.ok) return a.refus;
  const liste = await salariesBTP(a.entrepriseId, a.filtre);
  if (request.nextUrl.searchParams.get("format") === "xlsx") {
    const lignes = [
      ["Matricule", "Nom", "Prénom", "Reste à prendre (jours)", "Acquis en cours (jours)"],
      ...liste.map((s) => [s.matricule ?? "", s.nom, s.prenom, s.congesRepriseReste ?? "", s.congesRepriseEnCours ?? ""]),
    ];
    return reponseExcel(await excelDepuisLignes("Reprise congés", lignes), "reprise-conges-btp");
  }
  return NextResponse.json(liste);
}

export async function POST(request: NextRequest) {
  const b = await request.json().catch(() => ({}));
  const a = await accesReprise(request, true, b.entrepriseId);
  if (!a.ok) return a.refus;
  const date = typeof b.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? new Date(`${b.date}T00:00:00Z`) : null;
  if (!date || date > new Date()) return NextResponse.json({ erreur: "Date de reprise invalide (elle ne peut pas être dans le futur)." }, { status: 400 });
  const autorises = new Set((await salariesBTP(a.entrepriseId, a.filtre)).map((s) => s.id));
  const lignes = Array.isArray(b.lignes) ? (b.lignes as { salarieId?: unknown; reste?: unknown; enCours?: unknown }[]) : [];
  const erreurs: string[] = [];
  let maj = 0;
  for (const l of lignes.slice(0, 2000)) {
    const id = String(l.salarieId ?? "");
    if (!autorises.has(id)) continue;
    const reste = jours(l.reste), enCours = jours(l.enCours);
    if (Number.isNaN(reste) || Number.isNaN(enCours)) { erreurs.push(id); continue; }
    const vide = reste === null && enCours === null;
    await prisma.salarie.update({
      where: { id },
      data: vide ? { congesRepriseDate: null, congesRepriseReste: null, congesRepriseEnCours: null } : { congesRepriseDate: date, congesRepriseReste: reste ?? 0, congesRepriseEnCours: enCours ?? 0 },
    });
    maj++;
  }
  return NextResponse.json({ succes: true, maj, erreurs: erreurs.length });
}
