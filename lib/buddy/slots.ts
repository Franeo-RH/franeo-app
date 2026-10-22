// lib/buddy/slots.ts
// Briques réutilisables pour construire les conversations guidées :
// salariés, texte libre, dates, nombres, choix dans une liste…

import {
  a,
  aPronom,
  analyserDates,
  choixNumero,
  matchSalaries,
  nettoyer,
  parseNombre,
  plain,
  titreCase,
  trouverSalaries,
  type MatchSalarie,
  type Msg,
} from "./outils";
import { liste } from "./moteur";
import type { Data, Env, SalarieLite, Slot } from "./types";

type Condition = boolean | ((d: Data, env: Env) => boolean);
const evalCond = (c: Condition | undefined, d: Data, env: Env, defaut = true): boolean =>
  c === undefined ? defaut : typeof c === "function" ? c(d, env) : c;

export function nomComplet(s: { prenom: string; nom: string }): string {
  return `${s.prenom} ${s.nom}`;
}

export function nomsDesSalaries(ids: string[], env: Env): string {
  const noms = ids.map((id) => env.salaries.find((s) => s.id === id)).filter(Boolean).map((s) => nomComplet(s as SalarieLite));
  if (noms.length <= 1) return noms[0] ?? "—";
  return `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}`;
}

/* ═══════════════ Salariés ═══════════════ */

interface Candidat {
  id: string;
  label: string;
}

export function slotSalaries(opts: { multiple?: boolean; requis?: Condition } = {}): Slot {
  const multiple = !!opts.multiple;

  const fixer = (d: Data, ids: string[], env: Env) => {
    d.salarieIds = Array.from(new Set(ids));
    delete d.candidats;
    delete d.salarieIdsPrets;
    if (d.salarieIds.length > 0) env.dernierSalarieId = d.salarieIds[d.salarieIds.length - 1];
  };

  return {
    cle: "salarieIds",
    requis: (d, env) => evalCond(opts.requis, d, env, true),
    rempli: (d) => Array.isArray(d.salarieIds) && d.salarieIds.length > 0 && !d.candidats,

    async extraire(m, d, env, mode) {
      // 1) Réponse à « lequel ? »
      if (Array.isArray(d.candidats) && d.candidats.length > 0) {
        const cands: Candidat[] = d.candidats;
        const prets: string[] = Array.isArray(d.salarieIdsPrets) ? d.salarieIdsPrets : [];
        if (multiple && a(m, "les deux", "tous", "toutes", "tous les deux", "tout le monde")) {
          fixer(d, [...prets, ...cands.map((c) => c.id)], env);
          return true;
        }
        const n = choixNumero(m, cands.length);
        let choisi: string | undefined = n ? cands[n - 1].id : undefined;
        if (!choisi) {
          const pool = env.salaries.filter((s) => cands.some((c) => c.id === s.id));
          const t = trouverSalaries(m, pool);
          if (t.length === 1) choisi = t[0].id;
        }
        if (!choisi) return false;
        fixer(d, [...prets, choisi], env);
        return true;
      }

      if (!mode.ecraser && Array.isArray(d.salarieIds) && d.salarieIds.length > 0) return false;

      // 2) Noms présents dans le message
      const matches = matchSalaries(m, env.salaries);
      if (matches.length === 0) {
        if (aPronom(m) && env.dernierSalarieId && env.salaries.some((s) => s.id === env.dernierSalarieId)) {
          fixer(d, [env.dernierSalarieId], env);
          return true;
        }
        return false;
      }

      const groupes = new Map<string, MatchSalarie<SalarieLite>[]>();
      for (const x of matches) groupes.set(x.cle, [...(groupes.get(x.cle) ?? []), x]);
      const definis: string[] = [];
      const ambigus: SalarieLite[][] = [];
      for (const g of groupes.values()) {
        if (g.length === 1) definis.push(g[0].s.id);
        else ambigus.push(g.map((x) => x.s));
      }

      if (ambigus.length > 0) {
        d.salarieIds = [];
        d.candidats = ambigus[0].map((s) => ({ id: s.id, label: `${nomComplet(s)} (${s.poste})` }));
        d.salarieIdsPrets = definis;
        return true;
      }
      if (!multiple && definis.length > 1) {
        d.salarieIds = [];
        d.candidats = definis.map((id) => {
          const s = env.salaries.find((x) => x.id === id)!;
          return { id, label: `${nomComplet(s)} (${s.poste})` };
        });
        d.salarieIdsPrets = [];
        return true;
      }
      fixer(d, definis, env);
      return true;
    },

    question(d, env) {
      if (Array.isArray(d.candidats) && d.candidats.length > 0) {
        return `Plusieurs salariés correspondent. Lequel ?\n${liste(d.candidats.map((c: Candidat) => c.label))}\n\n(répondez par le numéro ou le nom)`;
      }
      return multiple ? "Pour quel(s) salarié(s) ?" : "Pour quel salarié ?";
    },

    suggestions(d, env) {
      if (Array.isArray(d.candidats) && d.candidats.length > 0) return d.candidats.map((c: Candidat) => c.label.replace(/ \(.*\)$/, ""));
      return env.salaries.filter((s) => s.statut === "Actif").slice(0, 6).map(nomComplet);
    },
  };
}

