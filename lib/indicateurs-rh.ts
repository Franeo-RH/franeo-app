// Indicateurs RH : agrégats calculés côté serveur, en un petit nombre de requêtes (pas de N+1), avec cache court.
import { prisma } from "@/lib/prisma";
import {
  anciennete, arrondi, chevauchement, contratsBase, decoupage, familleContrat, fenetreMensuelle, joursOuvres, moisDeLaPeriode, pct, present, type Periode,
} from "@/lib/indicateurs-calculs";

export type FiltresRH = {
  periode: Periode;
  entreprises: string[]; // périmètre autorisé (client : la sienne ; admin : toutes ou celle choisie)
  etablissement?: string | null;
  service?: string | null;
  salarieId?: string | null;
  contrat?: string | null;
  statut?: "Actif" | "Sorti" | null;
};

const LIBELLES_ABS: Record<string, string> = {
  CONGE_PAYE: "Congés payés", RTT: "RTT", CONGE_SANS_SOLDE: "Sans solde", CONGE_EXCEPTIONNEL: "Exceptionnel",
  CONGE_NAISSANCE: "Naissance", MATERNITE_PATERNITE: "Maternité / paternité", MALADIE: "Maladie", ABSENCE_NON_REMUNEREE: "Non rémunérée",
};
const CONGES = ["CONGE_PAYE", "RTT"];

// Cache mémoire de 60 s : les mêmes filtres ne relancent pas les calculs
const cache = new Map<string, { t: number; v: unknown }>();
const DUREE_CACHE = 60_000;
function enCache<T>(cle: string, calcul: () => Promise<T>): Promise<T> {
  const c = cache.get(cle);
  if (c && Date.now() - c.t < DUREE_CACHE) return Promise.resolve(c.v as T);
  return calcul().then((v) => {
    cache.set(cle, { t: Date.now(), v });
    if (cache.size > 200) cache.delete(cache.keys().next().value as string);
    return v;
  });
}

