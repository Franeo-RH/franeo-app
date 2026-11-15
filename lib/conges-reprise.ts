// lib/conges-reprise.ts
// Solde de départ des congés : qui peut le voir / le modifier, et quels salariés sont concernés

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { filtreSalaries } from "@/lib/perimetre";
import { estBTP } from "@/lib/conges";
import { congesDe } from "@/lib/conges-serveur";

export async function accesReprise(request: NextRequest, ecriture: boolean, entrepriseIdCorps?: unknown) {
  const session = await getSession();
  if (!session) return { ok: false as const, refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  if (session.role === "ADMIN") {
    const entrepriseId = String(entrepriseIdCorps || request.nextUrl.searchParams.get("entrepriseId") || "");
    if (!entrepriseId) return { ok: false as const, refus: NextResponse.json({ erreur: "Entreprise manquante" }, { status: 400 }) };
    return { ok: true as const, session, entrepriseId, filtre: {} };
  }
  if (session.role !== "CLIENT" || !session.entrepriseId) return { ok: false as const, refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  if (ecriture && !aDroit(session.entreprise?.permissions, "salaries.modifier")) {
    return { ok: false as const, refus: NextResponse.json({ erreur: "Vous n'avez pas le droit de modifier les salariés." }, { status: 403 }) };
  }
  return { ok: true as const, session, entrepriseId: session.entrepriseId, filtre: filtreSalaries(session) };
}

/** Salariés actifs de l'entreprise, avec leur solde de départ et leur solde calculé */
export async function salariesConges(entrepriseId: string, filtre: object) {
  const [entreprise, salaries] = await Promise.all([
    prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { ccn: true } }),
    prisma.salarie.findMany({
      where: { entrepriseId, ...filtre, statut: "Actif", OR: [{ dateFin: null }, { dateFin: { gte: new Date() } }] },
      select: { id: true, matricule: true, nom: true, prenom: true, conventionCollective: true, congesRepriseDate: true, congesRepriseReste: true, congesRepriseEnCours: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
  ]);
  const calc = await congesDe(salaries.map((s) => s.id));
  return salaries.map((s) => {
    const c = calc.get(s.id);
    return {
      ...s, btp: estBTP(s.conventionCollective, entreprise?.ccn),
      congesRepriseDate: c?.reprise?.date ?? s.congesRepriseDate, congesRepriseReste: c?.reprise?.reste ?? s.congesRepriseReste, congesRepriseEnCours: c?.reprise?.enCours ?? s.congesRepriseEnCours,
      reste: c?.reste ?? 0, enCours: c?.enCours.acquis ?? 0, pris: c?.pris ?? 0,
    };
  });
}

/** Nombre de jours saisi (vide = pas de valeur) */
export function jours(v: unknown): number | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) && n >= 0 && n <= 90 ? Math.round(n * 100) / 100 : NaN;
}
