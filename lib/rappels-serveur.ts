import { prisma } from "@/lib/prisma";
import {
  FENETRE_DASHBOARD_JOURS,
  aujourdhuiISO,
  joursAvant,
  libelleRappel,
  statutRappel,
  typeDe,
  versISO,
  type Echeance,
} from "@/lib/rappels";

const JOUR = 86400000;

/** Échéances à traiter : retards + 60 prochains jours (rappels saisis + fins de contrat) */
export async function chargerEcheances(options: { entrepriseId?: string; sansDemo?: boolean } = {}): Promise<Echeance[]> {
  const aujourdhui = Date.parse(`${aujourdhuiISO()}T00:00:00Z`);
  const limite = new Date(aujourdhui + FENETRE_DASHBOARD_JOURS * JOUR);
  const debutRetard = new Date(aujourdhui - 30 * JOUR);
  const filtre = options.entrepriseId ? { entrepriseId: options.entrepriseId } : {};
  // sansDemo : exclut la démo ET les entreprises suspendues
  const sansDemo = options.sansDemo ? { entreprise: { demo: false, actif: true } } : {};

  // Les deux requêtes partent en même temps
  const [rappels, fins] = await Promise.all([
    prisma.rappelSalarie.findMany({
      where: { traite: false, dateEcheance: { lte: limite }, salarie: { statut: "Actif", ...filtre, ...sansDemo } },
      include: { salarie: { include: { entreprise: true } } },
      orderBy: { dateEcheance: "asc" },
      take: 500,
    }),
    prisma.salarie.findMany({
      where: { statut: "Actif", dateFin: { gte: debutRetard, lte: limite }, ...filtre, ...sansDemo },
      include: { entreprise: true },
      take: 500,
    }),
  ]);

  const liste: Echeance[] = [];

  for (const r of rappels) {
    const jours = joursAvant(r.dateEcheance);
    liste.push({
      cle: r.id,
      salarieId: r.salarieId,
      salarie: `${r.salarie.prenom} ${r.salarie.nom}`,
      entreprise: r.salarie.entreprise.nom,
      label: libelleRappel(r),
      icone: typeDe(r.type).icone,
      date: versISO(r.dateEcheance),
      jours,
      statut: statutRappel(jours),
      auto: false,
    });
  }

  for (const s of fins) {
    if (!s.dateFin) continue;
    const jours = joursAvant(s.dateFin);
    liste.push({
      cle: `fin-${s.id}`,
      salarieId: s.id,
      salarie: `${s.prenom} ${s.nom}`,
      entreprise: s.entreprise.nom,
      label: `Fin de contrat${s.typeContrat ? ` (${s.typeContrat})` : ""}`,
      icone: "⏳",
      date: versISO(s.dateFin),
      jours,
      statut: statutRappel(jours),
      auto: true,
    });
  }

  return liste.sort((a, b) => a.jours - b.jours);
}
