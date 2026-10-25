// lib/buddy/flux-rh.ts
// Conversations guidées : salariés, absences, variables de paie.

import { prisma } from "@/lib/prisma";
import {
  a,
  aPrefixe,
  analyserDates,
  arrondi,
  compterJours,
  CONTRATS,
  detecterContrat,
  detecterMois,
  detecterTypeAbsence,
  detecterTypeVariable,
  eur,
  estPresentDansMois,
  fmtDate,
  fmtPeriode,
  LABELS_ABSENCE,
  LABELS_VARIABLE,
  nettoyer,
  NOMS_MOIS_AFFICHAGE,
  parseNombre,
  parseNombres,
  plain,
  titreCase,
  trouverSalaries,
  versDate,
  type Msg,
} from "./outils";
import { pluriel, puces, rep } from "./moteur";
import { PAGE } from "./pages";
import {
  elementChoisi,
  nomComplet,
  nomsDesSalaries,
  slotChoix,
  slotCible,
  slotDate,
  slotNombre,
  slotPeriode,
  slotSalaries,
  slotTexte,
  type Element,
} from "./slots";
import type { Data, Env, Flow, SalarieLite, Slot } from "./types";

/* ════════════════════════════════════════════════════════════════
   Outils communs
   ════════════════════════════════════════════════════════════════ */

export function fmtValeur(type: string, valeur: number): string {
  return type === "HEURE_SUPPLEMENTAIRE" ? `${valeur.toLocaleString("fr-FR")} h` : eur(valeur);
}

function descPeriode(debut: string, fin: string): string {
  const { ouvres } = compterJours(debut, fin);
  return `${fmtPeriode({ debut, fin })} (${pluriel(ouvres, "jour ouvré", "jours ouvrés")})`;
}

function nbFacturables(env: Env, y: number, m: number): number {
  return env.salaries.filter((s) => estPresentDansMois(s, y, m)).length;
}

const OPTIONS_ABSENCE = Object.entries(LABELS_ABSENCE).map(([code, label]) => ({ code, label }));
const OPTIONS_VARIABLE = Object.entries(LABELS_VARIABLE).map(([code, label]) => ({ code, label }));

/* ════════════════════════════════════════════════════════════════
   ABSENCES
   ════════════════════════════════════════════════════════════════ */

function detecterTypeAbsenceMessage(m: Msg, attendu: boolean): string | null {
  const t = detecterTypeAbsence(m);
  if (t) return t;
  if (attendu && a(m, "paye", "payes", "payee", "payees")) return "CONGE_PAYE";
  return null;
}

const slotTypeAbsence: Slot = slotChoix({
  cle: "type",
  options: OPTIONS_ABSENCE,
  detecter: (m) => detecterTypeAbsenceMessage(m, true),
  question: "Quel type d'absence ?",
  suggestions: ["Congé payé", "RTT", "Maladie", "Congé sans solde"],
});

export const absenceAjout: Flow = {
  id: "absence_ajout",
  module: "absences",
  slots: [slotSalaries({ multiple: true }), slotTypeAbsence, slotPeriode()],

  async verifier(d, env) {
    const { calendaires } = compterJours(d.debut, d.fin);
    if (calendaires > 366) return { message: "Cette période dépasse un an, c'est probablement une erreur de date.", reset: ["debut", "fin"] };
    for (const id of d.salarieIds as string[]) {
      const ex = await prisma.absence.findFirst({
        where: { salarieId: id, entrepriseId: env.entreprise.id, dateDebut: { lte: versDate(d.fin) }, dateFin: { gte: versDate(d.debut) } },
      });
      if (ex) {
        const nom = nomsDesSalaries([id], env);
        return {
          message: `❌ ${nom} a déjà une absence (${LABELS_ABSENCE[ex.type] ?? ex.type}, ${ex.statut}) du ${fmtDate(ex.dateDebut)} au ${fmtDate(ex.dateFin)}, qui chevauche cette période.\nChoisissez d'autres dates, ou dites « annuler ».`,
          reset: ["debut", "fin"],
        };
      }
    }
    return null;
  },

  confirmation(d, env) {
    const lignes = [
      `${LABELS_ABSENCE[d.type]} — ${nomsDesSalaries(d.salarieIds, env)}`,
      descPeriode(d.debut, d.fin),
    ];
    if (d.fin < env.today.iso) lignes.push("⚠️ Cette période est dans le passé.");
    if (compterJours(d.debut, d.fin).ouvres === 0) lignes.push("⚠️ Cette période ne contient aucun jour ouvré (week-end).");
    return `Je vais déclarer cette absence :\n${puces(lignes)}`;
  },

  async executer(d, env) {
    const crees: string[] = [];
    const refuses: string[] = [];
    for (const id of d.salarieIds as string[]) {
      const s = env.salaries.find((x) => x.id === id);
      if (!s) continue;
      const ex = await prisma.absence.findFirst({
        where: { salarieId: id, entrepriseId: env.entreprise.id, dateDebut: { lte: versDate(d.fin) }, dateFin: { gte: versDate(d.debut) } },
      });
      if (ex) {
        refuses.push(nomComplet(s));
        continue;
      }
      await prisma.absence.create({
        data: { salarieId: id, entrepriseId: env.entreprise.id, type: d.type, dateDebut: versDate(d.debut), dateFin: versDate(d.fin) },
      });
      crees.push(nomComplet(s));
    }
    if (crees.length === 0) return rep(`❌ Rien n'a été enregistré : ${refuses.join(", ")} a déjà une absence sur cette période.`, { humeur: "triste" });
    let texte = `✅ Absence enregistrée : ${LABELS_ABSENCE[d.type]} pour ${crees.join(", ")} ${descPeriode(d.debut, d.fin)}.\nElle est « en attente » : notre équipe la valide ensuite.`;
    if (refuses.length > 0) texte += `\n⚠️ Ignoré (absence déjà existante) : ${refuses.join(", ")}.`;
    return rep(texte, {
      humeur: "content",
      liens: [{ label: "Voir les absences", href: PAGE.absences }],
      suggestions: ["Ajouter une autre absence", "Absences en attente"],
    });
  },
};

