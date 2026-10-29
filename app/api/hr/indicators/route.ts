import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFiltres } from "@/lib/indicateurs-acces";
import { calculerIndicateurs, lignesDetail, paginer, VUES, type Vue } from "@/lib/indicateurs-rh";

export const dynamic = "force-dynamic";

/**
 * GET /api/hr/indicators
 * Filtres : period (aujourdhui | mois | mois-precedent | annee | annee-precedente | personnalisee), startDate, endDate,
 *           companyId, establishmentId, departmentId, employeeId, contractType, status
 * Tableau détaillé (facultatif) : view, page, pageSize, q, sort, dir, col, val
 * options=1 : renvoie aussi les listes pour les filtres (sociétés, établissements, services, salariés)
 */
export async function GET(request: NextRequest) {
  const r = await lireFiltres(request);
  if ("erreur" in r) return r.erreur;
  const { filtres, admin } = r;
  const p = request.nextUrl.searchParams;

  const vue = (p.get("view") || "") as Vue;
  const [indicateurs, detail, options] = await Promise.all([
    calculerIndicateurs(filtres),
    vue && vue in VUES
      ? lignesDetail(filtres, vue).then(({ colonnes, lignes }) => {
          const pg = paginer(lignes, { q: p.get("q"), tri: p.get("sort"), sens: p.get("dir"), page: Number(p.get("page")) || 1, parPage: Number(p.get("pageSize")) || 20, colonne: p.get("col"), valeur: p.get("val") });
          return { vue, colonnes, lignes: pg.lignes, total: pg.total, page: pg.page, parPage: pg.parPage };
        })
      : Promise.resolve(null),
    p.get("options") === "1"
      ? (async () => {
          const ents = admin && !p.get("companyId")
            ? await prisma.entreprise.findMany({ where: { demo: false }, select: { id: true, nom: true }, orderBy: { nom: "asc" } })
            : await prisma.entreprise.findMany({ where: { id: { in: filtres.entreprises } }, select: { id: true, nom: true } });
          const sal = await prisma.salarie.findMany({
            where: { entrepriseId: { in: filtres.entreprises } },
            select: { id: true, nom: true, prenom: true, etablissement: true, service: true },
            orderBy: [{ nom: "asc" }],
          });
          return {
            societes: admin ? (await prisma.entreprise.findMany({ where: { demo: false }, select: { id: true, nom: true }, orderBy: { nom: "asc" } })) : ents,
            etablissements: [...new Set(sal.map((s) => s.etablissement).filter(Boolean))].sort(),
            services: [...new Set(sal.map((s) => s.service).filter(Boolean))].sort(),
            salaries: sal.map((s) => ({ id: s.id, nom: `${s.prenom} ${s.nom}` })),
          };
        })()
      : Promise.resolve(null),
  ]);

  return NextResponse.json({ ...indicateurs, detail, options, admin });
}
