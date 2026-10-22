// lib/buddy/flux-echeances.ts
// Échéances de documents des salariés (visite médicale, titre de séjour, avenant…) :
// ajout, consultation, « traité », report et suppression.

import { prisma } from "@/lib/prisma";
import { a, aPrefixe, analyserDates, fmtDate, trouverSalaries, versDate, type Msg } from "./outils";
import { pluriel, puces, rep } from "./moteur";
import { PAGE } from "./pages";
import type { Slot } from "./types";
import { elementChoisi, nomComplet, nomsDesSalaries, slotChoix, slotCible, slotDate, slotSalaries, slotTexte, type Element } from "./slots";
import { joursAvant, libelleRappel, statutRappel, texteDelai, TYPES_RAPPEL, typeDe } from "@/lib/rappels";
import type { Data, Env, Flow, ReponseBuddy } from "./types";

/* ───────────── Reconnaissance du type d'échéance ───────────── */

export function detecterTypeEcheance(m: Msg): string | null {
  if (aPrefixe(m, "avenant")) return "AVENANT";
  if (a(m, "periode d essai", "fin d essai", "fin de periode d essai") || aPrefixe(m, "essai")) return "PERIODE_ESSAI";
  if (aPrefixe(m, "sejour") || a(m, "titre de sejour", "carte de sejour")) return "TITRE_SEJOUR";
  if (a(m, "visite medicale", "visite medecine", "medecine du travail", "visite d embauche", "visite embauche") || (aPrefixe(m, "visite") && aPrefixe(m, "medical", "medecin"))) {
    return a(m, "embauche") ? "VISITE_EMBAUCHE" : "VISITE_PERIODIQUE";
  }
  if (a(m, "entretien professionnel", "entretien pro")) return "ENTRETIEN_PRO";
  if (a(m, "entretien annuel", "entretien individuel", "entretien d evaluation")) return "ENTRETIEN_ANNUEL";
  if (aPrefixe(m, "habilit", "caces", "permis")) return "HABILITATION";
  if (aPrefixe(m, "dispense")) return "DISPENSE_MUTUELLE";
  if (aPrefixe(m, "formation")) return "FORMATION";
  if (a(m, "autre", "autres")) return "AUTRE";
  return null;
}

/** Types assez précis pour comprendre qu'on parle d'une échéance, même sans le mot « échéance ». */
export function typeEcheanceFort(m: Msg): boolean {
  const t = detecterTypeEcheance(m);
  return t !== null && t !== "FORMATION" && t !== "AUTRE";
}

export const motEcheance = (m: Msg): boolean => aPrefixe(m, "echeance", "rappel");

const iso = (d: Date) => d.toISOString().slice(0, 10);


/* ───────────── Dates relatives (« dans 2 mois », « dans 15 jours ») ───────────── */

const NOMBRES: Record<string, number> = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, douze: 12 };

export function dateRelative(m: Msg, refIso: string): string | null {
  const mm = m.norm.match(/\bdans (\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|douze) (jour|jours|semaine|semaines|mois|an|ans|annee|annees)\b/);
  if (!mm) return null;
  const n = /^\d+$/.test(mm[1]) ? parseInt(mm[1], 10) : NOMBRES[mm[1]];
  if (!n || n > 120) return null;
  const unite = mm[2];
  const [y, mo, d] = refIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (unite.startsWith("jour")) dt.setUTCDate(dt.getUTCDate() + n);
  else if (unite.startsWith("semaine")) dt.setUTCDate(dt.getUTCDate() + 7 * n);
  else if (unite === "mois") {
    const cible = new Date(Date.UTC(y, mo - 1 + n, 1));
    const dernier = new Date(Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0)).getUTCDate();
    cible.setUTCDate(Math.min(d, dernier));
    return cible.toISOString().slice(0, 10);
  } else dt.setUTCFullYear(dt.getUTCFullYear() + n);
  return dt.toISOString().slice(0, 10);
}

/** Comme slotDate, mais comprend aussi « dans 3 mois ». */
function slotDateEcheanceAvec(cle: string, question: string): Slot {
  const base = slotDate({ cle, question, suggestions: ["Dans 1 mois", "Dans 3 mois", "Dans 6 mois"] });
  return {
    ...base,
    async extraire(m, d, env, mode) {
      if (!mode.ecraser && d[cle]) return false;
      const rel = dateRelative(m, env.today.iso);
      if (rel) {
        d[cle] = rel;
        return true;
      }
      return base.extraire(m, d, env, mode);
    },
  };
}

