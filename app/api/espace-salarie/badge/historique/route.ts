import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { heuresDuJour } from "@/lib/badge";

/** GET : mes pointages des 14 derniers jours, regroupés par jour (tableau de bord du salarié) */
export async function GET() {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  if (!aDroit(s.utilisateur.entreprise?.permissions, "espace.badge")) return NextResponse.json([]);
  const depuis = new Date(Date.now() - 14 * 86400000);
  const l = await prisma.pointage.findMany({ where: { salarieId: s.salarie.id, at: { gte: depuis } }, orderBy: { at: "asc" }, select: { type: true, at: true, jour: true, dansZone: true, motif: true } });
  const jours = [...new Set(l.map((x) => x.jour))].sort().reverse();
  return NextResponse.json(jours.map((j) => {
    const p = l.filter((x) => x.jour === j);
    return { jour: j, pointages: p, heures: heuresDuJour(p) };
  }));
}