/** Salariés du périmètre filtré (une requête) */
export async function salariesFiltres(f: FiltresRH) {
  const contrats = contratsBase(f.contrat ?? null);
  const liste = await prisma.salarie.findMany({
    where: {
      entrepriseId: { in: f.entreprises },
      ...(f.etablissement ? { etablissement: f.etablissement } : {}),
      ...(f.service ? { service: f.service } : {}),
      ...(f.salarieId ? { id: f.salarieId } : {}),
      ...(contrats ? { typeContrat: { in: contrats } } : {}),
      // présent à un moment de la période
      AND: [{ OR: [{ dateDebut: null }, { dateDebut: { lte: f.periode.fin } }] }, { OR: [{ dateFin: null }, { dateFin: { gte: f.periode.debut } }] }],
    },
    select: {
      id: true, nom: true, prenom: true, matricule: true, poste: true, typeContrat: true, dateDebut: true, dateFin: true,
      etablissement: true, service: true, soldeConges: true, salaireMensuel: true, entrepriseId: true, entreprise: { select: { nom: true } },
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });
  if (f.statut === "Actif") return liste.filter((s) => !s.dateFin || s.dateFin > f.periode.fin);
  if (f.statut === "Sorti") return liste.filter((s) => s.dateFin && s.dateFin <= f.periode.fin);
  return liste;
}

export async function calculerIndicateurs(f: FiltresRH) {
  const cle = JSON.stringify({ ...f, periode: [f.periode.debut.toISOString(), f.periode.fin.toISOString()] });
  return enCache(cle, () => calcul(f));
}

async function calcul(f: FiltresRH) {
  const p = f.periode;
  const salaries = await salariesFiltres(f);
  const ids = salaries.map((s) => s.id);
  const mois = moisDeLaPeriode(p);
  const moisFenetre = moisDeLaPeriode(fenetreMensuelle(p));
  const filtreMois = { OR: moisFenetre.map((m) => ({ mois: m.mois, annee: m.annee })) };
  const dansPeriode = (v: { mois: number; annee: number }) => mois.some((m) => m.mois === v.mois && m.annee === v.annee);
  const aujourdhui = new Date();

  // Toutes les données en parallèle, filtrées par la liste des salariés (pas de requête par salarié)
  const ok = ids.length > 0;
  const [absences, variables, entretiens, formations, teletravail, entreprises, enAttente] = await Promise.all([
    ok ? prisma.absence.findMany({
      where: { salarieId: { in: ids }, statut: { not: "Refusé" }, dateDebut: { lte: p.fin }, dateFin: { gte: p.debut } },
      select: { salarieId: true, type: true, dateDebut: true, dateFin: true },
    }) : Promise.resolve([] as { salarieId: string; type: string; dateDebut: Date; dateFin: Date }[]),
    ok ? prisma.variablePaie.findMany({
      where: { salarieId: { in: ids }, type: { in: ["HEURE_SUPPLEMENTAIRE", "PRIME"] }, ...filtreMois },
      select: { salarieId: true, type: true, valeur: true, mois: true, annee: true },
    }) : Promise.resolve([] as { salarieId: string; type: string; valeur: number; mois: number; annee: number }[]),
    ok ? prisma.rappelSalarie.findMany({
      where: { salarieId: { in: ids }, type: { in: ["ENTRETIEN_ANNUEL", "ENTRETIEN_PRO"] }, dateEcheance: { gte: p.debut, lte: p.fin } },
      select: { traite: true },
    }) : Promise.resolve([] as { traite: boolean }[]),
    ok ? prisma.formation.findMany({ where: { salarieId: { in: ids }, date: { gte: p.debut, lte: p.fin } }, select: { heures: true, cout: true, date: true } })
      : Promise.resolve([] as { heures: number; cout: number; date: Date }[]),
    ok ? prisma.releveJour.findMany({ where: { teletravail: true, date: { gte: p.debut, lte: p.fin }, releve: { salarieId: { in: ids } } }, select: { date: true } })
      : Promise.resolve([] as { date: Date }[]),
    ok ? prisma.entreprise.findMany({ where: { id: { in: [...new Set(salaries.map((s) => s.entrepriseId))] } }, select: { budgetPrimesAnnuel: true, budgetFormationAnnuel: true } })
      : Promise.resolve([] as { budgetPrimesAnnuel: number | null; budgetFormationAnnuel: number | null }[]),
    ok ? prisma.absence.count({ where: { salarieId: { in: ids }, statut: "En attente", type: { in: ["CONGE_PAYE", "RTT"] } } }) : Promise.resolve(0),
  ]);

  // ── Effectif (à la fin de la période) ──
  const presents = salaries.filter((s) => present(s, p.fin));
  const parContrat = { CDI: 0, CDD: 0, Alternant: 0, Stagiaire: 0, Autre: 0 };
  for (const s of presents) parContrat[familleContrat(s.typeContrat)]++;
  const anc = presents.length ? presents.reduce((a, s) => a + anciennete(s.dateDebut, p.fin), 0) / presents.length : 0;

  // ── Mouvements ──
  const entrees = salaries.filter((s) => s.dateDebut && s.dateDebut >= p.debut && s.dateDebut <= p.fin).length;
  const sorties = salaries.filter((s) => s.dateFin && s.dateFin >= p.debut && s.dateFin <= p.fin).length;

  // ── Absences ──
  let joursAbsence = 0;
  let ouvresAbsence = 0;
  const parMotif: Record<string, number> = {};
  for (const a of absences) {
    const c = chevauchement(a, p);
    joursAbsence += c.calendaires;
    ouvresAbsence += c.ouvres;
    const l = LIBELLES_ABS[a.type] || a.type;
    parMotif[l] = (parMotif[l] || 0) + c.calendaires;
  }
  // Taux d'absentéisme = jours ouvrés d'absence / jours ouvrés théoriques (effectif moyen × jours ouvrés)
  const ouvresPeriode = joursOuvres(p.debut, p.fin);
  const effectifMoyen = mois.length ? mois.reduce((a, m) => a + salaries.filter((s) => present(s, m.fin < p.fin ? m.fin : p.fin)).length, 0) / mois.length : presents.length;
  const tauxAbs = pct(ouvresAbsence, effectifMoyen * ouvresPeriode);

  // ── Congés ──
  const soldes = presents.filter((s) => s.soldeConges !== null);
  const aVenir = absences.filter((a) => CONGES.includes(a.type) && a.dateDebut > aujourdhui);
  const joursPlanifies = aVenir.reduce((a, x) => a + chevauchement(x, { debut: aujourdhui, fin: new Date(aujourdhui.getFullYear() + 2, 0, 1) }).ouvres, 0);

  // ── Heures supp et primes ──
  const hsFenetre = variables.filter((v) => v.type === "HEURE_SUPPLEMENTAIRE");
  const primesFenetre = variables.filter((v) => v.type === "PRIME");
  const hs = hsFenetre.filter(dansPeriode);
  const primes = primesFenetre.filter(dansPeriode);
  const totalHS = hs.reduce((a, v) => a + v.valeur, 0);
  const totalPrimes = primes.reduce((a, v) => a + v.valeur, 0);
  const prorata = mois.length / 12;
  const budgetPrimes = entreprises.reduce((a, e) => a + (e.budgetPrimesAnnuel ?? 0), 0) * prorata;
  const budgetFormation = entreprises.reduce((a, e) => a + (e.budgetFormationAnnuel ?? 0), 0) * prorata;

  // ── Entretiens et formation ──
  const faits = entretiens.filter((e) => e.traite).length;
  const heuresFormation = formations.reduce((a, x) => a + x.heures, 0);
  const coutFormation = formations.reduce((a, x) => a + x.cout, 0);

  // ── Séries pour les graphiques : découpage adapté à la période filtrée ──
  const { granularite, tranches } = decoupage(p);
  const series = {
    granularite,
    points: tranches.map((t) => ({
      label: t.libelle,
      effectif: salaries.filter((s) => present(s, t.fin)).length,
      absences: absences.reduce((a, x) => a + chevauchement(x, t).calendaires, 0),
      entrees: salaries.filter((s) => s.dateDebut && s.dateDebut >= t.debut && s.dateDebut <= t.fin).length,
      sorties: salaries.filter((s) => s.dateFin && s.dateFin >= t.debut && s.dateFin <= t.fin).length,
      teletravail: teletravail.filter((j) => j.date >= t.debut && j.date <= t.fin).length,
    })),
  };
  // Primes et heures supp sont saisies au mois : courbe sur au moins 12 mois jusqu'à la fin de période
  const mensuel = moisFenetre.map((m) => ({
    label: m.libelle,
    dansPeriode: dansPeriode(m),
    primes: arrondi(primesFenetre.filter((v) => v.mois === m.mois && v.annee === m.annee).reduce((a, v) => a + v.valeur, 0), 2),
    heuresSupp: arrondi(hsFenetre.filter((v) => v.mois === m.mois && v.annee === m.annee).reduce((a, v) => a + v.valeur, 0), 2),
  }));

  // ── Répartitions ──
  const nomDe = new Map(salaries.map((s) => [s.id, `${s.prenom} ${s.nom.charAt(0)}.`]));
  const serviceDe = new Map(salaries.map((s) => [s.id, s.service || "Sans service"]));
  const somme = <T,>(liste: T[], cle: (x: T) => string, val: (x: T) => number) => {
    const m = new Map<string, number>();
    for (const x of liste) m.set(cle(x), (m.get(cle(x)) || 0) + val(x));
    return [...m.entries()].map(([label, valeur]) => ({ label, valeur: arrondi(valeur, 2) })).filter((x) => x.valeur > 0).sort((a, b) => b.valeur - a.valeur);
  };
  const repartitions = {
    contrats: [["CDI", parContrat.CDI], ["CDD", parContrat.CDD], ["Alternants", parContrat.Alternant], ["Stagiaires", parContrat.Stagiaire], ["Autres", parContrat.Autre]]
      .map(([label, valeur]) => ({ label: String(label), valeur: Number(valeur) })).filter((x) => x.valeur > 0),
    effectifParService: somme(presents, (s) => s.service || "Sans service", () => 1),
    effectifParEtablissement: somme(presents, (s) => s.etablissement || "Non renseigné", () => 1),
    absencesParService: somme(absences, (a) => serviceDe.get(a.salarieId) || "Sans service", (a) => chevauchement(a, p).calendaires),
    heuresSuppParSalarie: somme(hs, (v) => nomDe.get(v.salarieId) || "?", (v) => v.valeur).slice(0, 8),
    primesParService: somme(primes, (v) => serviceDe.get(v.salarieId) || "Sans service", (v) => v.valeur),
  };

  return {
    periode: { debut: p.debut.toISOString(), fin: p.fin.toISOString(), joursOuvres: ouvresPeriode },
    workforce: { total: presents.length, cdi: parContrat.CDI, cdd: parContrat.CDD, alternants: parContrat.Alternant, stagiaires: parContrat.Stagiaire, autres: parContrat.Autre, ancienneteMoyenne: arrondi(anc, 1) },
    movements: { entrees, sorties },
    absences: { tauxAbsenteisme: tauxAbs, joursTotal: joursAbsence, joursOuvres: ouvresAbsence, parMotif: Object.entries(parMotif).map(([motif, jours]) => ({ motif, jours })).filter((x) => x.jours > 0).sort((a, b) => b.jours - a.jours) },
    leaveBalances: { soldeTotal: soldes.length ? arrondi(soldes.reduce((a, s) => a + (s.soldeConges ?? 0), 0), 1) : null, salariesAvecSolde: soldes.length, demandesEnAttente: enAttente, joursPlanifies },
    overtime: { heuresTotal: arrondi(totalHS, 2), salaries: new Set(hs.map((v) => v.salarieId)).size, joursTeletravail: teletravail.length },
    bonuses: { total: arrondi(totalPrimes, 2), moyenneParSalarie: presents.length ? arrondi(totalPrimes / presents.length, 2) : 0, budget: budgetPrimes ? arrondi(budgetPrimes, 2) : null, tauxConsommation: budgetPrimes ? pct(totalPrimes, budgetPrimes) : null },
    interviews: { prevus: entretiens.length, realises: faits, pourcentage: pct(faits, entretiens.length) },
    trainings: { heures: arrondi(heuresFormation, 1), cout: arrondi(coutFormation, 2), budget: budgetFormation ? arrondi(budgetFormation, 2) : null, tauxConsommation: budgetFormation ? pct(coutFormation, budgetFormation) : null, nombre: formations.length },
    series,
    mensuel,
    repartitions,
  };
}

// ── Tableau détaillé : colonnes selon la vue, tri, recherche, pagination côté serveur ──
export const VUES = {
  effectif: "Effectif",
  mouvements: "Mouvements",
  absences: "Absences",
  heures: "Heures supplémentaires",
  primes: "Primes",
  formations: "Formations",
  entretiens: "Entretiens",
} as const;
export type Vue = keyof typeof VUES;
type Colonne = { cle: string; label: string; type?: "nombre" | "date" | "texte" };
type Ligne = Record<string, string | number | null>;

const fr = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const nomComplet = (s: { prenom: string; nom: string }) => `${s.prenom} ${s.nom}`;

export async function lignesDetail(f: FiltresRH, vue: Vue): Promise<{ colonnes: Colonne[]; lignes: Ligne[] }> {
  const p = f.periode;
  const salaries = await salariesFiltres(f);
  const ids = salaries.map((s) => s.id);
  const parId = new Map(salaries.map((s) => [s.id, s]));
  const base = (id: string) => {
    const s = parId.get(id)!;
    return { salarie: nomComplet(s), entreprise: s.entreprise.nom, service: s.service ?? "", etablissement: s.etablissement ?? "" };
  };
  const colsBase: Colonne[] = [{ cle: "salarie", label: "Salarié" }, { cle: "entreprise", label: "Société" }, { cle: "etablissement", label: "Établissement" }, { cle: "service", label: "Service" }];
  const filtreMois = { OR: moisDeLaPeriode(p).map((m) => ({ mois: m.mois, annee: m.annee })) };

  switch (vue) {
    case "effectif":
      return {
        colonnes: [...colsBase, { cle: "poste", label: "Poste" }, { cle: "contrat", label: "Contrat" }, { cle: "entree", label: "Entrée", type: "date" }, { cle: "sortie", label: "Sortie", type: "date" }, { cle: "anciennete", label: "Ancienneté (ans)", type: "nombre" }, { cle: "solde", label: "Solde congés (j)", type: "nombre" }, { cle: "id", label: "" }],
        lignes: salaries.map((s) => ({ ...base(s.id), poste: s.poste, contrat: s.typeContrat ?? "", entree: fr(s.dateDebut), sortie: fr(s.dateFin), anciennete: arrondi(anciennete(s.dateDebut, p.fin), 1), solde: s.soldeConges, id: s.id })),
      };
    case "mouvements":
      return {
        colonnes: [...colsBase, { cle: "mouvement", label: "Mouvement" }, { cle: "date", label: "Date", type: "date" }, { cle: "contrat", label: "Contrat" }, { cle: "poste", label: "Poste" }],
        lignes: salaries.flatMap((s) => [
          ...(s.dateDebut && s.dateDebut >= p.debut && s.dateDebut <= p.fin ? [{ ...base(s.id), mouvement: "Entrée", date: fr(s.dateDebut), contrat: s.typeContrat ?? "", poste: s.poste }] : []),
          ...(s.dateFin && s.dateFin >= p.debut && s.dateFin <= p.fin ? [{ ...base(s.id), mouvement: "Sortie", date: fr(s.dateFin), contrat: s.typeContrat ?? "", poste: s.poste }] : []),
        ]),
      };
    case "absences": {
      const rows = ids.length ? await prisma.absence.findMany({ where: { salarieId: { in: ids }, dateDebut: { lte: p.fin }, dateFin: { gte: p.debut } }, select: { salarieId: true, type: true, dateDebut: true, dateFin: true, statut: true } }) : [];
      return {
        colonnes: [...colsBase, { cle: "motif", label: "Motif" }, { cle: "debut", label: "Du", type: "date" }, { cle: "fin", label: "Au", type: "date" }, { cle: "jours", label: "Jours (période)", type: "nombre" }, { cle: "statut", label: "Statut" }],
        lignes: rows.map((a) => ({ ...base(a.salarieId), motif: LIBELLES_ABS[a.type] || a.type, debut: fr(a.dateDebut), fin: fr(a.dateFin), jours: chevauchement(a, p).calendaires, statut: a.statut })),
      };
    }
    case "heures":
    case "primes": {
      const type = vue === "heures" ? "HEURE_SUPPLEMENTAIRE" : "PRIME";
      const rows = ids.length ? await prisma.variablePaie.findMany({ where: { salarieId: { in: ids }, type, ...filtreMois }, select: { salarieId: true, valeur: true, mois: true, annee: true, statut: true, commentaire: true } }) : [];
      return {
        colonnes: [...colsBase, { cle: "mois", label: "Mois" }, { cle: "valeur", label: vue === "heures" ? "Heures" : "Montant (€)", type: "nombre" }, { cle: "statut", label: "Statut" }, { cle: "commentaire", label: "Commentaire" }],
        lignes: rows.map((v) => ({ ...base(v.salarieId), mois: `${v.annee}-${String(v.mois).padStart(2, "0")}`, valeur: v.valeur, statut: v.statut, commentaire: v.commentaire ?? "" })),
      };
    }
    case "formations": {
      const rows = ids.length ? await prisma.formation.findMany({ where: { salarieId: { in: ids }, date: { gte: p.debut, lte: p.fin } }, select: { id: true, salarieId: true, intitule: true, date: true, heures: true, cout: true } }) : [];
      return {
        colonnes: [...colsBase, { cle: "intitule", label: "Formation" }, { cle: "date", label: "Date", type: "date" }, { cle: "heures", label: "Heures", type: "nombre" }, { cle: "cout", label: "Coût (€)", type: "nombre" }, { cle: "id", label: "" }],
        lignes: rows.map((x) => ({ ...base(x.salarieId), intitule: x.intitule, date: fr(x.date), heures: x.heures, cout: x.cout, id: x.id })),
      };
    }
    case "entretiens": {
      const rows = ids.length ? await prisma.rappelSalarie.findMany({ where: { salarieId: { in: ids }, type: { in: ["ENTRETIEN_ANNUEL", "ENTRETIEN_PRO"] }, dateEcheance: { gte: p.debut, lte: p.fin } }, select: { salarieId: true, type: true, dateEcheance: true, traite: true, traiteAt: true } }) : [];
      return {
        colonnes: [...colsBase, { cle: "type", label: "Entretien" }, { cle: "echeance", label: "Échéance", type: "date" }, { cle: "realise", label: "Réalisé" }, { cle: "le", label: "Réalisé le", type: "date" }],
        lignes: rows.map((r) => ({ ...base(r.salarieId), type: r.type === "ENTRETIEN_ANNUEL" ? "Annuel" : "Professionnel", echeance: fr(r.dateEcheance), realise: r.traite ? "Oui" : "Non", le: fr(r.traiteAt) })),
      };
    }
  }
}

/** Tri, recherche globale, filtre de colonne et pagination */
export function paginer(lignes: Ligne[], o: { q?: string | null; tri?: string | null; sens?: string | null; page?: number; parPage?: number; colonne?: string | null; valeur?: string | null }) {
  let l = lignes;
  const q = (o.q || "").trim().toLowerCase();
  if (q) l = l.filter((x) => Object.values(x).some((v) => String(v ?? "").toLowerCase().includes(q)));
  if (o.colonne && o.valeur) l = l.filter((x) => String(x[o.colonne!] ?? "").toLowerCase().includes(o.valeur!.toLowerCase()));
  if (o.tri) {
    const s = o.sens === "desc" ? -1 : 1;
    l = [...l].sort((a, b) => {
      const va = a[o.tri!];
      const vb = b[o.tri!];
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * s;
      return String(va ?? "").localeCompare(String(vb ?? ""), "fr") * s;
    });
  }
  const parPage = Math.min(Math.max(o.parPage || 20, 5), 200);
  const page = Math.max(o.page || 1, 1);
  return { total: l.length, page, parPage, lignes: l.slice((page - 1) * parPage, page * parPage), toutes: l };
}