/* ───────────── Ajout ───────────── */

const slotTypeEcheance = slotChoix({
  cle: "type",
  options: TYPES_RAPPEL.map((t) => ({ code: t.code, label: `${t.icone} ${t.label}` })),
  detecter: detecterTypeEcheance,
  question: "Quel type d'échéance ?",
  suggestions: ["Visite médicale", "Titre de séjour", "Avenant", "Entretien annuel"],
});

const slotLibelle = slotTexte({
  cle: "libelle",
  question: "De quelle échéance s'agit-il ? (ex : renouvellement du permis B)",
  min: 3,
  max: 120,
  requis: (d) => d.type === "AUTRE",
  etiquettes: ["libelle", "libellé", "echeance", "échéance"],
});

const slotDateEcheance = slotDateEcheanceAvec("date", "Quelle est la date d'échéance ? (ex : 15/12/2026, dans 2 mois, le 3 mars)");

function ligneEcheance(type: string, libelle: string | null | undefined, date: string): string {
  const j = joursAvant(date);
  return `${typeDe(type).icone} ${libelleRappel({ type, libelle })} — ${fmtDate(date)} (${texteDelai(j)})`;
}

export const echeanceAjout: Flow = {
  id: "echeance_ajout",
  module: "salaries",
  slots: [slotSalaries({ multiple: true }), slotTypeEcheance, slotLibelle, slotDateEcheance],

  confirmation(d, env) {
    return `Je vais ajouter cette échéance :\n${puces([ligneEcheance(d.type, d.libelle, d.date), `Salarié(s) : ${nomsDesSalaries(d.salarieIds, env)}`])}`;
  },

  async executer(d, env) {
    const crees: string[] = [];
    const doublons: string[] = [];
    for (const id of d.salarieIds as string[]) {
      const s = env.salaries.find((x) => x.id === id);
      if (!s) continue;
      const existe = await prisma.rappelSalarie.findFirst({
        where: { salarieId: id, type: d.type, dateEcheance: versDate(d.date), traite: false },
      });
      if (existe) {
        doublons.push(nomComplet(s));
        continue;
      }
      await prisma.rappelSalarie.create({
        data: { salarieId: id, type: d.type, libelle: d.libelle ?? null, dateEcheance: versDate(d.date) },
      });
      crees.push(nomComplet(s));
    }
    if (crees.length === 0) {
      return rep(`Cette échéance existe déjà pour ${doublons.join(", ")}, je n'ai rien ajouté.`, { humeur: "neutre" });
    }
    let texte = `✅ Échéance ajoutée pour ${crees.join(", ")} :\n${puces([ligneEcheance(d.type, d.libelle, d.date)])}\nVous la retrouverez sur la fiche du salarié et sur votre tableau de bord.`;
    if (doublons.length > 0) texte += `\n⚠️ Déjà existante (ignorée) : ${doublons.join(", ")}.`;
    return rep(texte, {
      humeur: "content",
      liens: [{ label: "Voir le tableau de bord", href: PAGE.dashboard }],
      suggestions: ["Mes échéances", "Ajouter une autre échéance"],
    });
  },
};

/* ───────────── Choix d'une échéance existante ───────────── */

const salarieOptionnel = () =>
  slotSalaries({ multiple: true, requis: (d) => Array.isArray(d.candidats) && d.candidats.length > 0 });

async function chargerEcheancesOuvertes(d: Data, env: Env): Promise<Element[]> {
  const voulus: string[] = Array.isArray(d.salarieIds) ? d.salarieIds : [];
  const actifs = env.salaries.filter((s) => s.statut === "Actif").map((s) => s.id);
  const ids = voulus.length > 0 ? voulus.filter((i) => actifs.includes(i)) : actifs;
  if (ids.length === 0) return [];
  const rappels = await prisma.rappelSalarie.findMany({
    where: { salarieId: { in: ids }, traite: false },
    orderBy: { dateEcheance: "asc" },
    take: 15,
  });
  return rappels.map((r) => {
    const s = env.salaries.find((x) => x.id === r.salarieId);
    const date = iso(r.dateEcheance);
    return {
      id: r.id,
      salarieId: r.salarieId,
      type: r.type as string,
      libelle: r.libelle as string | null,
      date,
      label: `${typeDe(r.type).icone} ${libelleRappel(r)} — ${s ? nomComplet(s) : "?"} — ${fmtDate(date)} (${texteDelai(joursAvant(date))})`,
    };
  });
}