/* ═══════════════ Texte libre ═══════════════ */

export function slotTexte(opts: {
  cle: string;
  question: string | ((d: Data, env: Env) => string);
  min?: number;
  max?: number;
  optionnel?: boolean;
  requis?: Condition;
  suggestions?: string[];
  majuscule?: boolean;
  /** Mots qui permettent de corriger ce champ à l'étape de confirmation ("le poste c'est directrice"). */
  etiquettes?: string[];
  /** Extraction depuis la phrase initiale ("… comme comptable …"). */
  depuisPhrase?: (m: Msg) => string | null;
}): Slot {
  const min = opts.min ?? 2;
  const max = opts.max ?? 1000;
  const nettoyerValeur = (t: string) => {
    const v = nettoyer(t, max);
    return opts.majuscule ? v.charAt(0).toUpperCase() + v.slice(1) : v;
  };
  return {
    cle: opts.cle,
    optionnel: opts.optionnel,
    texteLibre: true,
    requis: (d, env) => evalCond(opts.requis, d, env, true),
    rempli: (d) => typeof d[opts.cle] === "string" && d[opts.cle].length > 0,
    async extraire(m, d, env, mode) {
      if (mode.attendu) {
        const t = nettoyerValeur(m.brut);
        if (t.length < min) return false;
        d[opts.cle] = t;
        return true;
      }
      if (mode.ecraser && opts.etiquettes?.length) {
        const re = new RegExp(`^(?:oui\\s+)?(?:le |la |l'|l’)?(?:${opts.etiquettes.join("|")})\\s*(?:c'est|c’est|est|:|=|->)?\\s*(.+)$`, "i");
        const mm = m.brut.trim().match(re);
        if (mm && nettoyer(mm[1]).length >= min) {
          d[opts.cle] = nettoyerValeur(mm[1]);
          return true;
        }
        return false;
      }
      if (!mode.ecraser && opts.depuisPhrase && !d[opts.cle]) {
        const t = opts.depuisPhrase(m);
        if (t && t.length >= min) {
          d[opts.cle] = nettoyerValeur(t);
          return true;
        }
      }
      return false;
    },
    question: (d, env) => (typeof opts.question === "function" ? opts.question(d, env) : opts.question),
    suggestions: () => opts.suggestions ?? [],
  };
}

/* ═══════════════ Dates ═══════════════ */

export function slotPeriode(opts: { question?: string; requis?: Condition } = {}): Slot {
  return {
    cle: "periode",
    requis: (d, env) => evalCond(opts.requis, d, env, true),
    rempli: (d) => !!d.debut && !!d.fin,
    async extraire(m, d, env, mode) {
      if (!mode.ecraser && d.debut && d.fin) return false;
      const { periode } = analyserDates(m.brut, env.today.iso);
      if (!periode) return false;
      d.debut = periode.debut;
      d.fin = periode.fin;
      return true;
    },
    question: () => opts.question ?? "Pour quelle période ? (ex : demain, du 03/11 au 07/11, lundi prochain, la semaine prochaine)",
    suggestions: () => ["Aujourd'hui", "Demain", "La semaine prochaine"],
  };
}

export function slotDate(opts: {
  cle: string;
  question: string | ((d: Data, env: Env) => string);
  requis?: Condition;
  optionnel?: boolean;
  suggestions?: string[];
}): Slot {
  return {
    cle: opts.cle,
    optionnel: opts.optionnel,
    requis: (d, env) => evalCond(opts.requis, d, env, true),
    rempli: (d) => !!d[opts.cle],
    async extraire(m, d, env, mode) {
      if (!mode.ecraser && d[opts.cle]) return false;
      const { periode } = analyserDates(m.brut, env.today.iso);
      if (!periode) return false;
      d[opts.cle] = periode.debut;
      return true;
    },
    question: (d, env) => (typeof opts.question === "function" ? opts.question(d, env) : opts.question),
    suggestions: () => opts.suggestions ?? ["Aujourd'hui", "Demain", "Lundi prochain"],
  };
}

/* ═══════════════ Nombres ═══════════════ */