/* ── Choix d'une absence en attente (suppression / modification) ── */

async function chargerAbsencesAttente(d: Data, env: Env): Promise<Element[]> {
  const ids: string[] = Array.isArray(d.salarieIds) ? d.salarieIds : [];
  const absences = await prisma.absence.findMany({
    where: { entrepriseId: env.entreprise.id, statut: "En attente", ...(ids.length > 0 ? { salarieId: { in: ids } } : {}) },
    include: { salarie: true },
    orderBy: { dateDebut: "asc" },
    take: 15,
  });
  return absences.map((x) => ({
    id: x.id,
    salarieId: x.salarieId,
    type: x.type as string,
    debut: x.dateDebut.toISOString().slice(0, 10),
    fin: x.dateFin.toISOString().slice(0, 10),
    label: `${LABELS_ABSENCE[x.type] ?? x.type} — ${nomComplet(x.salarie)} — ${
      x.dateDebut.getTime() === x.dateFin.getTime() ? fmtDate(x.dateDebut) : `${fmtDate(x.dateDebut)} → ${fmtDate(x.dateFin)}`
    }`,
  }));
}

function filtreAbsence(avecDates: boolean) {
  return (m: Msg, items: Element[], env: Env): Element[] | null => {
    let f = items;
    let applique = false;
    const t = detecterTypeAbsence(m);
    if (t && !(t === "CONGE_PAYE" && !a(m, "paye", "payes", "cp"))) {
      f = f.filter((i) => i.type === t);
      applique = true;
    }
    if (avecDates) {
      const p = analyserDates(m.brut, env.today.iso).periode;
      if (p) {
        f = f.filter((i) => i.debut <= p.fin && i.fin >= p.debut);
        applique = true;
      }
    }
    const noms = trouverSalaries(m, env.salaries.filter((s) => items.some((i) => i.salarieId === s.id)));
    if (noms.length > 0) {
      const ids = new Set(noms.map((s) => s.id));
      f = f.filter((i) => ids.has(i.salarieId));
      applique = true;
    }
    return applique ? f : null;
  };
}

const videAbsence = (d: Data, env: Env) =>
  Array.isArray(d.salarieIds) && d.salarieIds.length > 0
    ? `Aucune absence « en attente » pour ${nomsDesSalaries(d.salarieIds, env)}.\nSeules les absences en attente de validation peuvent être supprimées ou modifiées ici ; pour une absence déjà validée, ouvrez un ticket RH.`
    : "Aucune absence « en attente » à traiter.\nSeules les absences en attente de validation peuvent être supprimées ou modifiées ici ; pour une absence déjà validée, ouvrez un ticket RH.";

const salarieOptionnel = () =>
  slotSalaries({ multiple: true, requis: (d) => Array.isArray(d.candidats) && d.candidats.length > 0 });

export const absenceSuppr: Flow = {
  id: "absence_suppr",
  module: "absences",
  slots: [
    salarieOptionnel(),
    slotCible({
      cle: "cibleId",
      titre: "Quelle absence voulez-vous supprimer ?",
      charger: chargerAbsencesAttente,
      filtrer: filtreAbsence(true),
      vide: videAbsence,
      pret: (d) => !d.candidats,
    }),
  ],
  confirmation(d) {
    const e = elementChoisi(d, "cibleId");
    return `Je vais supprimer cette absence :\n${puces([e?.label ?? "—"])}`;
  },
  async executer(d, env) {
    const r = await prisma.absence.deleteMany({ where: { id: d.cibleId, entrepriseId: env.entreprise.id, statut: "En attente" } });
    if (r.count === 0) return rep("Cette absence n'existe plus ou a déjà été validée, je n'ai rien supprimé.", { humeur: "triste" });
    return rep("✅ Absence supprimée.", {
      humeur: "content",
      liens: [{ label: "Voir les absences", href: PAGE.absences }],
      suggestions: ["Absences en attente"],
    });
  },
};