function filtreEcheance(m: Msg, items: Element[], env: Env): Element[] | null {
  let f = items;
  let applique = false;
  const t = detecterTypeEcheance(m);
  if (t && t !== "AUTRE") {
    f = f.filter((i) => i.type === t);
    applique = true;
  }
  const noms = trouverSalaries(m, env.salaries.filter((s) => items.some((i) => i.salarieId === s.id)));
  if (noms.length > 0) {
    const ids = new Set(noms.map((s) => s.id));
    f = f.filter((i) => ids.has(i.salarieId));
    applique = true;
  }
  return applique ? f : null;
}

const videEcheance = (d: Data, env: Env) =>
  Array.isArray(d.salarieIds) && d.salarieIds.length > 0
    ? `Aucune échéance à traiter pour ${nomsDesSalaries(d.salarieIds, env)}.`
    : "Aucune échéance en cours. Vous pouvez en ajouter une : « Ajoute une visite médicale pour Marie ».";

const slotEcheance = (titre: string) =>
  slotCible({
    cle: "cibleId",
    titre,
    charger: chargerEcheancesOuvertes,
    filtrer: filtreEcheance,
    vide: videEcheance,
    pret: (d) => !d.candidats,
  });

function idsAutorises(env: Env): string[] {
  return env.salaries.map((s) => s.id);
}

/* ───────────── Marquer comme traitée ───────────── */

export const echeanceTraiter: Flow = {
  id: "echeance_traiter",
  module: "salaries",
  slots: [salarieOptionnel(), slotEcheance("Quelle échéance est traitée ?")],
  confirmation(d) {
    const e = elementChoisi(d, "cibleId");
    return `Je vais marquer cette échéance comme traitée :\n${puces([e?.label ?? "—"])}`;
  },
  async executer(d, env) {
    const r = await prisma.rappelSalarie.updateMany({
      where: { id: d.cibleId, salarieId: { in: idsAutorises(env) }, traite: false },
      data: { traite: true, traiteAt: new Date() },
    });
    if (r.count === 0) return rep("Cette échéance n'existe plus ou est déjà traitée, je n'ai rien modifié.", { humeur: "triste" });
    return rep("✅ Échéance marquée comme traitée.", {
      humeur: "content",
      liens: [{ label: "Voir le tableau de bord", href: PAGE.dashboard }],
      suggestions: ["Mes échéances"],
    });
  },
};

/* ───────────── Décaler / modifier la date ───────────── */

export const echeanceModif: Flow = {
  id: "echeance_modif",
  module: "salaries",
  slots: [
    salarieOptionnel(),
    slotEcheance("Quelle échéance voulez-vous décaler ?"),
    slotDateEcheanceAvec("nouvelleDate", "Quelle est la nouvelle date d'échéance ? (ex : 15/01/2027, dans 2 mois)"),
  ],
  confirmation(d) {
    const e = elementChoisi(d, "cibleId");
    return `Je vais changer la date de cette échéance :\n${puces([`Avant : ${e?.label ?? "—"}`, `Après : ${fmtDate(d.nouvelleDate)} (${texteDelai(joursAvant(d.nouvelleDate))})`])}`;
  },
  async executer(d, env) {
    const r = await prisma.rappelSalarie.updateMany({
      where: { id: d.cibleId, salarieId: { in: idsAutorises(env) }, traite: false },
      data: { dateEcheance: versDate(d.nouvelleDate) },
    });
    if (r.count === 0) return rep("Cette échéance n'existe plus ou est déjà traitée, je n'ai rien modifié.", { humeur: "triste" });
    return rep("✅ Date de l'échéance modifiée.", { humeur: "content", liens: [{ label: "Voir le tableau de bord", href: PAGE.dashboard }], suggestions: ["Mes échéances"] });
  },
};

/* ───────────── Suppression ───────────── */

