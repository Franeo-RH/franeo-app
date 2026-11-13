import { NextRequest, NextResponse } from "next/server";
import { excelDepuisLignes, reponseExcel } from "@/lib/excel-marque";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { jourParis, TYPES_POINTAGE } from "@/lib/badge";
import { presencesDuJour } from "@/lib/presences";

/**
 * GET ?jour=AAAA-MM-JJ : présences de toute l'entreprise (client).
 * GET ?du=&au=&format=csv : extraction de tous les pointages de la période.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (!aDroit(session.entreprise?.permissions, "espace.badge")) return NextResponse.json({ erreur: "Le badge n'est pas activé." }, { status: 403 });
  const p = request.nextUrl.searchParams;
  const ok = (x: string | null) => !!x && /^\d{4}-\d{2}-\d{2}$/.test(x);

  if (p.get("format") === "csv" && ok(p.get("du")) && ok(p.get("au"))) {
    const l = await prisma.pointage.findMany({
      where: { entrepriseId: session.entrepriseId, jour: { gte: p.get("du")!, lte: p.get("au")! } },
      include: { salarie: { select: { prenom: true, nom: true } } },
      orderBy: [{ jour: "asc" }, { at: "asc" }],
    });
    const lignes = [["Date", "Heure", "Salarié", "Pointage", "Adresse du pointage"], ...l.map((x) => [
      x.jour.split("-").reverse().join("/"), x.at.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }),
      `${x.salarie.prenom} ${x.salarie.nom}`, TYPES_POINTAGE[x.type as keyof typeof TYPES_POINTAGE]?.label ?? x.type,
      x.adresse ?? "",
    ])];
    return reponseExcel(await excelDepuisLignes("Pointages", lignes, { entrepriseId: session.entrepriseId }), `pointages-${p.get("du")}-${p.get("au")}`);
  }

  const aujourdhui = jourParis();
  const jour = ok(p.get("jour")) ? p.get("jour")! : aujourdhui;
  const salaries = await prisma.salarie.findMany({ where: { entrepriseId: session.entrepriseId, statut: "Actif", compte: { isNot: null } }, select: { id: true } });
  return NextResponse.json({ jour, lignes: await presencesDuJour(salaries.map((s) => s.id), jour, aujourdhui) });
}