export const absenceModif: Flow = {
  id: "absence_modif",
  module: "absences",
  slots: [
    salarieOptionnel(),
    slotCible({
      cle: "cibleId",
      titre: "Quelle absence voulez-vous modifier ?",
      charger: chargerAbsencesAttente,
      filtrer: filtreAbsence(false),
      vide: videAbsence,
      pret: (d) => !d.candidats,
    }),
    slotPeriode({ question: "Quelles sont les nouvelles dates ? (ex : du 10/11 au 14/11)" }),
  ],
  async verifier(d, env) {
    const e = elementChoisi(d, "cibleId");
    if (!e) return null;
    const ex = await prisma.absence.findFirst({
      where: {
        salarieId: e.salarieId,
        entrepriseId: env.entreprise.id,
        id: { not: e.id },
        dateDebut: { lte: versDate(d.fin) },
        dateFin: { gte: versDate(d.debut) },
      },
    });
    if (ex) {
      return {
        message: `❌ Ces dates chevauchent une autre absence (${LABELS_ABSENCE[ex.type] ?? ex.type}) du ${fmtDate(ex.dateDebut)} au ${fmtDate(ex.dateFin)}.\nChoisissez d'autres dates, ou dites « annuler ».`,
        reset: ["debut", "fin"],
      };
    }
    return null;
  },
  confirmation(d) {
    const e = elementChoisi(d, "cibleId");
    return `Je vais modifier cette absence :\n${puces([`Avant : ${e?.label ?? "—"}`, `Après : ${descPeriode(d.debut, d.fin)}`])}`;
  },
  async executer(d, env) {
    const r = await prisma.absence.updateMany({
      where: { id: d.cibleId, entrepriseId: env.entreprise.id, statut: "En attente" },
      data: { dateDebut: versDate(d.debut), dateFin: versDate(d.fin) },
    });
    if (r.count === 0) return rep("Cette absence n'existe plus ou a déjà été validée, je n'ai rien modifié.", { humeur: "triste" });
    return rep(`✅ Absence modifiée : ${descPeriode(d.debut, d.fin)}.`, {
      humeur: "content",
      liens: [{ label: "Voir les absences", href: PAGE.absences }],
    });
  },
};

/* ════════════════════════════════════════════════════════════════
   VARIABLES DE PAIE
   ════════════════════════════════════════════════════════════════ */

const slotTypeVariable: Slot = slotChoix({
  cle: "type",
  options: OPTIONS_VARIABLE,
  detecter: detecterTypeVariable,
  question: "Quel type de variable ?",
  suggestions: ["Prime", "Heures supp.", "Note de frais", "Acompte"],
});

const slotValeur: Slot = slotNombre({
  cle: "valeur",
  question: (d) => (d.type === "HEURE_SUPPLEMENTAIRE" ? "Combien d'heures supplémentaires ? (ex : 4 ou 2h30)" : "Quel montant (en €) ?"),
  max: 100000,
});

const slotMois: Slot = {
  cle: "mois",
  requis: () => false,
  rempli: (d) => typeof d.mois === "number",
  async extraire(m, d, env, mode) {
    if (!mode.ecraser && typeof d.mois === "number") return false;
    const x = detecterMois(m);
    if (!x) return false;
    d.mois = x.mois;
    d.annee = x.annee;
    return true;
  },
  question: () => "",
};

function moisCible(d: Data, env: Env): { mois: number; annee: number } {
  return { mois: typeof d.mois === "number" ? d.mois : env.today.m, annee: typeof d.annee === "number" ? d.annee : env.today.y };
}

export const variableAjout: Flow = {
  id: "variable_ajout",
  module: "paie",
  slots: [slotSalaries({ multiple: true }), slotTypeVariable, slotValeur, slotMois],

  confirmation(d, env) {
    const { mois, annee } = moisCible(d, env);
    const lignes = [`${LABELS_VARIABLE[d.type]} de ${fmtValeur(d.type, d.valeur)} — ${nomsDesSalaries(d.salarieIds, env)}`, `Mois de paie : ${NOMS_MOIS_AFFICHAGE[mois - 1]} ${annee}`];
    if (d.salarieIds.length > 1) lignes[0] += ` (pour chacun)`;
    return `Je vais ajouter cette variable de paie :\n${puces(lignes)}`;
  },

  async executer(d, env) {
    const { mois, annee } = moisCible(d, env);
    const noms: string[] = [];
    for (const id of d.salarieIds as string[]) {
      const s = env.salaries.find((x) => x.id === id);
      if (!s) continue;
      await prisma.variablePaie.create({
        data: { salarieId: id, entrepriseId: env.entreprise.id, type: d.type, valeur: d.valeur, mois, annee },
      });
      noms.push(nomComplet(s));
    }
    if (noms.length === 0) return rep("Je n'ai trouvé aucun salarié valide, rien n'a été enregistré.", { humeur: "triste" });
    return rep(
      `✅ Variable ajoutée : ${LABELS_VARIABLE[d.type]} de ${fmtValeur(d.type, d.valeur)} pour ${noms.join(", ")} (${NOMS_MOIS_AFFICHAGE[mois - 1]} ${annee}).\nElle est « en attente » : notre équipe la prend en compte pour la paie.`,
      { humeur: "content", liens: [{ label: "Voir la saisie de paie", href: PAGE.saisie }], suggestions: ["Variables du mois", "Ajouter une autre variable"] }
    );
  },
};