export const echeanceSuppr: Flow = {
  id: "echeance_suppr",
  module: "salaries",
  slots: [salarieOptionnel(), slotEcheance("Quelle échéance voulez-vous supprimer ?")],
  confirmation(d) {
    const e = elementChoisi(d, "cibleId");
    return `Je vais supprimer cette échéance :\n${puces([e?.label ?? "—"])}`;
  },
  async executer(d, env) {
    const r = await prisma.rappelSalarie.deleteMany({ where: { id: d.cibleId, salarieId: { in: idsAutorises(env) } } });
    if (r.count === 0) return rep("Cette échéance n'existe plus, je n'ai rien supprimé.", { humeur: "triste" });
    return rep("✅ Échéance supprimée.", { humeur: "content", suggestions: ["Mes échéances"] });
  },
};

/* ───────────── Consultation ───────────── */

export async function lireEcheances(m: Msg, env: Env): Promise<ReponseBuddy> {
  const nommes = trouverSalaries(m, env.salaries);
  const actifs = env.salaries.filter((s) => s.statut === "Actif");
  const cibles = nommes.length > 0 ? nommes : actifs;
  const ids = cibles.map((s) => s.id);
  const type = detecterTypeEcheance(m);
  const { periode } = analyserDates(m.brut, env.today.iso);
  const retardSeul = aPrefixe(m, "retard", "depasse", "expire", "perime");
  const toutes = a(m, "toutes", "tous", "tout", "toute") || type !== null || nommes.length > 0;

  type Ligne = { jours: number; texte: string; date: string };
  const lignes: Ligne[] = [];

  if (ids.length > 0) {
    const rappels = await prisma.rappelSalarie.findMany({
      where: { salarieId: { in: ids }, traite: false },
      orderBy: { dateEcheance: "asc" },
      take: 200,
    });
    for (const r of rappels) {
      if (type && type !== "AUTRE" && r.type !== type) continue;
      const s = env.salaries.find((x) => x.id === r.salarieId);
      const date = iso(r.dateEcheance);
      const jours = joursAvant(date);
      lignes.push({ jours, date, texte: `${typeDe(r.type).icone} ${libelleRappel(r)} — ${s ? nomComplet(s) : "?"} — ${fmtDate(date)} (${texteDelai(jours)})` });
    }
  }
  if (!type) {
    for (const s of cibles) {
      if (!s.dateFin) continue;
      const date = iso(s.dateFin);
      const jours = joursAvant(date);
      if (jours < -30) continue;
      lignes.push({ jours, date, texte: `⏳ Fin de contrat${s.typeContrat ? ` (${s.typeContrat})` : ""} — ${nomComplet(s)} — ${fmtDate(date)} (${texteDelai(jours)})` });
    }
  }

  let retenues = lignes.sort((x, y) => x.jours - y.jours);
  let portee = "";
  if (periode) {
    retenues = retenues.filter((l) => l.date >= periode.debut && l.date <= periode.fin);
    portee = " sur cette période";
  } else if (retardSeul) {
    retenues = retenues.filter((l) => l.jours < 0);
    portee = " en retard";
  } else if (!toutes) {
    retenues = retenues.filter((l) => l.jours <= 60);
    portee = " à surveiller (retards + 60 prochains jours)";
  }

  const qui = nommes.length === 1 ? ` — ${nomComplet(nommes[0])}` : "";
  if (retenues.length === 0) {
    return rep(`Aucune échéance${portee}${qui}. 🎉`, {
      humeur: "content",
      suggestions: ["Ajouter une échéance", "Toutes les échéances"],
    });
  }
  const retard = retenues.filter((l) => l.jours < 0).length;
  const affichees = retenues.slice(0, 12);
  const reste = retenues.length - affichees.length;
  let texte = `⏰ ${pluriel(retenues.length, "échéance")}${portee}${qui}${retard > 0 ? ` dont ${retard} en retard` : ""} :\n${puces(affichees.map((l) => l.texte))}`;
  if (reste > 0) texte += `\n… et ${pluriel(reste, "autre")}. Précisez un salarié ou un type pour affiner.`;
  return rep(texte, {
    humeur: retard > 0 ? "reflechit" : "neutre",
    liens: [{ label: "Voir le tableau de bord", href: PAGE.dashboard }],
    suggestions: ["Ajouter une échéance", "Marquer une échéance comme traitée", ...(toutes ? [] : ["Toutes les échéances"])],
  });
}
