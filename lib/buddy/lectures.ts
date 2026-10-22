// lib/buddy/lectures.ts
// Réponses en lecture seule : listes, fiches, récapitulatifs, factures, abonnements, actualités, FAQ, navigation…

import { prisma } from "@/lib/prisma";
import {
  a,
  aPrefixe,
  analyserDates,
  chercherFaq,
  choixNumero,
  compterJours,
  detecterContrat,
  detecterMois,
  detecterThematique,
  detecterTypeAbsence,
  detecterTypeVariable,
  eur,
  estAbsence,
  estPresentDansMois,
  estQuestion,
  fmtDate,
  fmtDateCreation,
  fmtPeriode,
  heureParis,
  LABELS_ABSENCE,
  LABELS_SUPPORT,
  LABELS_VARIABLE,
  motsUtiles,
  NOMS_MOIS_AFFICHAGE,
  plain,
  trouverSalaries,
  versDate,
  type Msg,
} from "./outils";
import { liste, pluriel, puces, rep } from "./moteur";
import { NAVIGATION, PAGE } from "./pages";
import { simplifierActus, type ActuLite } from "./resume";
import { fmtValeur } from "./flux-rh";
import { nomComplet } from "./slots";
import { THEMATIQUES } from "@/lib/buddy/thematiques";
import type { Ctx, Env, ModuleBuddy, ReponseBuddy, SalarieLite } from "./types";

/* ════════════════════════════════════════════════════════════════
   Permissions
   ════════════════════════════════════════════════════════════════ */

const NOMS_MODULES: Record<ModuleBuddy, string> = {
  salaries: "Salariés",
  absences: "Absences",
  paie: "Paie",
  tickets: "Tickets RH",
  helpdesk: "Helpdesk",
  entreprise: "Entreprise (abonnement, facturation)",
  libre: "",
};

export function aAcces(env: Env, module: ModuleBuddy): boolean {
  const p = env.entreprise.permissions;
  if (module === "libre") return true;
  if (module === "absences") return p.includes("absences") || p.includes("paie");
  return p.includes(module);
}

export function refusAcces(module: ModuleBuddy): ReponseBuddy {
  return rep(
    `Le module « ${NOMS_MODULES[module]} » n'est pas activé sur votre espace, je ne peux donc pas vous aider sur ce point. 🙁\nSi vous en avez besoin, contactez l'équipe : je peux vous aider à ouvrir un ticket.`,
    { humeur: "triste", suggestions: ["Ouvrir un ticket", "Aide"] }
  );
}

/* ════════════════════════════════════════════════════════════════
   Petits outils
   ════════════════════════════════════════════════════════════════ */

const iso = (d: Date): string => d.toISOString().slice(0, 10);
const MAX_LIGNES = 12;

function limiter(lignes: string[], max = MAX_LIGNES): string[] {
  return lignes.length > max ? [...lignes.slice(0, max), `… et ${lignes.length - max} autre(s)`] : lignes;
}

function statutSalarie(s: SalarieLite, aujourdhui: string): "actif" | "avenir" | "sorti" {
  if (s.statut !== "Actif") return "sorti";
  if (s.dateFin && iso(s.dateFin) < aujourdhui) return "sorti";
  if (s.dateDebut && iso(s.dateDebut) > aujourdhui) return "avenir";
  return "actif";
}

function nbFacturables(env: Env, y: number, m: number): number {
  return env.salaries.filter((s) => estPresentDansMois(s, y, m)).length;
}