async function chargerVariablesAttente(d: Data, env: Env): Promise<Element[]> {
  const ids: string[] = Array.isArray(d.salarieIds) ? d.salarieIds : [];
  const vars = await prisma.variablePaie.findMany({
    where: { entrepriseId: env.entreprise.id, statut: "En attente", ...(ids.length > 0 ? { salarieId: { in: ids } } : {}) },
    include: { salarie: true },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  return vars.map((v) => ({
    id: v.id,
    salarieId: v.salarieId,
    type: v.type as string,
    valeur: v.valeur,
    label: `${LABELS_VARIABLE[v.type] ?? v.type} — ${fmtValeur(v.type, v.valeur)} — ${nomComplet(v.salarie)} (${String(v.mois).padStart(2, "0")}/${v.annee})`,
  }));
}

function filtreVariable(modification: boolean) {
  return (m: Msg, items: Element[], env: Env): Element[] | null => {
    let f = items;
    let applique = false;
    const t = detecterTypeVariable(m);
    if (t) {
      f = f.filter((i) => i.type === t);
      applique = true;
    }
    const nombres = parseNombres(m.brut);
    // en modification, le dernier nombre est la NOUVELLE valeur : seul le premier sert à retrouver la variable
    const critere = modification ? (nombres.length >= 2 ? nombres[0] : null) : nombres.length > 0 ? nombres[0] : null;
    if (critere !== null) {
      f = f.filter((i) => Math.abs(i.valeur - critere) < 0.005);
      applique = true;
    }
    const noms = trouverSalaries(m, env.salaries.filter((s) => items.some((i) => i.salarieId === s.id)));
    if (noms.length > 0) {
      const ids = new Set(noms.map((s) => s.id));
      f = f.filter((i) => ids.has(i.salarieId));
      applique = true;
    }
    return applique ? f : null;
  };
}

const videVariable = (d: Data, env: Env) =>
  Array.isArray(d.salarieIds) && d.salarieIds.length > 0
    ? `Aucune variable « en attente » pour ${nomsDesSalaries(d.salarieIds, env)}.\nSeules les variables en attente de traitement peuvent être supprimées ou modifiées ici.`
    : "Aucune variable « en attente » à traiter.\nSeules les variables en attente de traitement peuvent être supprimées ou modifiées ici.";

export const variableSuppr: Flow = {
  id: "variable_suppr",
  module: "paie",
  slots: [
    salarieOptionnel(),
    slotCible({
      cle: "cibleId",
      titre: "Quelle variable voulez-vous supprimer ?",
      charger: chargerVariablesAttente,
      filtrer: filtreVariable(false),
      vide: videVariable,
      pret: (d) => !d.candidats,
    }),
  ],
  confirmation(d) {
    const e = elementChoisi(d, "cibleId");
    return `Je vais supprimer cette variable de paie :\n${puces([e?.label ?? "—"])}`;
  },
  async executer(d, env) {
    const r = await prisma.variablePaie.deleteMany({ where: { id: d.cibleId, entrepriseId: env.entreprise.id, statut: "En attente" } });
    if (r.count === 0) return rep("Cette variable n'existe plus ou a déjà été traitée, je n'ai rien supprimé.", { humeur: "triste" });
    return rep("✅ Variable supprimée.", { humeur: "content", liens: [{ label: "Voir la saisie de paie", href: PAGE.saisie }], suggestions: ["Variables du mois"] });
  },
};

export const variableModif: Flow = {
  id: "variable_modif",
  module: "paie",
  slots: [
    salarieOptionnel(),
    slotCible({
      cle: "cibleId",
      titre: "Quelle variable voulez-vous modifier ?",
      charger: chargerVariablesAttente,
      filtrer: filtreVariable(true),
      vide: videVariable,
      pret: (d) => !d.candidats,
    }),
    slotNombre({
      cle: "valeur",
      dernier: true,
      max: 100000,
      question: (d) => {
        const e = elementChoisi(d, "cibleId");
        return e?.type === "HEURE_SUPPLEMENTAIRE" ? "Quel est le nouveau nombre d'heures ?" : "Quel est le nouveau montant (en €) ?";
      },
    }),
  ],
  confirmation(d) {
    const e = elementChoisi(d, "cibleId");
    const type = (e?.type as string) ?? "PRIME";
    return `Je vais modifier cette variable de paie :\n${puces([`Avant : ${e?.label ?? "—"}`, `Après : ${fmtValeur(type, d.valeur)}`])}`;
  },
  async executer(d, env) {
    const r = await prisma.variablePaie.updateMany({
      where: { id: d.cibleId, entrepriseId: env.entreprise.id, statut: "En attente" },
      data: { valeur: d.valeur },
    });
    if (r.count === 0) return rep("Cette variable n'existe plus ou a déjà été traitée, je n'ai rien modifié.", { humeur: "triste" });
    return rep("✅ Variable modifiée.", { humeur: "content", liens: [{ label: "Voir la saisie de paie", href: PAGE.saisie }] });
  },
};

/* ════════════════════════════════════════════════════════════════
   SALARIÉS : ajout
   ════════════════════════════════════════════════════════════════ */

const PARTICULES = new Set(["de", "du", "des", "la", "le", "d", "van", "von", "der", "den", "di", "da"]);

function formaterNom(texte: string): string {
  return titreCase(texte)
    .split(" ")
    .map((w, i) => (i > 0 && PARTICULES.has(plain(w)) ? w.toLowerCase() : w))
    .join(" ");
}

const MOTS_CLES_IDENTITE = new Set([
  "salarie", "salariee", "employe", "employee", "collaborateur", "collaboratrice", "personne", "nomme", "nommee", "appelle", "embauche", "recrute", "ajoute", "cree", "creer", "ajouter", "enregistre",
]);

export function extraireIdentite(brut: string): { prenom: string; nom?: string } | null {
  const mots = brut.split(/\s+/).filter(Boolean);
  for (let i = 0; i < mots.length; i++) {
    if (!MOTS_CLES_IDENTITE.has(plain(mots[i]))) continue;
    const suite: string[] = [];
    for (let j = i + 1; j < mots.length && suite.length < 5; j++) {
      const w = mots[j].replace(/[,;:.!?]+$/, "");
      if (/^[A-ZÀ-ÖØ-Þ][\p{L}'’-]*$/u.test(w)) {
        suite.push(w);
      } else if (suite.length === 0 && ["le", "la", "un", "une", "qui", "s'appelle", "s’appelle", "nomme", "nommé", "nommée", "appelé", "appelée", "pour", ":"].includes(w.toLowerCase())) {
        continue;
      } else if (suite.length >= 1 && PARTICULES.has(plain(w))) {
        suite.push(w);
      } else {
        break;
      }
    }
    while (suite.length > 0 && PARTICULES.has(plain(suite[suite.length - 1]))) suite.pop();
    if (suite.length >= 2) return { prenom: suite[0], nom: suite.slice(1).join(" ") };
    if (suite.length === 1) return { prenom: suite[0] };
  }
  return null;
}

const slotIdentite: Slot = {
  cle: "identite",
  texteLibre: true,
  requis: () => true,
  rempli: (d) => !!d.prenom && !!d.nom,
  async extraire(m, d, env, mode) {
    if (mode.ecraser) return false;
    if (mode.attendu) {
      const texte = nettoyer(m.brut.replace(/[^\p{L}\s'’-]/gu, " "), 80);
      const mots = texte.split(" ").filter(Boolean);
      if (mots.length === 0) return false;
      if (d.prenom && !d.nom) {
        d.nom = formaterNom(texte);
        return true;
      }
      if (mots.length === 1) {
        d.prenom = formaterNom(mots[0]);
        return true;
      }
      d.prenom = formaterNom(mots[0]);
      d.nom = formaterNom(mots.slice(1).join(" "));
      return true;
    }
    if (d.prenom && d.nom) return false;
    const id = extraireIdentite(m.brut);
    if (!id) return false;
    d.prenom = formaterNom(id.prenom);
    if (id.nom) d.nom = formaterNom(id.nom);
    return true;
  },
  question: (d) => (d.prenom && !d.nom ? `Quel est le nom de famille de ${d.prenom} ?` : "Quels sont le prénom et le nom du nouveau salarié ? (ex : Jean Dupont)"),
};

const slotPoste = slotTexte({
  cle: "poste",
  question: "Quel est son poste ? (ex : Comptable)",
  majuscule: true,
  max: 80,
  etiquettes: ["poste", "metier", "fonction"],
  depuisPhrase: (m) => {
    const mm = m.brut.match(
      /\b(?:comme|en tant que|en qualité de|en qualite de|au poste de|au poste d'|poste de|poste d'|poste :|fonction de)\s+(.+?)(?=\s+(?:en|à|a|dès|des|début|debut|avec|salaire|pour|le|au|cdi|cdd|stage|alternance|intérim|interim)\s|[,.;]|$)/i
    );
    return mm ? mm[1] : null;
  },
});

const slotContrat: Slot = slotChoix({
  cle: "typeContrat",
  options: CONTRATS.map((c) => ({ code: c, label: c })),
  detecter: detecterContrat,
  question: "Quel type de contrat ?",
});

const slotDateEntree: Slot = slotDate({
  cle: "dateDebut",
  question: "À partir de quelle date ? (ex : 02/11/2026, lundi prochain)",
});

const slotSalaire: Slot = slotNombre({
  cle: "salaireMensuel",
  question: "Quel est son salaire mensuel brut (en €) ? Vous pouvez aussi répondre « passer ».",
  optionnel: true,
  max: 100000,
  motsCles: ["salaire", "euros", "euro", "brut", "mensuel"],
});

export const salarieAjout: Flow = {
  id: "salarie_ajout",
  module: "salaries",
  slots: [slotIdentite, slotPoste, slotContrat, slotDateEntree, slotSalaire],

  confirmation(d, env) {
    const y = Number(d.dateDebut.slice(0, 4));
    const mo = Number(d.dateDebut.slice(5, 7));
    const lignes = [
      `${d.prenom} ${d.nom} — ${d.poste}`,
      `Contrat : ${d.typeContrat}, à partir du ${fmtDate(d.dateDebut)}`,
      typeof d.salaireMensuel === "number" ? `Salaire mensuel brut : ${eur(d.salaireMensuel)}` : "Salaire : non renseigné",
    ];
    const doublon = env.salaries.find((s) => plain(s.prenom) === plain(d.prenom) && plain(s.nom) === plain(d.nom));
    if (doublon) lignes.push(`⚠️ Un salarié du même nom existe déjà (${doublon.poste}).`);
    let texte = `Je vais créer ce salarié :\n${puces(lignes)}`;
    const ab = env.entreprise.abonnement;
    if (ab && ab.prixSalarieSupp > 0) {
      const apres = nbFacturables(env, y, mo) + 1;
      if (apres > ab.salariesInclus) {
        texte += `\n\n💳 Ce salarié sera facturé en supplément (+${eur(ab.prixSalarieSupp)} sur la facture de ${NOMS_MOIS_AFFICHAGE[mo - 1]}) : votre formule « ${ab.nom} » inclut ${ab.salariesInclus} salarié(s) et vous en aurez ${apres}.`;
        texte += `\nEn confirmant, vous acceptez ce supplément.\n💡 Une formule supérieure peut revenir moins cher : page « Mon entreprise › Abonnement RH ».`;
      }
    }
    const fp = env.entreprise.abonnementPaie;
    if (fp && fp.prixBulletinSupp > 0) {
      const apres = nbFacturables(env, y, mo) + 1;
      if (apres > fp.bulletinsInclus) {
        texte += `\n\n📄 Bulletin de paie en supplément (+${eur(fp.prixBulletinSupp)}/mois) : votre formule paie « ${fp.nom} » inclut ${fp.bulletinsInclus} bulletin(s). En confirmant, vous acceptez ce supplément.`;
      }
    }
    return texte;
  },

  async executer(d, env) {
    // Version démo : nombre de salariés limité
    const ent = await prisma.entreprise.findUnique({ where: { id: env.entreprise.id }, select: { demo: true } });
    if (ent?.demo) {
      const nb = await prisma.salarie.count({ where: { entrepriseId: env.entreprise.id } });
      if (nb >= 30) return rep("La démo est limitée à 30 salariés (remise à zéro chaque nuit). Je n'ai rien ajouté.", { humeur: "triste" });
    }
    const cree = await prisma.salarie.create({
      data: {
        entrepriseId: env.entreprise.id,
        prenom: d.prenom,
        nom: d.nom,
        poste: d.poste,
        typeContrat: d.typeContrat,
        dateDebut: versDate(d.dateDebut),
        ...(typeof d.salaireMensuel === "number" ? { salaireMensuel: d.salaireMensuel, salaireAnnuel: arrondi(d.salaireMensuel * 12) } : {}),
      },
    });
    env.dernierSalarieId = cree.id;
    env.salaries.push({
      id: cree.id, prenom: d.prenom, nom: d.nom, poste: d.poste, statut: "Actif", typeContrat: d.typeContrat, dateDebut: versDate(d.dateDebut),
      dateFin: null, salaireMensuel: typeof d.salaireMensuel === "number" ? d.salaireMensuel : null, salaireAnnuel: null, email: null, telephone: null, heuresHebdomadaires: null,
    });
    return rep(`✅ ${d.prenom} ${d.nom} a été ajouté(e) à vos salariés.\nVous pouvez compléter sa fiche (adresse, n° de sécurité sociale, documents…) depuis la page Salariés.`, {
      humeur: "content",
      liens: [{ label: "Ouvrir la page Salariés", href: PAGE.salaries }],
      suggestions: [`Ajouter une absence pour ${d.prenom}`, `Ajouter une prime pour ${d.prenom}`],
    });
  },
};

/* ════════════════════════════════════════════════════════════════
   SALARIÉS : modification
   ════════════════════════════════════════════════════════════════ */

type TypeChamp = "texte" | "nombre" | "contrat" | "email" | "tel" | "date";
const CHAMPS: Record<string, { label: string; type: TypeChamp; question: string }> = {
  poste: { label: "le poste", type: "texte", question: "Quel est le nouveau poste ?" },
  salaireMensuel: { label: "le salaire mensuel brut", type: "nombre", question: "Quel est le nouveau salaire mensuel brut (en €) ?" },
  typeContrat: { label: "le type de contrat", type: "contrat", question: "Quel est le nouveau type de contrat ? (CDI, CDD, Alternance, Stage, Intérim)" },
  email: { label: "l'email", type: "email", question: "Quel est le nouvel email ?" },
  telephone: { label: "le téléphone", type: "tel", question: "Quel est le nouveau numéro de téléphone ?" },
  dateFin: { label: "la date de fin de contrat", type: "date", question: "Quelle est la date de fin de contrat ? (ex : 30/11/2026)" },
  dateDebut: { label: "la date d'entrée", type: "date", question: "Quelle est la nouvelle date d'entrée ? (ex : 02/11/2026)" },
  heuresHebdomadaires: { label: "les heures hebdomadaires", type: "nombre", question: "Combien d'heures par semaine ? (ex : 35)" },
};

export function detecterChamp(m: Msg): string | null {
  if (aPrefixe(m, "quitt", "demission", "licenci", "sortie") || a(m, "depart", "part", "fin de contrat", "date de fin", "fin du contrat", "fin de periode d essai")) return "dateFin";
  if (a(m, "date d entree", "date de debut", "date d embauche", "date d arrivee", "entree")) return "dateDebut";
  if (aPrefixe(m, "mail", "courriel") || a(m, "email", "e mail")) return "email";
  if (aPrefixe(m, "telephone", "portable", "mobile") || a(m, "tel", "numero", "numero de telephone")) return "telephone";
  if (aPrefixe(m, "hebdo") || (a(m, "heures") && a(m, "semaine"))) return "heuresHebdomadaires";
  if (aPrefixe(m, "salaire", "remuneration", "augment")) return "salaireMensuel";
  if (aPrefixe(m, "contrat")) return "typeContrat";
  if (aPrefixe(m, "poste", "fonction", "metier", "titre")) return "poste";
  return null;
}

const slotChamp: Slot = {
  cle: "champ",
  requis: () => true,
  rempli: (d) => !!d.champ,
  async extraire(m, d, env, mode) {
    if (mode.ecraser || d.champ) return false;
    const c = detecterChamp(m);
    if (!c) return false;
    d.champ = c;
    return true;
  },
  question: () =>
    "Que souhaitez-vous modifier ?\n1. Le poste\n2. Le salaire mensuel\n3. Le type de contrat\n4. L'email\n5. Le téléphone\n6. La date de fin de contrat\n7. La date d'entrée\n8. Les heures hebdomadaires",
  suggestions: () => ["Le poste", "Le salaire", "Le contrat", "Date de fin de contrat"],
};

const ORDRE_CHAMPS = ["poste", "salaireMensuel", "typeContrat", "email", "telephone", "dateFin", "dateDebut", "heuresHebdomadaires"];

const slotChampNumero: Slot = {
  ...slotChamp,
  async extraire(m, d, env, mode) {
    if (mode.ecraser || d.champ) return false;
    const c = detecterChamp(m);
    if (c) {
      d.champ = c;
      return true;
    }
    if (mode.attendu) {
      const n = Number(m.norm.replace(/^(le|la|l|numero|n)\s+/, ""));
      if (Number.isInteger(n) && n >= 1 && n <= ORDRE_CHAMPS.length) {
        d.champ = ORDRE_CHAMPS[n - 1];
        return true;
      }
    }
    return false;
  },
};

const slotNouvelleValeur: Slot = {
  cle: "valeur",
  requis: (d) => !!d.champ,
  rempli: (d) => d.valeur !== undefined && d.valeur !== null && d.valeur !== "",
  async extraire(m, d, env, mode) {
    if (!d.champ) return false;
    if (!mode.ecraser && d.valeur !== undefined) return false;
    const def = CHAMPS[d.champ];
    switch (def.type) {
      case "texte": {
        if (!mode.attendu) return false;
        const t = nettoyer(m.brut, 80);
        if (t.length < 2) return false;
        d.valeur = t.charAt(0).toUpperCase() + t.slice(1);
        return true;
      }
      case "nombre": {
        const n = parseNombre(m.brut);
        if (n === null || n <= 0 || n > 100000) return false;
        d.valeur = n;
        return true;
      }
      case "contrat": {
        const c = detecterContrat(m);
        if (!c) return false;
        d.valeur = c;
        return true;
      }
      case "email": {
        const e = m.brut.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
        if (!e) return false;
        d.valeur = e[0].toLowerCase();
        return true;
      }
      case "tel": {
        const t = m.brut.match(/(\+?\d[\d .-]{7,}\d)/);
        if (!t) return false;
        d.valeur = t[1].replace(/[^\d+]/g, "");
        return true;
      }
      case "date": {
        const p = analyserDates(m.brut, env.today.iso).periode;
        if (!p) return false;
        d.valeur = p.debut;
        return true;
      }
    }
  },
  question: (d) => CHAMPS[d.champ]?.question ?? "Quelle est la nouvelle valeur ?",
  suggestions: (d) => (d.champ === "typeContrat" ? CONTRATS : []),
};

function valeurActuelle(s: SalarieLite, champ: string): string {
  const v = (s as unknown as Record<string, unknown>)[champ];
  if (v === null || v === undefined || v === "") return "non renseigné";
  if (v instanceof Date) return fmtDate(v);
  if (champ === "salaireMensuel") return eur(Number(v));
  return String(v);
}

function valeurAffichee(champ: string, v: unknown): string {
  if (CHAMPS[champ].type === "date") return fmtDate(String(v));
  if (champ === "salaireMensuel") return eur(Number(v));
  if (champ === "heuresHebdomadaires") return `${v} h`;
  return String(v);
}

export const salarieModif: Flow = {
  id: "salarie_modif",
  module: "salaries",
  slots: [slotSalaries({ multiple: false }), slotChampNumero, slotNouvelleValeur],

  confirmation(d, env) {
    const s = env.salaries.find((x) => x.id === d.salarieIds[0])!;
    const lignes = [`Salarié : ${nomComplet(s)}`, `Champ : ${CHAMPS[d.champ].label}`, `Avant : ${valeurActuelle(s, d.champ)}`, `Après : ${valeurAffichee(d.champ, d.valeur)}`];
    let texte = `Je vais modifier la fiche :\n${puces(lignes)}`;
    if (d.champ === "dateFin") texte += "\n\n💳 Le salarié ne sera plus compté dans la facturation des mois suivant cette date.";
    return texte;
  },

  async executer(d, env) {
    const id = d.salarieIds[0] as string;
    const s = env.salaries.find((x) => x.id === id);
    if (!s) return rep("Je ne retrouve plus ce salarié, rien n'a été modifié.", { humeur: "triste" });
    const data: Record<string, unknown> = {};
    if (d.champ === "dateFin" || d.champ === "dateDebut") data[d.champ] = versDate(d.valeur);
    else data[d.champ] = d.valeur;
    if (d.champ === "salaireMensuel" && s.salaireAnnuel !== null) data.salaireAnnuel = arrondi(d.valeur * 12);
    const r = await prisma.salarie.updateMany({ where: { id, entrepriseId: env.entreprise.id }, data });
    if (r.count === 0) return rep("Je ne retrouve plus ce salarié, rien n'a été modifié.", { humeur: "triste" });
    return rep(`✅ Fiche de ${nomComplet(s)} mise à jour — ${CHAMPS[d.champ].label.replace(/^(?:le |la |l'|les )/, "")} : ${valeurAffichee(d.champ, d.valeur)}.`, {
      humeur: "content",
      liens: [{ label: "Ouvrir la page Salariés", href: PAGE.salaries }],
    });
  },
};

/* ════════════════════════════════════════════════════════════════
   SALARIÉS : suppression définitive
   ════════════════════════════════════════════════════════════════ */

export const salarieSuppr: Flow = {
  id: "salarie_suppr",
  module: "salaries",
  slots: [slotSalaries({ multiple: false })],
  confirmation(d, env) {
    const s = env.salaries.find((x) => x.id === d.salarieIds[0])!;
    return `⚠️ Je vais supprimer DÉFINITIVEMENT ${nomComplet(s)} (${s.poste}).\nSes absences, ses variables de paie et ses documents seront aussi supprimés.\n\nSi la personne quitte simplement l'entreprise, il vaut mieux enregistrer une date de fin de contrat (dites : « fin de contrat de ${s.prenom} le 30/11 »).`;
  },
  async executer(d, env) {
    const id = d.salarieIds[0] as string;
    const s = env.salaries.find((x) => x.id === id);
    const r = await prisma.salarie.deleteMany({ where: { id, entrepriseId: env.entreprise.id } });
    if (r.count === 0 || !s) return rep("Je ne retrouve plus ce salarié, rien n'a été supprimé.", { humeur: "triste" });
    env.salaries = env.salaries.filter((x) => x.id !== id);
    return rep(`✅ ${nomComplet(s)} a été supprimé(e).`, { humeur: "content", liens: [{ label: "Ouvrir la page Salariés", href: PAGE.salaries }] });
  },
  annulation: "D'accord, je ne supprime personne. 👍",
};