export function slotNombre(opts: {
  cle: string;
  question: string | ((d: Data, env: Env) => string);
  min?: number;
  max?: number;
  requis?: Condition;
  optionnel?: boolean;
  /** Dans la phrase initiale, on ne lit le nombre que si l'un de ces mots est présent. */
  motsCles?: string[];
  /** Prendre le dernier nombre du message au lieu du premier. */
  dernier?: boolean;
  suggestions?: string[];
}): Slot {
  const min = opts.min ?? 0;
  const max = opts.max ?? 1_000_000;
  const lire = (brut: string): number | null => {
    if (!opts.dernier) return parseNombre(brut);
    const { reste } = analyserDates(brut);
    const t = reste.match(/\d{1,3}(?:[  ]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g);
    if (!t) return null;
    const n = parseFloat(t[t.length - 1].replace(/[  ]/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  return {
    cle: opts.cle,
    optionnel: opts.optionnel,
    requis: (d, env) => evalCond(opts.requis, d, env, true),
    rempli: (d) => typeof d[opts.cle] === "number",
    async extraire(m, d, env, mode) {
      if (!mode.attendu && !mode.ecraser && typeof d[opts.cle] === "number") return false;
      if (!mode.attendu && !mode.ecraser && opts.motsCles && !(a(m, ...opts.motsCles) || m.mots.some((w) => opts.motsCles!.some((k) => w.startsWith(k))))) return false;
      const n = lire(m.brut);
      if (n === null) return false;
      if (n <= 0) {
        d._note = "Il faut une valeur supérieure à 0.";
        return false;
      }
      if (n < min) {
        d._note = `Cette valeur est trop faible (minimum ${min.toLocaleString("fr-FR")}).`;
        return false;
      }
      if (n > max) {
        d._note = `Cette valeur me paraît trop élevée (maximum ${max.toLocaleString("fr-FR")}).`;
        return false;
      }
      d[opts.cle] = n;
      return true;
    },
    question: (d, env) => (typeof opts.question === "function" ? opts.question(d, env) : opts.question),
    suggestions: () => opts.suggestions ?? [],
  };
}

/* ═══════════════ Choix dans une liste fixe ═══════════════ */

export function slotChoix(opts: {
  cle: string;
  options: { code: string; label: string }[];
  detecter: (m: Msg) => string | null;
  question: string | ((d: Data, env: Env) => string);
  requis?: Condition;
  suggestions?: string[];
}): Slot {
  return {
    cle: opts.cle,
    requis: (d, env) => evalCond(opts.requis, d, env, true),
    rempli: (d) => !!d[opts.cle],
    async extraire(m, d, env, mode) {
      if (!mode.ecraser && d[opts.cle]) return false;
      let code = opts.detecter(m);
      if (!code && mode.attendu) {
        const n = choixNumero(m, opts.options.length);
        if (n) code = opts.options[n - 1].code;
      }
      if (!code) return false;
      d[opts.cle] = code;
      return true;
    },
    question: (d, env) => {
      const q = typeof opts.question === "function" ? opts.question(d, env) : opts.question;
      return `${q}\n${liste(opts.options.map((o) => o.label))}`;
    },
    suggestions: () => opts.suggestions ?? opts.options.slice(0, 4).map((o) => o.label),
  };
}

/* ═══════════════ Choix d'un élément dans une liste chargée en base ═══════════════ */

export interface Element {
  id: string;
  label: string;
  [autre: string]: any;
}

export function slotCible(opts: {
  cle: string;
  titre: string; // "Quelle absence ?"
  charger: (d: Data, env: Env) => Promise<Element[]>;
  /** Réduit la liste d'après le message. `null` = rien à filtrer dans ce message. */
  filtrer?: (m: Msg, items: Element[], env: Env) => Element[] | null;
  vide: (d: Data, env: Env) => string;
  requis?: Condition;
  /** Tant que ce n'est pas vrai (ex: on attend de savoir de quel salarié il s'agit), la liste n'est pas chargée. */
  pret?: (d: Data, env: Env) => boolean;
}): Slot {
  const cleListe = `${opts.cle}_liste`;
  return {
    cle: opts.cle,
    requis: (d, env) => evalCond(opts.requis, d, env, true),
    rempli: (d) => !!d[opts.cle],
    async extraire(m, d, env, mode) {
      if (d[opts.cle]) return false;
      if (opts.pret && !opts.pret(d, env)) return false;
      let items: Element[] = d[cleListe];
      if (!items) {
        items = await opts.charger(d, env);
        d[cleListe] = items;
      }
      if (items.length === 0) {
        d._stop = opts.vide(d, env);
        return false;
      }
      if (items.length === 1) {
        d[opts.cle] = items[0].id;
        return true;
      }
      const n = mode.attendu ? choixNumero(m, items.length) : null;
      if (n) {
        d[opts.cle] = items[n - 1].id;
        return true;
      }
      const f = opts.filtrer ? opts.filtrer(m, items, env) : null;
      if (f === null) return false;
      if (f.length === 0) {
        if (mode.attendu) d._note = "Je n'ai rien trouvé qui corresponde.";
        return false;
      }
      if (f.length === 1) {
        d[opts.cle] = f[0].id;
        return true;
      }
      if (f.length < items.length) {
        d[cleListe] = f;
        return true;
      }
      return false;
    },
    question(d) {
      const items: Element[] = d[cleListe] ?? [];
      return `${opts.titre}\n${liste(items.map((i) => i.label))}\n\n(répondez par le numéro)`;
    },
    suggestions(d) {
      const items: Element[] = d[cleListe] ?? [];
      return items.slice(0, 6).map((_, i) => String(i + 1));
    },
  };
}

export function elementChoisi(d: Data, cle: string): Element | undefined {
  const items: Element[] = d[`${cle}_liste`] ?? [];
  return items.find((i) => i.id === d[cle]);
}

export { plain, titreCase };