function lignesCommentaire(commentaire: string | null): string[] {
  if (!commentaire) return [];
  return commentaire
    .replace(/ \| /g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/* ════════════════════════════════════════════════════════════════
   SALARIÉS
   ════════════════════════════════════════════════════════════════ */

export async function lireSalaries(m: Msg, env: Env): Promise<ReponseBuddy> {
  const t = env.today.iso;
  const contrat = detecterContrat(m);
  const veutSortis = aPrefixe(m, "sorti", "ancien", "parti", "quitt", "depart");
  const veutAvenir = a(m, "a venir", "arrivent", "arrivee", "arrivees", "prochains", "futurs") || aPrefixe(m, "arrive");
  const cible = veutSortis ? "sorti" : veutAvenir ? "avenir" : "actif";

  const tous = env.salaries;
  const actifs = tous.filter((s) => statutSalarie(s, t) === "actif");
  const avenir = tous.filter((s) => statutSalarie(s, t) === "avenir");
  const sortis = tous.filter((s) => statutSalarie(s, t) === "sorti");
  let pool = cible === "actif" ? actifs : cible === "avenir" ? avenir : sortis;
  if (contrat) pool = pool.filter((s) => s.typeContrat === contrat);

  const titre =
    cible === "actif" ? "actif(s)" : cible === "avenir" ? "à venir" : "sorti(s)";
  if (pool.length === 0) {
    return rep(`Aucun salarié ${titre}${contrat ? ` en ${contrat}` : ""} pour le moment.`, { humeur: "neutre", liens: [{ label: "Page Salariés", href: PAGE.salaries }], suggestions: ["Ajouter un salarié"] });
  }

  const lignes = limiter(pool.sort((x, y) => x.nom.localeCompare(y.nom)).map((s) => `${nomComplet(s)} — ${s.poste}${s.typeContrat ? ` (${s.typeContrat})` : ""}`));
  let texte = `👥 ${pool.length} salarié(s) ${titre}${contrat ? ` en ${contrat}` : ""} :\n${puces(lignes)}`;
  if (cible === "actif" && !contrat) {
    const autres: string[] = [];
    if (avenir.length > 0) autres.push(`${avenir.length} à venir`);
    if (sortis.length > 0) autres.push(`${sortis.length} sorti(s)`);
    if (autres.length > 0) texte += `\n\n(${autres.join(", ")})`;
  }

  if (a(m, "factur", "cout", "supplement", "inclus", "tarif") || aPrefixe(m, "factur")) {
    const ab = env.entreprise.abonnement;
    const n = nbFacturables(env, env.today.y, env.today.m);
    if (ab) {
      const supp = Math.max(0, n - ab.salariesInclus);
      texte += `\n\n💳 Ce mois-ci, ${n} salarié(s) comptent pour la facturation (${ab.salariesInclus} inclus dans « ${ab.nom} »)${supp > 0 ? ` → ${supp} en supplément, soit ${eur(supp * ab.prixSalarieSupp)}` : ""}.`;
    }
  }

  return rep(texte, {
    humeur: "neutre",
    liens: [{ label: "Page Salariés", href: PAGE.salaries }],
    suggestions: ["Ajouter un salarié", "Absences en attente"],
  });
}

export async function lireFiche(m: Msg, env: Env): Promise<ReponseBuddy> {
  const trouves = trouverSalaries(m, env.salaries);
  if (trouves.length === 0) {
    return rep("Je ne trouve pas ce salarié. Dites-moi son prénom ou son nom (ex : « fiche de Marie Dupont »).", {
      humeur: "triste",
      suggestions: env.salaries.slice(0, 5).map((s) => `Fiche de ${nomComplet(s)}`),
    });
  }
  if (trouves.length > 1) {
    return rep(`Plusieurs salariés correspondent :\n${liste(trouves.map((s) => `${nomComplet(s)} — ${s.poste}`))}\n\nPrécisez le nom complet.`, {
      humeur: "reflechit",
      suggestions: trouves.slice(0, 5).map((s) => `Fiche de ${nomComplet(s)}`),
    });
  }
  const s = trouves[0];
  env.dernierSalarieId = s.id;
  const lignes = [
    `Poste : ${s.poste}`,
    `Contrat : ${s.typeContrat ?? "—"}`,
    `Entrée : ${s.dateDebut ? fmtDate(s.dateDebut) : "—"}${s.dateFin ? ` · Fin : ${fmtDate(s.dateFin)}` : ""}`,
    `Salaire mensuel brut : ${s.salaireMensuel ? eur(s.salaireMensuel) : "—"}`,
    `Heures hebdomadaires : ${s.heuresHebdomadaires ?? "—"}`,
    `Email : ${s.email ?? "—"} · Tél : ${s.telephone ?? "—"}`,
    `Statut : ${s.statut}`,
  ];
  let texte = `📋 ${nomComplet(s)}\n${puces(lignes)}`;

  const absences = await prisma.absence.findMany({
    where: { salarieId: s.id, entrepriseId: env.entreprise.id, dateFin: { gte: versDate(env.today.iso) } },
    orderBy: { dateDebut: "asc" },
    take: 3,
  });
  if (absences.length > 0) {
    texte += `\n\n🏖️ Prochaines absences :\n${puces(absences.map((x) => `${LABELS_ABSENCE[x.type] ?? x.type} ${fmtPeriode({ debut: iso(x.dateDebut), fin: iso(x.dateFin) })} (${x.statut})`))}`;
  }
  const prenom = s.prenom;
  return rep(texte, {
    humeur: "neutre",
    liens: [{ label: "Page Salariés", href: PAGE.salaries }],
    suggestions: [`Ajouter une absence pour ${prenom}`, `Ajouter une prime pour ${prenom}`, `Modifier le poste de ${prenom}`],
  });
}

/* ════════════════════════════════════════════════════════════════
   ABSENCES
   ════════════════════════════════════════════════════════════════ */

function lignesAbsences(items: { type: string; dateDebut: Date; dateFin: Date; statut: string; salarie: { prenom: string; nom: string } }[]): string[] {
  return items.map(
    (x) => `${nomComplet(x.salarie)} — ${LABELS_ABSENCE[x.type] ?? x.type}, ${fmtPeriode({ debut: iso(x.dateDebut), fin: iso(x.dateFin) })} (${x.statut})`
  );
}

export async function lireAbsences(m: Msg, env: Env): Promise<ReponseBuddy> {
  const entrepriseId = env.entreprise.id;
  const salaries = trouverSalaries(m, env.salaries);
  const ids = salaries.map((s) => s.id);
  const { periode } = analyserDates(m.brut, env.today.iso);
  const moisCite = detecterMois(m);
  const enAttente = aPrefixe(m, "attente");
  const type = detecterTypeAbsence(m);
  const filtreType = type && !(type === "CONGE_PAYE" && !a(m, "paye", "payes", "cp")) ? { type: type as any } : {};
  const filtreStatut = enAttente ? { statut: "En attente" } : {};
  const filtreSalarie = ids.length > 0 ? { salarieId: { in: ids } } : {};

  // 1) « Marie est-elle absente demain ? »
  if (salaries.length === 1 && periode && estQuestion(m)) {
    const trouvees = await prisma.absence.findMany({
      where: { entrepriseId, salarieId: salaries[0].id, dateDebut: { lte: versDate(periode.fin) }, dateFin: { gte: versDate(periode.debut) } },
      include: { salarie: true },
      orderBy: { dateDebut: "asc" },
    });
    if (trouvees.length === 0) {
      return rep(`Non, aucune absence n'est enregistrée pour ${nomComplet(salaries[0])} ${fmtPeriode(periode)}.`, {
        humeur: "neutre",
        suggestions: [`Ajouter une absence pour ${salaries[0].prenom}`],
      });
    }
    return rep(`Oui :\n${puces(lignesAbsences(trouvees))}`, { humeur: "neutre", liens: [{ label: "Voir les absences", href: PAGE.absences }] });
  }

  // 2) « Qui est absent demain / cette semaine ? »
  if (salaries.length === 0 && (a(m, "qui") || aPrefixe(m, "absent")) && (periode || a(m, "aujourd hui"))) {
    const p = periode ?? { debut: env.today.iso, fin: env.today.iso };
    const trouvees = await prisma.absence.findMany({
      where: { entrepriseId, dateDebut: { lte: versDate(p.fin) }, dateFin: { gte: versDate(p.debut) } },
      include: { salarie: true },
      orderBy: { dateDebut: "asc" },
      take: 40,
    });
    if (trouvees.length === 0) return rep(`Personne n'est absent ${fmtPeriode(p)}. 🎉`, { humeur: "content", suggestions: ["Ajouter une absence"] });
    return rep(`🏖️ Absences ${fmtPeriode(p)} :\n${puces(limiter(lignesAbsences(trouvees)))}`, {
      humeur: "neutre",
      liens: [{ label: "Voir les absences", href: PAGE.absences }],
    });
  }

  // 3) « Combien de jours de congé a Marie ? » → total par type sur l'année
  if (a(m, "combien") && (salaries.length > 0 || a(m, "jours")) && !enAttente) {
    const annee = moisCite?.annee ?? env.today.y;
    const trouvees = await prisma.absence.findMany({
      where: { entrepriseId, ...filtreSalarie, ...filtreType, dateDebut: { lte: versDate(`${annee}-12-31`) }, dateFin: { gte: versDate(`${annee}-01-01`) } },
      include: { salarie: true },
    });
    if (trouvees.length === 0) return rep(`Aucune absence enregistrée en ${annee}${salaries.length === 1 ? ` pour ${nomComplet(salaries[0])}` : ""}.`, { humeur: "neutre" });
    const parType = new Map<string, number>();
    for (const x of trouvees) {
      const debut = iso(x.dateDebut) < `${annee}-01-01` ? `${annee}-01-01` : iso(x.dateDebut);
      const fin = iso(x.dateFin) > `${annee}-12-31` ? `${annee}-12-31` : iso(x.dateFin);
      parType.set(x.type, (parType.get(x.type) ?? 0) + compterJours(debut, fin).ouvres);
    }
    const lignes = Array.from(parType.entries()).map(([t, n]) => `${LABELS_ABSENCE[t] ?? t} : ${pluriel(n, "jour ouvré", "jours ouvrés")}`);
    return rep(`📊 Absences ${annee}${salaries.length === 1 ? ` — ${nomComplet(salaries[0])}` : ""} (demandes en attente comprises) :\n${puces(lignes)}\n\nJe n'ai pas accès aux soldes de congés, seulement aux jours déclarés.`, {
      humeur: "neutre",
      liens: [{ label: "Voir les absences", href: PAGE.absences }],
    });
  }

  // 4) Liste
  const filtreMois =
    moisCite && !periode
      ? { dateDebut: { lte: versDate(`${moisCite.annee}-${String(moisCite.mois).padStart(2, "0")}-31`) }, dateFin: { gte: versDate(`${moisCite.annee}-${String(moisCite.mois).padStart(2, "0")}-01`) } }
      : periode
      ? { dateDebut: { lte: versDate(periode.fin) }, dateFin: { gte: versDate(periode.debut) } }
      : {};
  const trouvees = await prisma.absence.findMany({
    where: { entrepriseId, ...filtreSalarie, ...filtreType, ...filtreStatut, ...filtreMois },
    include: { salarie: true },
    orderBy: { dateDebut: "desc" },
    take: 12,
  });
  if (trouvees.length === 0) {
    return rep(`Aucune absence${enAttente ? " en attente" : ""} trouvée${salaries.length === 1 ? ` pour ${nomComplet(salaries[0])}` : ""}.`, {
      humeur: "neutre",
      suggestions: ["Ajouter une absence"],
    });
  }
  return rep(`🏖️ ${trouvees.length} absence(s)${enAttente ? " en attente" : ""}${salaries.length === 1 ? ` — ${nomComplet(salaries[0])}` : ""} :\n${puces(lignesAbsences(trouvees))}`, {
    humeur: "neutre",
    liens: [{ label: "Voir les absences", href: PAGE.absences }],
    suggestions: ["Ajouter une absence", enAttente ? "Toutes les absences" : "Absences en attente"],
  });
}

/* ════════════════════════════════════════════════════════════════
   VARIABLES DE PAIE
   ════════════════════════════════════════════════════════════════ */

export async function lireVariables(m: Msg, env: Env): Promise<ReponseBuddy> {
  const entrepriseId = env.entreprise.id;
  const salaries = trouverSalaries(m, env.salaries);
  const ids = salaries.map((s) => s.id);
  const type = detecterTypeVariable(m);
  const cite = detecterMois(m);
  const mois = cite?.mois ?? env.today.m;
  const annee = cite?.annee ?? env.today.y;
  const enAttente = aPrefixe(m, "attente");

  const vars = await prisma.variablePaie.findMany({
    where: {
      entrepriseId,
      mois,
      annee,
      ...(ids.length > 0 ? { salarieId: { in: ids } } : {}),
      ...(type ? { type: type as any } : {}),
      ...(enAttente ? { statut: "En attente" } : {}),
    },
    include: { salarie: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const periode = `${NOMS_MOIS_AFFICHAGE[mois - 1]} ${annee}`;
  if (vars.length === 0) {
    return rep(`Aucune variable${enAttente ? " en attente" : ""}${type ? ` (${LABELS_VARIABLE[type]})` : ""} pour ${periode}${salaries.length === 1 ? ` — ${nomComplet(salaries[0])}` : ""}.`, {
      humeur: "neutre",
      suggestions: ["Ajouter une prime", "Ajouter des heures supp."],
    });
  }

  const totaux = new Map<string, number>();
  for (const v of vars) totaux.set(v.type, (totaux.get(v.type) ?? 0) + v.valeur);
  const lignes = limiter(vars.map((v) => `${nomComplet(v.salarie)} — ${LABELS_VARIABLE[v.type] ?? v.type} : ${fmtValeur(v.type, v.valeur)} (${v.statut})`));
  const synthese = Array.from(totaux.entries()).map(([t, n]) => `${LABELS_VARIABLE[t] ?? t} : ${fmtValeur(t, Math.round(n * 100) / 100)}`);
  const nbAttente = vars.filter((v) => v.statut === "En attente").length;
  return rep(
    `💰 ${vars.length} variable(s) — ${periode}${salaries.length === 1 ? ` — ${nomComplet(salaries[0])}` : ""} :\n${puces(lignes)}\n\nTotaux : ${synthese.join(" · ")}\n${nbAttente} en attente de traitement.`,
    { humeur: "neutre", liens: [{ label: "Voir la saisie de paie", href: PAGE.saisie }], suggestions: ["Ajouter une prime", "Récap de la paie"] }
  );
}

export async function lirePaie(env: Env): Promise<ReponseBuddy> {
  const entrepriseId = env.entreprise.id;
  const { m, y } = env.today;
  const vars = await prisma.variablePaie.findMany({ where: { entrepriseId, mois: m, annee: y } });
  const absencesAttente = await prisma.absence.count({ where: { entrepriseId, statut: "En attente" } });
  const lignes: string[] = [];
  const nbAttente = vars.filter((v) => v.statut === "En attente").length;
  lignes.push(`Variables saisies : ${vars.length} (dont ${nbAttente} en attente)`);
  const totaux = new Map<string, number>();
  for (const v of vars) totaux.set(v.type, (totaux.get(v.type) ?? 0) + v.valeur);
  if (totaux.size > 0) lignes.push(Array.from(totaux.entries()).map(([t, n]) => `${LABELS_VARIABLE[t] ?? t} : ${fmtValeur(t, Math.round(n * 100) / 100)}`).join(" · "));
  lignes.push(`Absences en attente de validation : ${absencesAttente}`);

  const fp = env.entreprise.abonnementPaie;
  if (fp) {
    const n = nbFacturables(env, y, m);
    const supp = Math.max(0, n - fp.bulletinsInclus);
    lignes.push(`Formule paie « ${fp.nom} » : ${n} bulletin(s) ce mois-ci pour ${fp.bulletinsInclus} inclus${supp > 0 ? ` → ${supp} en supplément (${eur(supp * fp.prixBulletinSupp)})` : ""}`);
  } else {
    lignes.push("Aucune formule paie souscrite");
  }
  return rep(`📊 Paie — ${NOMS_MOIS_AFFICHAGE[m - 1]} ${y}\n${puces(lignes)}`, {
    humeur: "neutre",
    liens: [{ label: "Page Paie", href: PAGE.paie }],
    suggestions: ["Variables du mois", fp ? "Mon abonnement paie" : "Souscrire à une formule paie"],
  });
}

/* ════════════════════════════════════════════════════════════════
   FACTURATION
   ════════════════════════════════════════════════════════════════ */

export async function lireFacturation(m: Msg, env: Env): Promise<ReponseBuddy> {
  const factures = await prisma.facturation.findMany({
    where: { entrepriseId: env.entreprise.id },
    orderBy: [{ annee: "desc" }, { mois: "desc" }],
    take: 12,
  });
  if (factures.length === 0) {
    return rep("Aucune facture n'a encore été générée pour votre entreprise.", { humeur: "neutre", liens: [{ label: "Facturation", href: PAGE.facturation }] });
  }
  const cite = detecterMois(m);
  const cibleMois = cite ?? { mois: env.today.m, annee: env.today.y };
  const detail = factures.find((f) => f.mois === cibleMois.mois && f.annee === cibleMois.annee) ?? (cite ? null : factures[0]);

  let texte = "";
  if (detail) {
    const lignes = lignesCommentaire(detail.commentaire);
    texte += `💳 Facture de ${NOMS_MOIS_AFFICHAGE[detail.mois - 1]} ${detail.annee} : ${eur(detail.montant)} (${detail.statut})`;
    if (lignes.length > 0) texte += `\n${puces(lignes)}`;
  } else {
    texte += `Je ne trouve pas de facture pour ${NOMS_MOIS_AFFICHAGE[cibleMois.mois - 1]} ${cibleMois.annee}.`;
  }
  const autres = factures.filter((f) => f !== detail).slice(0, 5);
  if (autres.length > 0) {
    texte += `\n\nFactures précédentes :\n${puces(autres.map((f) => `${NOMS_MOIS_AFFICHAGE[f.mois - 1]} ${f.annee} — ${eur(f.montant)} — ${f.statut}`))}`;
  }
  return rep(texte, { humeur: "neutre", liens: [{ label: "Facturation", href: PAGE.facturation }], suggestions: ["Mon abonnement"] });
}

/* ════════════════════════════════════════════════════════════════
   ABONNEMENTS
   ════════════════════════════════════════════════════════════════ */

const FEATURES_PAIE: [string, string][] = [
  ["relancesVariables", "Relances des variables"],
  ["relancesSalaries", "Relances des salariés"],
  ["modificationsIncluses", "Modifications incluses"],
  ["regularisationsInclus", "Régularisations"],
  ["demandesComplexes", "Demandes complexes"],
  ["veillePaie", "Veille paie"],
  ["conseilPaie", "Conseil paie"],
  ["suiviRH", "Suivi RH"],
  ["suiviIJSS", "Suivi IJSS"],
  ["relancesIJSS", "Relances IJSS"],
  ["recouvrementIJSS", "Recouvrement IJSS"],
  ["pointPaie", "Point paie"],
  ["recommandationsPaie", "Recommandations paie"],
  ["traitementPrioritaire", "Traitement prioritaire"],
  ["assistanceURSSAF", "Assistance URSSAF"],
];

function featuresPaie(f: Record<string, any>): string[] {
  const l = FEATURES_PAIE.filter(([cle]) => f[cle] === true).map(([, label]) => label);
  if (f.tableauBord === "simple") l.unshift("Tableau de bord simple");
  if (f.tableauBord === "complet") l.unshift("Tableau de bord complet");
  return l;
}

export async function lireAbonnements(env: Env, canal: "rh" | "paie" | null): Promise<ReponseBuddy> {
  const e = env.entreprise;
  const { m, y } = env.today;
  const blocs: string[] = [];
  const liens = [] as { label: string; href: string }[];

  if (canal !== "paie") {
    const ab = e.abonnement;
    if (ab) {
      const n = nbFacturables(env, y, m);
      const lignes = [
        `Salariés : ${n} comptés ce mois-ci (${ab.salariesInclus} inclus, puis ${eur(ab.prixSalarieSupp)} par salarié)`,
        `Tickets RH : ${e.ticketsUtilises} utilisé(s) sur ${ab.ticketsRH} inclus (puis ${eur(ab.prixTicketSupp)} par ticket)`,
      ];
      if (ab.features.length > 0) lignes.push(`Inclus : ${ab.features.slice(0, 5).join(", ")}${ab.features.length > 5 ? "…" : ""}`);
      blocs.push(`📋 Abonnement RH : ${ab.nom} — ${eur(ab.prixMensuel)}/mois\n${puces(lignes)}`);
    } else {
      blocs.push("📋 Abonnement RH : aucun abonnement actif.");
    }
    const dem = await prisma.demandeEvolution.findFirst({ where: { entrepriseId: e.id, statut: "En attente" } });
    if (dem) {
      const cible = await prisma.abonnement.findUnique({ where: { id: dem.abonnementId } });
      blocs.push(`⏳ Demande en attente : passage à « ${cible?.nom ?? "?"} » (envoyée le ${fmtDateCreation(dem.createdAt)}).`);
    }
    liens.push({ label: "Abonnement RH", href: PAGE.abonnement });
  }

  if (canal !== "rh") {
    const fp = e.abonnementPaie;
    if (fp) {
      const n = nbFacturables(env, y, m);
      const lignes = [`Bulletins : ${n} ce mois-ci (${fp.bulletinsInclus} inclus, puis ${eur(fp.prixBulletinSupp)} le bulletin supplémentaire)`];
      const feats = featuresPaie(fp);
      if (feats.length > 0) lignes.push(`Inclus : ${feats.slice(0, 5).join(", ")}${feats.length > 5 ? "…" : ""}`);
      blocs.push(`💰 Formule paie : ${fp.nom} — ${eur(fp.prixMensuel)}/mois\n${puces(lignes)}`);
    } else {
      blocs.push("💰 Formule paie : aucune formule souscrite. Dites « souscrire à une formule paie » pour en demander une.");
    }
    const dem = await prisma.demandeEvolutionPaie.findFirst({ where: { entrepriseId: e.id, statut: "EN_ATTENTE" }, include: { nouvelleFormule: true } });
    if (dem) blocs.push(`⏳ Demande en attente : formule paie « ${dem.nouvelleFormule.nom} » (envoyée le ${fmtDateCreation(dem.createdAt)}).`);
    liens.push({ label: "Abonnement paie", href: PAGE.abonnementPaie });
  }

  return rep(blocs.join("\n\n"), {
    humeur: "neutre",
    liens,
    suggestions: canal === "paie" ? ["Quelles sont les formules paie ?", "Changer de formule paie"] : canal === "rh" ? ["Quelles sont les formules RH ?", "Changer d'abonnement RH"] : ["Quelles sont les formules ?", "Ma facture du mois"],
  });
}

export async function lireFormules(env: Env, canal: "rh" | "paie" | null): Promise<ReponseBuddy> {
  const blocs: string[] = [];
  if (canal !== "paie") {
    const formules = await prisma.abonnement.findMany({ orderBy: { prixMensuel: "asc" } });
    if (formules.length > 0) {
      blocs.push(
        `📋 Formules RH :\n${puces(
          formules.map(
            (f) =>
              `${f.nom} — ${eur(f.prixMensuel)}/mois — ${f.ticketsRH} tickets, ${f.salariesInclus} salariés inclus${f.id === env.entreprise.abonnementId ? "  ← votre formule" : ""}`
          )
        )}`
      );
    }
  }
  if (canal !== "rh") {
    const formules = await prisma.abonnementPaie.findMany({ orderBy: { prixMensuel: "asc" } });
    if (formules.length > 0) {
      blocs.push(
        `💰 Formules paie :\n${puces(
          formules.map((f) => {
            const feats = featuresPaie(f);
            return `${f.nom} — ${eur(f.prixMensuel)}/mois — ${f.bulletinsInclus} bulletins inclus${f.id === env.entreprise.abonnementPaieId ? "  ← votre formule" : ""}${
              feats.length > 0 ? `\n   ${feats.slice(0, 4).join(", ")}${feats.length > 4 ? "…" : ""}` : ""
            }`;
          })
        )}`
      );
    }
  }
  if (blocs.length === 0) return rep("Aucune formule n'est disponible pour le moment.", { humeur: "neutre" });
  return rep(`${blocs.join("\n\n")}\n\nPour changer de formule, dites par exemple « je veux passer à la formule Premium ».`, {
    humeur: "neutre",
    liens: [
      ...(canal !== "paie" ? [{ label: "Abonnement RH", href: PAGE.abonnement }] : []),
      ...(canal !== "rh" ? [{ label: "Abonnement paie", href: PAGE.abonnementPaie }] : []),
    ],
    suggestions: canal === "rh" ? ["Changer d'abonnement RH"] : canal === "paie" ? ["Changer de formule paie"] : ["Mon abonnement"],
  });
}

/* ════════════════════════════════════════════════════════════════
   TICKETS
   ════════════════════════════════════════════════════════════════ */

export async function lireTickets(env: Env, ctx: Ctx, canal: "rh" | "support"): Promise<ReponseBuddy> {
  const rh = canal === "rh";
  const where = { entrepriseId: env.entreprise.id };
  const tickets: any[] = rh
    ? await prisma.ticket.findMany({ where, orderBy: { updatedAt: "desc" }, take: 8 })
    : await prisma.ticketSupport.findMany({ where, orderBy: { updatedAt: "desc" }, take: 8 });
  const ouverts = tickets.filter((t) => t.statut !== "Clôturé").length;
  if (tickets.length === 0) {
    return rep(rh ? "Vous n'avez encore aucun ticket RH." : "Vous n'avez encore aucun ticket helpdesk.", {
      humeur: "neutre",
      suggestions: [rh ? "Ouvrir un ticket" : "Signaler un problème"],
    });
  }
  ctx.liste = { type: rh ? "tickets" : "support", items: tickets.map((t) => ({ id: t.id, label: t.titre })) };
  const lignes = tickets.map((t) => `${t.titre} — ${t.statut} (${fmtDateCreation(t.createdAt)})${!rh && t.categorie ? ` · ${LABELS_SUPPORT[t.categorie] ?? t.categorie}` : ""}`);
  let texte = `🎫 ${rh ? "Tickets RH" : "Tickets helpdesk"} — ${ouverts} ouvert(s) :\n${liste(lignes)}`;
  const ab = env.entreprise.abonnement;
  if (rh && ab) texte += `\n\nQuota : ${env.entreprise.ticketsUtilises} ticket(s) utilisé(s) sur ${ab.ticketsRH} inclus.`;
  texte += `\n\nDites « détail du ${tickets.length > 1 ? 2 : 1} » ou « réponds au 1 » pour continuer.`;
  return rep(texte, {
    humeur: "neutre",
    liens: [{ label: rh ? "Tickets RH" : "Helpdesk", href: rh ? PAGE.tickets : PAGE.helpdesk }],
    suggestions: ["Détail du 1", rh ? "Ouvrir un ticket" : "Signaler un problème"],
  });
}

export async function lireTicketDetail(env: Env, ctx: Ctx, index: number): Promise<ReponseBuddy> {
  const liste_ = ctx.liste;
  if (!liste_ || (liste_.type !== "tickets" && liste_.type !== "support") || !liste_.items[index - 1]) {
    return rep("De quel ticket parlez-vous ? Affichez d'abord la liste (« mes tickets »).", { humeur: "reflechit", suggestions: ["Mes tickets"] });
  }
  const rh = liste_.type === "tickets";
  const id = liste_.items[index - 1].id;
  const where = { id, entrepriseId: env.entreprise.id };
  const t: any = rh
    ? await prisma.ticket.findFirst({ where, include: { messages: { orderBy: { createdAt: "desc" }, take: 4 } } })
    : await prisma.ticketSupport.findFirst({ where, include: { messages: { orderBy: { createdAt: "desc" }, take: 4 } } });
  if (!t) return rep("Je ne retrouve pas ce ticket.", { humeur: "triste" });
  let texte = `🎫 ${t.titre}\n${puces([`Statut : ${t.statut}`, `Créé le ${fmtDateCreation(t.createdAt)}`, `Demande : ${t.description}`])}`;
  const msgs: any[] = [...(t.messages ?? [])].reverse();
  if (msgs.length > 0) {
    texte += `\n\n💬 Derniers échanges :\n${puces(msgs.map((x) => `${x.role === "ADMIN" ? "Équipe" : x.auteur} (${fmtDateCreation(x.createdAt)}) : ${String(x.contenu).slice(0, 200)}`))}`;
  } else {
    texte += "\n\nAucune réponse pour l'instant.";
  }
  return rep(texte, {
    humeur: "neutre",
    liens: [{ label: rh ? "Tickets RH" : "Helpdesk", href: rh ? PAGE.tickets : PAGE.helpdesk }],
    suggestions: t.statut === "Clôturé" ? ["Mes tickets"] : [`Réponds au ${index}`],
  });
}

/* ════════════════════════════════════════════════════════════════
   RECRUTEMENT
   ════════════════════════════════════════════════════════════════ */

export async function lireRecrutements(env: Env): Promise<ReponseBuddy> {
  const demandes = await prisma.demandeRecrutement.findMany({
    where: { entrepriseId: env.entreprise.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  if (demandes.length === 0) {
    return rep("Vous n'avez encore aucune demande de recrutement.", { humeur: "neutre", suggestions: ["Créer une demande de recrutement"] });
  }
  return rep(`🧑‍💼 Vos demandes de recrutement :\n${puces(demandes.map((r) => `${r.poste} (${r.typeContrat}) — ${r.statut} — demandée le ${fmtDateCreation(r.createdAt)}`))}`, {
    humeur: "neutre",
    liens: [{ label: "Historique des recrutements", href: PAGE.recrutementHisto }],
    suggestions: ["Créer une demande de recrutement"],
  });
}

/* ════════════════════════════════════════════════════════════════
   ACTUALITÉS RH
   ════════════════════════════════════════════════════════════════ */

async function chargerActus(): Promise<ActuLite[]> {
  const actus = await prisma.actualite.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  return actus.map((x) => ({ id: x.id, titre: x.titre, contenu: x.contenu, thematique: x.thematique, createdAt: x.createdAt }));
}

function comptesParThematique(actus: ActuLite[]): string {
  const noms = THEMATIQUES.map((t) => ({ t, n: actus.filter((x) => x.thematique === t).length })).filter((x) => x.n > 0);
  return noms.map((x) => `${x.t} (${x.n})`).join(" · ");
}

const MOTS_NON_THEMATIQUES = new Set([
  "actu", "actus", "actualite", "actualites", "news", "nouveaute", "nouveautes", "resume", "resumer", "simplifie", "simplifier", "explique", "expliquer",
  "derniere", "dernieres", "dernier", "derniers", "lis", "lire", "entier", "entiere", "concerne", "concernant", "propos", "sujet", "recente", "recentes",
  "montre", "affiche", "liste", "donne", "veux", "voir", "neuf", "quoi", "rh", "thematique", "theme", "sur", "mots", "simples", "simple", "clair",
]);

const MOTS_THEMES = new Set(THEMATIQUES.flatMap((t) => plain(t).split(" ")));

function rechercheActus(m: Msg, actus: ActuLite[]): ActuLite[] {
  const mots = motsUtiles(m).filter((w) => !MOTS_NON_THEMATIQUES.has(w) && !MOTS_THEMES.has(w));
  if (mots.length === 0) return [];
  const notes = actus
    .map((x) => {
      const texte = plain(`${x.titre} ${x.contenu}`);
      const titre = plain(x.titre);
      let score = 0;
      for (const w of mots) {
        if (titre.includes(w)) score += 3;
        else if (texte.includes(w)) score += 1;
      }
      return { x, score };
    })
    .filter((n) => n.score > 0)
    .sort((p, q) => q.score - p.score);
  return notes.slice(0, NB_ACTUS_LISTE).map((n) => n.x);
}

const LONGUEUR_MAX_ACTU = 3500;

/** Affiche l'actualité complète de la 1re de la liste, et propose les autres. */
function actualiteComplete(trouvees: ActuLite[], ctx: Ctx, _lieu: string): ReponseBuddy {
  const x = trouvees[0];
  const autres = trouvees.slice(1, 5);
  ctx.liste = { type: "actus", items: [x, ...autres].map((y) => ({ id: y.id, label: y.titre })) };
  const contenu =
    x.contenu.length > LONGUEUR_MAX_ACTU
      ? `${x.contenu.slice(0, LONGUEUR_MAX_ACTU)}…\n\n(texte tronqué : la suite est sur la page Actualité RH)`
      : x.contenu;
  let texte = `📰 ${x.titre}\n${x.thematique} · ${fmtDate(x.createdAt)}\n\n${contenu}`;
  if (autres.length > 0) {
    texte += `\n\n📚 À lire aussi :\n${autres.map((y, k) => `${k + 2}. ${y.titre} — ${fmtDate(y.createdAt)}`).join("\n")}\nDites « lis la 2 » pour ouvrir une autre actualité.`;
  }
  return rep(texte, {
    humeur: "content",
    liens: [{ label: "Actualité RH", href: PAGE.actualites }],
    suggestions: ["Résume la 1", ...(autres.length > 0 ? ["Lis la 2"] : []), "Autres actualités"].slice(0, 3),
  });
}

/**
 * Question libre sur un sujet (« c'est quoi le préavis ? ») : on cherche dans les actualités RH.
 * Renvoie l'actualité complète si on en trouve une vraiment pertinente, sinon null.
 */
export async function chercherDansActus(m: Msg, ctx: Ctx): Promise<ReponseBuddy | null> {
  const actus = await chargerActus();
  if (actus.length === 0) return null;
  const trouvees = rechercheActus(m, actus);
  if (trouvees.length === 1) return actualiteComplete(trouvees, ctx, "sur ce sujet");
  if (trouvees.length > 1) return listerActus(trouvees, ctx, "Actualités sur ce sujet", false, actus);
  const theme = detecterThematique(m);
  if (theme) {
    const pool = actus.filter((x) => x.thematique === theme);
    if (pool.length > 0) return listerActus(pool, ctx, `Actualité RH — ${theme}`, true, actus);
  }
  return null;
}

const NB_ACTUS_LISTE = 5;

/** Liste des 5 actualités les plus récentes (ou les mieux classées) d'une sélection. */
function listerActus(selection: ActuLite[], ctx: Ctx, titre: string, avecTheme: boolean, actusTotales: ActuLite[]): ReponseBuddy {
  const affichees = selection.slice(0, NB_ACTUS_LISTE);
  ctx.liste = { type: "actus", items: affichees.map((x) => ({ id: x.id, label: x.titre })) };
  const total = selection.length;
  const entete = total > affichees.length ? `${titre} — les ${affichees.length} plus récentes sur ${total}` : `${titre} (${total})`;
  let texte = `📰 ${entete} :\n${liste(affichees.map((x) => `${x.titre} — ${fmtDate(x.createdAt)}${avecTheme ? "" : ` · ${x.thematique}`}`))}`;
  if (total > affichees.length) texte += `\n\nPour affiner, demandez une thématique ou un sujet (ex : « actualités paie », « actu sur la DSN »).`;
  const themes = comptesParThematique(actusTotales);
  if (!avecTheme && themes) texte += `\n\nThématiques : ${themes}`;
  const exemple = affichees.length > 1 ? 2 : 1;
  texte += `\n\nDites « lis la ${exemple} » pour le texte complet, ou « résume la 1 » pour une version simplifiée.`;
  return rep(texte, {
    humeur: "neutre",
    liens: [{ label: "Actualité RH", href: PAGE.actualites }],
    suggestions: [`Lis la 1`, "Résume la 1", ...(avecTheme ? [] : THEMATIQUES.filter((t) => actusTotales.some((x) => x.thematique === t)).slice(0, 1).map((t) => `Actualités ${t}`))].slice(0, 3),
  });
}

export async function lireActus(m: Msg, env: Env, ctx: Ctx): Promise<ReponseBuddy> {
  const actus = await chargerActus();
  const theme = detecterThematique(m);
  if (actus.length === 0) {
    return rep("Aucune actualité RH n'a encore été publiée. Revenez bientôt ! 📰", { humeur: "neutre", liens: [{ label: "Actualité RH", href: PAGE.actualites }] });
  }
  // Un sujet précis (« la DSN ») : une seule actualité pertinente = on l'affiche en entier, sinon les 5 meilleures
  const parSujet = rechercheActus(m, actus);
  if (parSujet.length === 1) return actualiteComplete(parSujet, ctx, "sur ce sujet");
  if (parSujet.length > 1) return listerActus(parSujet, ctx, "Actualités sur ce sujet", false, actus);

  const filtrees = theme ? actus.filter((x) => x.thematique === theme) : actus;
  if (filtrees.length === 0) {
    return rep(`Aucune actualité publiée en « ${theme} » pour le moment.\nThématiques disponibles : ${comptesParThematique(actus)}.`, {
      humeur: "neutre",
      suggestions: THEMATIQUES.filter((t) => actus.some((x) => x.thematique === t)).slice(0, 4).map((t) => `Actualités ${t}`),
    });
  }
  return listerActus(filtrees, ctx, theme ? `Actualité RH — ${theme}` : "Actualité RH", !!theme, actus);
}

/** Résume (simplifie) une ou plusieurs actualités : par numéro de la dernière liste, par thématique, par mot-clé ou les plus récentes. */
export async function resumerActus(m: Msg, env: Env, ctx: Ctx): Promise<ReponseBuddy> {
  const actus = await chargerActus();
  if (actus.length === 0) return rep("Aucune actualité RH n'a encore été publiée. 📰", { humeur: "neutre" });

  const theme = detecterThematique(m);
  const derniere = aPrefixe(m, "dernier", "recent", "nouveau");
  let cibles: ActuLite[] = [];
  let intitule = "";

  const n = ctx.liste?.type === "actus" ? numeroDansMessage(m, ctx.liste.items.length) : null;
  if (n && ctx.liste) {
    const x = actus.find((a_) => a_.id === ctx.liste!.items[n - 1].id);
    if (x) {
      cibles = [x];
      intitule = `« ${x.titre} »`;
    }
  }
  if (cibles.length === 0) {
    // un sujet précis (« la DSN », « le préavis ») passe avant la thématique
    const trouvees = rechercheActus(m, actus);
    if (trouvees.length > 0) {
      cibles = trouvees.slice(0, 3);
      intitule = "actualités sur ce sujet";
    }
  }
  if (cibles.length === 0 && theme) {
    const pool = actus.filter((x) => x.thematique === theme);
    cibles = pool.slice(0, derniere ? 1 : 3);
    intitule = `actualité ${theme}`;
    if (pool.length === 0) {
      return rep(`Aucune actualité publiée en « ${theme} » pour le moment.\nThématiques disponibles : ${comptesParThematique(actus)}.`, {
        humeur: "neutre",
        suggestions: THEMATIQUES.filter((t) => actus.some((x) => x.thematique === t)).slice(0, 4).map((t) => `Résume l'actu ${t}`),
      });
    }
  }
  if (cibles.length === 0) {
    cibles = actus.slice(0, derniere ? 1 : 3);
    intitule = derniere ? "dernière actualité" : "dernières actualités";
  }

  const { texte, ia } = await simplifierActus(cibles, { thematique: theme, question: m.brut });
  const sources = cibles.map((x) => `« ${x.titre} » (${fmtDate(x.createdAt)})`).join(", ");
  ctx.liste = { type: "actus", items: cibles.map((x) => ({ id: x.id, label: x.titre })) };
  return rep(`📰 L'essentiel — ${intitule} :\n\n${texte}\n\nSource${cibles.length > 1 ? "s" : ""} : ${sources}${ia ? "" : ""}`, {
    humeur: "content",
    liens: [{ label: "Actualité RH", href: PAGE.actualites }],
    suggestions: cibles.length === 1 ? ["Lis-la en entier", "Autres actualités"] : ["Résume la 1", "Autres actualités"],
  });
}

export async function lireActuComplete(m: Msg, env: Env, ctx: Ctx): Promise<ReponseBuddy> {
  const items = ctx.liste?.type === "actus" ? ctx.liste.items : [];
  const n = numeroDansMessage(m, items.length) ?? (items.length === 1 ? 1 : null);
  if (!n) {
    if (items.length > 1) {
      return rep(`Laquelle voulez-vous lire en entier ?\n${items.map((it, k) => `${k + 1}. ${it.label}`).join("\n")}`, {
        humeur: "reflechit",
        suggestions: items.slice(0, 3).map((_, k) => `Lis la ${k + 1}`),
      });
    }
    return rep("Quelle actualité voulez-vous lire ? Affichez d'abord la liste (« actualités »).", { humeur: "reflechit", suggestions: ["Actualités"] });
  }
  const x = await prisma.actualite.findUnique({ where: { id: items[n - 1].id } });
  if (!x) return rep("Je ne retrouve pas cette actualité.", { humeur: "triste" });
  const contenu = x.contenu.length > LONGUEUR_MAX_ACTU ? `${x.contenu.slice(0, LONGUEUR_MAX_ACTU)}…\n\n(texte tronqué : la suite est sur la page Actualité RH)` : x.contenu;
  return rep(`📰 ${x.titre}\n${x.thematique} · ${fmtDate(x.createdAt)}\n\n${contenu}`, {
    humeur: "neutre",
    liens: [{ label: "Actualité RH", href: PAGE.actualites }],
    suggestions: [`Résume la ${n}`, "Autres actualités"],
  });
}

/** « la 2 », « le dernier », « numéro 3 »… (dans une phrase, pas seulement seul). */
export function numeroDansMessage(m: Msg, max: number): number | null {
  const direct = choixNumero(m, max);
  if (direct) return direct;
  const mm = m.norm.match(/\b(?:la|le|l|numero|n|actu|actualite|ticket)\s+(\d{1,2})\b/);
  if (mm) {
    const n = Number(mm[1]);
    if (n >= 1 && n <= max) return n;
  }
  const fin = m.norm.match(/\b(\d{1,2})\s*$/);
  if (fin) {
    const n = Number(fin[1]);
    if (n >= 1 && n <= max && m.mots.length <= 6) return n;
  }
  if (m.mots.includes("premiere") || m.mots.includes("premier")) return 1;
  if (m.mots.includes("deuxieme") || m.mots.includes("seconde")) return Math.min(2, max);
  if (m.mots.includes("troisieme")) return Math.min(3, max);
  if (max > 0 && (m.mots.includes("derniere") || m.mots.includes("dernier")) && m.mots.length <= 6 && max > 1) return max;
  return null;
}

/* ════════════════════════════════════════════════════════════════
   FAQ
   ════════════════════════════════════════════════════════════════ */

export async function lireFaq(m: Msg): Promise<ReponseBuddy | null> {
  const faqs = await prisma.fAQ.findMany({ orderBy: { ordre: "asc" }, take: 300 });
  const trouve = chercherFaq(m, faqs);
  if (!trouve) return null;
  return rep(`💡 ${trouve.faq.question}\n\n${trouve.faq.reponse}`, {
    humeur: "content",
    liens: [{ label: "Toute la FAQ", href: PAGE.faq }],
    suggestions: ["Ouvrir un ticket", "Aide"],
  });
}

/* ════════════════════════════════════════════════════════════════
   NAVIGATION, SALUTATIONS, AIDE
   ════════════════════════════════════════════════════════════════ */

export function navigation(m: Msg, env: Env): ReponseBuddy {
  let meilleure: { entree: (typeof NAVIGATION)[number]; taille: number } | null = null;
  for (const entree of NAVIGATION) {
    for (const mot of entree.mots) {
      if (a(m, mot) && (!meilleure || mot.length > meilleure.taille)) meilleure = { entree, taille: mot.length };
    }
  }
  if (!meilleure) {
    return rep("Sur quelle page voulez-vous aller ? 🧭", {
      humeur: "reflechit",
      suggestions: ["Va sur les absences", "Va sur la paie", "Va sur la facturation", "Va sur mes tickets"],
    });
  }
  const { entree } = meilleure;
  if (!aAcces(env, entree.module as ModuleBuddy)) return refusAcces(entree.module as ModuleBuddy);
  const href = PAGE[entree.cle];
  return rep(`C'est parti, je vous emmène sur « ${entree.label} » ! 🚀`, { humeur: "content", redirection: href, liens: [{ label: entree.label, href }] });
}

export async function salut(env: Env): Promise<ReponseBuddy> {
  const h = heureParis(env.now);
  const bonjour = h >= 18 || h < 4 ? "Bonsoir" : "Bonjour";
  const lignes: string[] = [];
  try {
    const id = env.entreprise.id;
    if (aAcces(env, "salaries")) {
      const ids = env.salaries.filter((s) => s.statut === "Actif").map((s) => s.id);
      const n = ids.length > 0 ? await prisma.rappelSalarie.count({ where: { salarieId: { in: ids }, traite: false, dateEcheance: { lt: versDate(env.today.iso) } } }) : 0;
      if (n > 0) lignes.push(`${pluriel(n, "échéance de document", "échéances de documents")} en retard`);
    }
    if (aAcces(env, "absences")) {
      const n = await prisma.absence.count({ where: { entrepriseId: id, statut: "En attente" } });
      if (n > 0) lignes.push(`${pluriel(n, "absence")} en attente de validation`);
    }
    if (aAcces(env, "paie")) {
      const n = await prisma.variablePaie.count({ where: { entrepriseId: id, statut: "En attente" } });
      if (n > 0) lignes.push(`${pluriel(n, "variable de paie", "variables de paie")} en attente`);
    }
    if (aAcces(env, "tickets")) {
      const n = await prisma.ticket.count({ where: { entrepriseId: id, statut: { not: "Clôturé" } } });
      if (n > 0) lignes.push(`${pluriel(n, "ticket RH ouvert", "tickets RH ouverts")}`);
    }
  } catch {
    // les compteurs ne sont qu'un bonus : on ignore les erreurs
  }
  const suggestions = [
    aAcces(env, "absences") ? "Ajouter une absence" : null,
    aAcces(env, "paie") ? "Ajouter une prime" : null,
    aAcces(env, "tickets") ? "Mes tickets" : null,
    "Actualités RH",
    "Aide",
  ].filter(Boolean) as string[];
  let texte = `${bonjour} ${env.session.prenom} ! 👋 Je suis Buddy, votre assistant.`;
  if (lignes.length > 0) texte += `\n\nPetit point sur votre espace :\n${puces(lignes)}`;
  texte += "\n\nQue puis-je faire pour vous ?";
  return rep(texte, { humeur: "content", suggestions: suggestions.slice(0, 5) });
}

export function aide(env: Env): ReponseBuddy {
  const blocs: string[] = [];
  if (aAcces(env, "salaries")) {
    blocs.push(`👥 Salariés\n• « Combien de salariés ? » · « Qui est en CDD ? »\n• « Fiche de Marie »\n• « Ajoute un salarié Jean Dupont comme comptable en CDI »\n• « Change le salaire de Jean à 2800 » · « Marie quitte l'entreprise le 30/11 »`);
    blocs.push(`⏰ Échéances de documents\n• « Ajoute une visite médicale pour Marie le 15/12/2026 » · « Titre de séjour de Jean le 03/03/2027 »\n• « Mes échéances » · « Échéances en retard » · « Visites médicales »\n• « La visite médicale de Marie est faite » · « Décale l'échéance de Jean » · « Supprime l'échéance de Marie »`);
  }
  if (aAcces(env, "absences")) {
    blocs.push(`🏖️ Absences\n• « Marie en congé du 03/11 au 07/11 » · « Jean malade demain »\n• « Qui est absent cette semaine ? »\n• « Supprime l'absence de Marie » · « Décale l'absence de Jean »`);
  }
  if (aAcces(env, "paie")) {
    blocs.push(`💰 Paie\n• « Prime de 500 € pour Jean » · « 4 heures supp à Marie »\n• « Retire la prime de Jean » · « Change la prime de Jean à 600 »\n• « Variables du mois » · « Récap de la paie »`);
  }
  if (aAcces(env, "tickets")) {
    blocs.push(`🎫 Tickets & recrutement\n• « Ouvre un ticket pour… » · « Mes tickets » · « Réponds au 2 »\n• « Je veux recruter un comptable » · « Mes demandes de recrutement »`);
  }
  if (aAcces(env, "helpdesk")) {
    blocs.push(`🛠️ Helpdesk\n• « J'ai un bug sur la page paie » · « Mes tickets helpdesk »`);
  }
  if (aAcces(env, "entreprise") || aAcces(env, "paie")) {
    blocs.push(`💳 Abonnement & facturation\n• « Mon abonnement » · « Quelles sont les formules ? »\n• « Je veux passer à la formule Premium » · « Annule ma demande d'évolution »\n• « Ma facture du mois »`);
  }
  blocs.push(`📰 Actualité RH & FAQ\n• « Actualités paie » · « Résume l'actu juridique » · « Quoi de neuf en recrutement ? »\n• Posez-moi une question : « Comment déclarer un arrêt maladie ? »`);
  blocs.push(`🧭 Navigation\n• « Va sur la facturation » · « Ouvre les absences »`);
  return rep(`Voici ce que je sais faire :\n\n${blocs.join("\n\n")}\n\nVous pouvez dire « annuler » à tout moment pour arrêter une demande en cours.`, {
    humeur: "content",
    suggestions: ["Combien de salariés ?", "Qui est absent cette semaine ?", "Actualités RH", "Mon abonnement"],
  });
}

export type { SalarieLite };
