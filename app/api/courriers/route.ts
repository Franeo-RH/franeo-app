// app/api/courriers/route.ts
// GET  : modèles visibles + salariés et entreprise (pour remplir les champs automatiquement)
// POST : nouveau modèle (client : pour son entreprise ; admin : pour tous les clients)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { filtreSalaries } from "@/lib/perimetre";
import { accesCourriers, lireModele, modelesVisibles } from "@/lib/courriers-serveur";
import type { EntrepriseCourrier, SalarieCourrier } from "@/lib/courriers";

export const dynamic = "force-dynamic";

export async function GET() {
  const a = await accesCourriers();
  if (!a.ok) return a.refus;
  const modeles = await modelesVisibles(a.entrepriseId);
  if (!a.entrepriseId) return NextResponse.json({ modeles, salaries: [], entreprise: null, admin: true });

  const [salaries, e] = await Promise.all([
    prisma.salarie.findMany({
      where: { entrepriseId: a.entrepriseId, anonymiseLe: null, ...filtreSalaries(a.session) },
      select: { id: true, prenom: true, nom: true, poste: true, typeContrat: true, dateDebut: true, dateFin: true, dateNaissance: true, rue: true, codePostal: true, ville: true, heuresHebdomadaires: true, matricule: true, email: true, statut: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
    prisma.entreprise.findUnique({ where: { id: a.entrepriseId }, select: { nom: true, rue: true, codePostal: true, ville: true, siret: true, telephone: true, email: true, logoClient: { select: { entrepriseId: true } } } }),
  ]);
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  const listeSalaries: (SalarieCourrier & { actif: boolean })[] = salaries.map((s) => ({
    id: s.id, prenom: s.prenom, nom: s.nom, poste: s.poste, typeContrat: s.typeContrat, dateDebut: iso(s.dateDebut), dateFin: iso(s.dateFin), dateNaissance: iso(s.dateNaissance),
    rue: s.rue, codePostal: s.codePostal, ville: s.ville, heuresHebdomadaires: s.heuresHebdomadaires, matricule: s.matricule, email: s.email, actif: s.statut === "Actif",
  }));
  const entreprise: EntrepriseCourrier | null = e ? { nom: e.nom, rue: e.rue, codePostal: e.codePostal, ville: e.ville, siret: e.siret, telephone: e.telephone, email: e.email, logo: !!e.logoClient } : null;
  return NextResponse.json({ modeles, salaries: listeSalaries, entreprise, admin: false });
}

export async function POST(request: NextRequest) {
  const a = await accesCourriers();
  if (!a.ok) return a.refus;
  const lu = lireModele(await request.json().catch(() => ({})));
  if ("erreur" in lu) return NextResponse.json({ erreur: lu.erreur }, { status: 400 });
  const m = await prisma.modeleCourrier.create({ data: { ...lu.data, entrepriseId: a.entrepriseId, auteur: a.session.prenom } });
  return NextResponse.json({ succes: true, id: m.id });
}
