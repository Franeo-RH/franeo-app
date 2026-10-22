// lib/buddy/outils.ts
// Fonctions utilitaires de Buddy : compréhension du texte, dates, montants, noms…
// Aucune dépendance à la base de données : tout ici est testable seul.

import { THEMATIQUES } from "@/lib/buddy/thematiques";

/* ════════════════════════════════════════════════════════════════
   1. ANALYSE DU TEXTE
   ════════════════════════════════════════════════════════════════ */

export interface Msg {
  brut: string; // message tel qu'écrit par l'utilisateur
  norm: string; // minuscules, sans accents ni ponctuation
  mots: string[]; // mots de `norm`
}

export function plain(texte: string): string {
  return texte
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function analyser(brut: string): Msg {
  const norm = plain(brut);
  return { brut, norm, mots: norm ? norm.split(" ") : [] };
}

/** Vrai si l'une des expressions (déjà normalisées) est présente comme mot(s) entier(s). */
export function a(m: Msg, ...expressions: string[]): boolean {
  const t = ` ${m.norm} `;
  return expressions.some((e) => t.includes(` ${e} `));
}

/** Vrai si un mot du message commence par l'un des préfixes (ex: "supprim" → supprime, supprimer…). */
export function aPrefixe(m: Msg, ...prefixes: string[]): boolean {
  return m.mots.some((w) => prefixes.some((p) => w.startsWith(p)));
}

export function titreCase(texte: string): string {
  return texte
    .trim()
    .toLowerCase()
    .replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase());
}

export function nettoyer(texte: string, max = 500): string {
  return texte.replace(/\s+/g, " ").trim().slice(0, max);
}

export function estPasser(m: Msg): boolean {
  return (
    a(m, "passer", "passe", "aucun", "aucune", "non", "rien", "sans", "pas de", "plus tard", "ignorer", "skip") ||
    m.norm === "ne sais pas"
  );
}

export function estQuestion(m: Msg): boolean {
  return (
    m.brut.includes("?") ||
    aPrefixe(m, "combien", "quel", "quand", "pourquoi", "comment") ||
    a(m, "qui", "est ce que", "est ce", "y a t il", "ya t il", "ou en est", "ou en sont", "c est quoi", "liste", "montre", "affiche", "voir", "donne", "dis moi", "mes", "quelles", "quels")
  );
}

/* ════════════════════════════════════════════════════════════════
   2. DATES
   ════════════════════════════════════════════════════════════════ */

const MOIS_NOMS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const JOURS_NOMS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS_RE = MOIS_NOMS.join("|");
const JOURS_RE = JOURS_NOMS.join("|");

export const NOMS_MOIS_AFFICHAGE = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export interface Periode {
  debut: string; // AAAA-MM-JJ
  fin: string; // AAAA-MM-JJ
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function isoDate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function dateValide(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function ajouterJours(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return isoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function jourSemaine(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Date du jour à Paris (et non en UTC, pour éviter les décalages la nuit). */
export function aujourdhui(maintenant: Date = new Date()): { y: number; m: number; d: number; iso: string } {
  const iso = maintenant.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d, iso };
}

export function heureParis(maintenant: Date = new Date()): number {
  return Number(maintenant.toLocaleString("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hour12: false })) % 24;
}

/**
 * Comprend : aujourd'hui, demain, après-demain, hier, lundi, lundi prochain,
 * 12/11, 12/11/2026, 12 novembre, du 3 au 7 novembre, du 3/11 au 7/11,
 * du lundi au mercredi, la semaine prochaine, jusqu'à vendredi, 3 jours…
 */
export function analyserDates(brut: string, refIso?: string): { periode: Periode | null; reste: string } {
  const ref = refIso ?? aujourdhui().iso;
  const [ry, rm] = ref.split("-").map(Number);

  let t = " " + brut.toLowerCase().replace(/[’`]/g, "'").normalize("NFD").replace(/[\u0300-\u036f]/g, "") + " ";
  const jusqu = /\bjusqu/.test(t);
  const trouves: { pos: number; iso: string; sem: boolean; sa: boolean; g: number }[] = [];
  let compteurGroupe = 0;

  const an = (s?: string): number => (!s ? ry : s.length === 2 ? 2000 + Number(s) : Number(s));

  const scan = (re: RegExp, fn: (m: RegExpExecArray) => { iso: string; sem?: boolean; sa?: boolean }[] | null) => {
    const copie = t;
    re.lastIndex = 0;
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(copie)) !== null) {
      const res = fn(mm);
      if (!res) continue;
      const index = mm.index;
      const g = ++compteurGroupe;
      res.forEach((r, i) => trouves.push({ pos: index + i, iso: r.iso, sem: !!r.sem, sa: !!r.sa, g }));
      t = t.slice(0, index) + " ".repeat(mm[0].length) + t.slice(index + mm[0].length);
    }
  };

  // du 3 au 7 novembre [2026]
  scan(new RegExp(`\\bdu\\s+(\\d{1,2})(?:er)?\\s+au\\s+(\\d{1,2})(?:er)?\\s+(${MOIS_RE})(?:\\s+(\\d{4}))?`, "g"), (m) => {
    const mo = MOIS_NOMS.indexOf(m[3]) + 1;
    const y = an(m[4]);
    const d1 = Number(m[1]);
    const d2 = Number(m[2]);
    if (!dateValide(y, mo, d1) || !dateValide(y, mo, d2)) return null;
    return [{ iso: isoDate(y, mo, d1), sa: !m[4] }, { iso: isoDate(y, mo, d2), sa: !m[4] }];
  });

  // du 3 au 7/11[/2026]
  scan(/\bdu\s+(\d{1,2})\s+au\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g, (m) => {
    const mo = Number(m[3]);
    const y = an(m[4]);
    const d1 = Number(m[1]);
    const d2 = Number(m[2]);
    if (!dateValide(y, mo, d1) || !dateValide(y, mo, d2)) return null;
    return [{ iso: isoDate(y, mo, d1), sa: !m[4] }, { iso: isoDate(y, mo, d2), sa: !m[4] }];
  });

  // 12/11/2026, 12.11.2026, 12-11-26
  scan(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4}|\d{2})\b/g, (m) => {
    const y = an(m[3]);
    const mo = Number(m[2]);
    const d = Number(m[1]);
    return dateValide(y, mo, d) ? [{ iso: isoDate(y, mo, d) }] : null;
  });

  // 12/11
  scan(/\b(\d{1,2})\/(\d{1,2})\b/g, (m) => {
    const mo = Number(m[2]);
    const d = Number(m[1]);
    return dateValide(ry, mo, d) ? [{ iso: isoDate(ry, mo, d), sa: true }] : null;
  });

  // 12 novembre [2026]
  scan(new RegExp(`\\b(\\d{1,2})(?:er)?\\s+(${MOIS_RE})(?:\\s+(\\d{4}))?\\b`, "g"), (m) => {
    const mo = MOIS_NOMS.indexOf(m[2]) + 1;
    const y = an(m[3]);
    const d = Number(m[1]);
    return dateValide(y, mo, d) ? [{ iso: isoDate(y, mo, d), sa: !m[3] }] : null;
  });

  // du 3 au 7 (mois en cours)
  scan(/\bdu\s+(\d{1,2})\s+au\s+(\d{1,2})\b/g, (m) => {
    const d1 = Number(m[1]);
    const d2 = Number(m[2]);
    if (!dateValide(ry, rm, d1) || !dateValide(ry, rm, d2)) return null;
    return [{ iso: isoDate(ry, rm, d1), sa: true }, { iso: isoDate(ry, rm, d2), sa: true }];
  });

  // la semaine prochaine / cette semaine / la semaine dernière (lundi → vendredi)
  const lundiDe = (iso: string): string => ajouterJours(iso, -((jourSemaine(iso) + 6) % 7));
  scan(/\b(?:la\s+)?semaine\s+prochaine\b/g, () => {
    const lundi = ajouterJours(lundiDe(ref), 7);
    return [{ iso: lundi }, { iso: ajouterJours(lundi, 4) }];
  });
  scan(/\b(?:la\s+)?semaine\s+(?:derniere|passee)\b/g, () => {
    const lundi = ajouterJours(lundiDe(ref), -7);
    return [{ iso: lundi }, { iso: ajouterJours(lundi, 4) }];
  });
  scan(/\bcette\s+semaine\b/g, () => {
    const lundi = lundiDe(ref);
    return [{ iso: lundi }, { iso: ajouterJours(lundi, 4) }];
  });

  // après-demain, demain, hier, aujourd'hui
  scan(/\bapres[\s-]demain\b/g, () => [{ iso: ajouterJours(ref, 2) }]);
  scan(/\bdemain\b/g, () => [{ iso: ajouterJours(ref, 1) }]);
  scan(/\bhier\b/g, () => [{ iso: ajouterJours(ref, -1) }]);
  scan(/\b(?:aujourd'?\s?hui|ce jour)\b/g, () => [{ iso: ref }]);

  // lundi, lundi prochain…
  scan(new RegExp(`\\b(${JOURS_RE})(?:\\s+(prochain))?\\b`, "g"), (m) => {
    const cible = JOURS_NOMS.indexOf(m[1]);
    let diff = (cible - jourSemaine(ref) + 7) % 7;
    if (diff === 0 && m[2]) diff = 7;
    return [{ iso: ajouterJours(ref, diff), sem: true }];
  });

  if (trouves.length === 0) return { periode: null, reste: t };

  trouves.sort((x, y) => x.pos - y.pos);
  let debut = trouves[0].iso;
  let fin = trouves[trouves.length - 1].iso;

  if (trouves.length === 1) {
    if (jusqu) {
      debut = fin < ref ? fin : ref;
    } else {
      const dur = t.match(/\b(\d{1,2})\s+jours?\b/);
      if (dur) {
        const n = Number(dur[1]);
        if (n > 1 && n <= 60) fin = ajouterJours(debut, n - 1);
      }
    }
  }

  if (fin < debut) {
    const dernier = trouves[trouves.length - 1];
    if (trouves[0].sem && dernier.sem) {
      fin = ajouterJours(fin, 7);
    } else if (dernier.sa && trouves[0].g !== dernier.g) {
      // « du 28/12 au 03/01 » : la fin est l'année suivante
      const [fy, fm, fd] = fin.split("-").map(Number);
      fin = isoDate(fy + 1, fm, fd);
    } else {
      [debut, fin] = [fin, debut];
    }
  }

  return { periode: { debut, fin }, reste: t };
}

export function parsePeriode(brut: string, refIso?: string): Periode | null {
  return analyserDates(brut, refIso).periode;
}

/** Date UTC minuit à partir de AAAA-MM-JJ (même convention que les formulaires de l'application). */
export function versDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function fmtDate(d: Date | string): string {
  const dt = typeof d === "string" ? versDate(d.slice(0, 10)) : d;
  return dt.toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

export function fmtDateCreation(d: Date): string {
  return d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
}

export function fmtJour(iso: string): string {
  return versDate(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function fmtPeriode(p: Periode): string {
  return p.debut === p.fin ? `le ${fmtJour(p.debut)}` : `du ${fmtDate(p.debut)} au ${fmtDate(p.fin)}`;
}

export function compterJours(debut: string, fin: string): { calendaires: number; ouvres: number } {
  let calendaires = 0;
  let ouvres = 0;
  let cur = debut;
  while (cur <= fin && calendaires < 400) {
    calendaires++;
    const j = jourSemaine(cur);
    if (j !== 0 && j !== 6) ouvres++;
    cur = ajouterJours(cur, 1);
  }
  return { calendaires, ouvres };
}

/** Un salarié est-il présent (statut actif + dates) sur le mois donné ? */
export function estPresentDansMois(
  s: { statut: string; dateDebut: Date | null; dateFin: Date | null },
  y: number,
  m: number
): boolean {
  if (s.statut !== "Actif" || !s.dateDebut) return false;
  const debutMois = new Date(Date.UTC(y, m - 1, 1));
  const finMois = new Date(Date.UTC(y, m, 0));
  if (s.dateDebut > finMois) return false;
  if (s.dateFin && s.dateFin < debutMois) return false;
  return true;
}

/** Mois cité dans le message ("en octobre", "de septembre 2026") sinon null. */
export function detecterMois(m: Msg): { mois: number; annee: number } | null {
  const ref = aujourdhui();
  for (let i = 0; i < MOIS_NOMS.length; i++) {
    if (m.mots.includes(MOIS_NOMS[i])) {
      const an = m.norm.match(new RegExp(`${MOIS_NOMS[i]} (\\d{4})`));
      return { mois: i + 1, annee: an ? Number(an[1]) : ref.y };
    }
  }
  if (a(m, "mois dernier", "le mois passe")) {
    return ref.m === 1 ? { mois: 12, annee: ref.y - 1 } : { mois: ref.m - 1, annee: ref.y };
  }
  return null;
}

/* ════════════════════════════════════════════════════════════════
   3. NOMBRES ET MONTANTS
   ════════════════════════════════════════════════════════════════ */

export function arrondi(n: number): number {
  return Math.round(n * 100) / 100;
}

export function eur(n: number): string {
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
}

/** Premier nombre du message hors dates. Comprend "2h30", "1 500 €", "12,5". */
export function parseNombre(brut: string): number | null {
  const { reste } = analyserDates(brut);
  const hm = reste.match(/(\d{1,2})\s*h\s*(\d{2})\b/);
  if (hm) return arrondi(Number(hm[1]) + Number(hm[2]) / 60);
  const m = reste.match(/(\d{1,3}(?:[  ]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/[  ]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseNombres(brut: string): number[] {
  const { reste } = analyserDates(brut);
  const trouves = reste.match(/\d{1,3}(?:[  ]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g) || [];
  return trouves.map((x) => parseFloat(x.replace(/[  ]/g, "").replace(",", "."))).filter((n) => Number.isFinite(n));
}

const ORDINAUX: Record<string, number> = {
  premier: 1, premiere: 1, "1er": 1, deuxieme: 2, second: 2, seconde: 2, troisieme: 3, quatrieme: 4, cinquieme: 5,
  dernier: -1, derniere: -1,
};

/** "2", "le 2", "numéro 2", "la deuxième", "le dernier" → index 1..max. */
export function choixNumero(m: Msg, max: number): number | null {
  const mm = m.norm.match(/^(?:(?:le|la|l|numero|n|choix|option)\s+)?(\d{1,2})(?:\s?(?:eme|e|er))?$/);
  if (mm) {
    const n = Number(mm[1]);
    if (n >= 1 && n <= max) return n;
  }
  if (m.mots.length <= 4) {
    for (const mot of m.mots) {
      if (ORDINAUX[mot]) return ORDINAUX[mot] === -1 ? max : ORDINAUX[mot] <= max ? ORDINAUX[mot] : null;
    }
  }
  return null;
}

/* ════════════════════════════════════════════════════════════════
   4. TYPES MÉTIER (absences, variables, contrats, support)
   ════════════════════════════════════════════════════════════════ */

export const LABELS_ABSENCE: Record<string, string> = {
  CONGE_PAYE: "Congé payé",
  RTT: "RTT",
  CONGE_SANS_SOLDE: "Congé sans solde",
  CONGE_EXCEPTIONNEL: "Congé exceptionnel",
  CONGE_NAISSANCE: "Congé naissance",
  MATERNITE_PATERNITE: "Maternité / Paternité",
  MALADIE: "Maladie",
  ABSENCE_NON_REMUNEREE: "Absence non rémunérée",
};

export const LABELS_VARIABLE: Record<string, string> = {
  HEURE_SUPPLEMENTAIRE: "Heures supp.",
  PRIME: "Prime",
  NOTE_FRAIS: "Note de frais",
  ACOMPTE: "Acompte",
};

export const LABELS_SUPPORT: Record<string, string> = {
  BUG: "Bug",
  QUESTION: "Question",
  SUGGESTION: "Suggestion",
  PROBLEME_TECHNIQUE: "Problème technique",
};

export const CONTRATS = ["CDI", "CDD", "Alternance", "Stage", "Intérim"];

export function detecterTypeAbsence(m: Msg): string | null {
  if (a(m, "sans solde")) return "CONGE_SANS_SOLDE";
  if (aPrefixe(m, "maternite", "paternite") || a(m, "accueil de l enfant")) return "MATERNITE_PATERNITE";
  if (aPrefixe(m, "naissance")) return "CONGE_NAISSANCE";
  if (aPrefixe(m, "exceptionnel", "mariage", "deces", "demenagement")) return "CONGE_EXCEPTIONNEL";
  if (a(m, "non remuneree", "non remunere", "injustifiee", "injustifie")) return "ABSENCE_NON_REMUNEREE";
  if (aPrefixe(m, "maladie", "malade", "arret")) return "MALADIE";
  if (a(m, "rtt")) return "RTT";
  if (aPrefixe(m, "conge", "vacance") || a(m, "cp")) return "CONGE_PAYE";
  return null;
}

export function detecterTypeVariable(m: Msg): string | null {
  const supp = m.mots.some((w) => w === "sup" || w === "supp" || w === "hs" || w.startsWith("supplem"));
  if (supp || a(m, "h sup", "h supp") || (aPrefixe(m, "heure") && aPrefixe(m, "majoree"))) return "HEURE_SUPPLEMENTAIRE";
  if (aPrefixe(m, "frais", "remboursement")) return "NOTE_FRAIS";
  if (aPrefixe(m, "acompte") || a(m, "avance", "avances")) return "ACOMPTE";
  if (aPrefixe(m, "prime", "bonus", "gratification")) return "PRIME";
  return null;
}

export function detecterContrat(m: Msg): string | null {
  if (a(m, "cdi")) return "CDI";
  if (a(m, "cdd")) return "CDD";
  if (aPrefixe(m, "alternan", "apprenti")) return "Alternance";
  if (aPrefixe(m, "stagi") || a(m, "stage")) return "Stage";
  if (aPrefixe(m, "interim")) return "Intérim";
  return null;
}

export function detecterCategorieSupport(m: Msg): string | null {
  if (aPrefixe(m, "bug", "plante", "plantage", "erreur")) return "BUG";
  if (aPrefixe(m, "suggest", "idee", "amelior")) return "SUGGESTION";
  if (aPrefixe(m, "technique", "connexion", "acces", "bloque", "affiche") || a(m, "marche pas", "fonctionne pas")) return "PROBLEME_TECHNIQUE";
  if (aPrefixe(m, "question", "comment")) return "QUESTION";
  return null;
}

export function estAbsence(m: Msg): boolean {
  return aPrefixe(m, "absen", "conge", "maladie", "malade", "arret", "maternite", "paternite", "naissance", "vacance", "exceptionnel") || a(m, "rtt", "sans solde");
}

/* ════════════════════════════════════════════════════════════════
   5. SALARIÉS
   ════════════════════════════════════════════════════════════════ */

export interface PersonneLite {
  id: string;
  prenom: string;
  nom: string;
}

export interface MatchSalarie<T> {
  s: T;
  score: number; // 2 = prénom + nom, 1 = prénom seul ou nom seul
  cle: string; // identifie "ce qui a été reconnu" (deux Marie partagent la même clé)
}

/**
 * Salariés cités dans le message (mots entiers).
 * - "Marie Dupont" → seulement Marie Dupont (pas les autres Marie)
 * - "Marie" → toutes les Marie (le moteur demandera laquelle)
 * - "Jean et Marie Dupont" → Jean + Marie Dupont
 */
export function matchSalaries<T extends PersonneLite>(m: Msg, salaries: T[]): MatchSalarie<T>[] {
  const mots = new Set(m.mots);
  const candidats: (MatchSalarie<T> & { jetons: string[] })[] = [];
  for (const s of salaries) {
    const prenom = plain(s.prenom).split(" ").filter(Boolean);
    const nom = plain(s.nom).split(" ").filter(Boolean);
    const okPrenom = prenom.length > 0 && prenom.every((x) => x.length >= 2 && mots.has(x));
    const okNom = nom.length > 0 && nom.every((x) => x.length >= 2 && mots.has(x));
    const score = (okPrenom ? 1 : 0) + (okNom ? 1 : 0);
    if (score === 0) continue;
    const cle = score === 2 ? `id:${s.id}` : okPrenom ? `p:${prenom.join(" ")}` : `n:${nom.join(" ")}`;
    candidats.push({ s, score, cle, jetons: [...(okPrenom ? prenom : []), ...(okNom ? nom : [])] });
  }

  const utilises = new Set<string>();
  const retenus: MatchSalarie<T>[] = [];

  // 1) les correspondances complètes (prénom + nom)
  for (const c of candidats.filter((x) => x.score === 2)) {
    retenus.push({ s: c.s, score: c.score, cle: c.cle });
    c.jetons.forEach((j) => utilises.add(j));
  }
  // 2) les correspondances partielles, sauf si le mot est déjà "pris" par un salarié reconnu en entier
  const groupes = new Map<string, (typeof candidats)[number][]>();
  for (const c of candidats.filter((x) => x.score === 1)) groupes.set(c.cle, [...(groupes.get(c.cle) ?? []), c]);
  for (const g of groupes.values()) {
    if (g[0].jetons.every((j) => utilises.has(j))) continue;
    for (const c of g) retenus.push({ s: c.s, score: c.score, cle: c.cle });
    g[0].jetons.forEach((j) => utilises.add(j));
  }
  return retenus;
}

export function trouverSalaries<T extends PersonneLite>(m: Msg, salaries: T[]): T[] {
  return matchSalaries(m, salaries).map((x) => x.s);
}

export function aPronom(m: Msg): boolean {
  return a(m, "lui", "elle", "cette personne", "ce salarie", "cette salariee", "le meme", "la meme");
}

/* ════════════════════════════════════════════════════════════════
   6. ACTUALITÉS : thématiques
   ════════════════════════════════════════════════════════════════ */

const SYNONYMES_THEME: Record<string, string[]> = {
  Paie: ["paie", "bulletin", "bulletins", "cotisation", "cotisations", "dsn", "urssaf", "smic", "net a payer"],
  "Admin RH": ["admin rh", "administratif", "contrat", "contrats", "visite medicale", "visites medicales", "dpae"],
  Entreprises: ["entreprise", "entreprises", "employeur", "employeurs", "tpe", "pme"],
  "Gestion RH": ["gestion rh", "gestion", "management", "absenteisme", "temps de travail"],
  Recrutement: ["recrutement", "embauche", "candidat", "candidats", "offre d emploi"],
  Juridique: ["juridique", "droit", "loi", "legal", "reglementation", "jurisprudence", "code du travail", "licenciement"],
  Formation: ["formation", "formations", "cpf", "apprentissage", "alternance"],
  Général: ["general", "generale"],
};

export function detecterThematique(m: Msg): string | null {
  // 1. nom exact de la thématique (les plus longs d'abord : "gestion rh" avant "rh")
  const noms = [...THEMATIQUES].sort((x, y) => y.length - x.length);
  for (const t of noms) {
    if (a(m, plain(t))) return t;
  }
  // 2. synonymes (au pluriel aussi : licenciement / licenciements)
  const proche = (w: string, syn: string) => w === syn || w === `${syn}s` || `${w}s` === syn || w === `${syn}x`;
  for (const t of THEMATIQUES) {
    const syn = SYNONYMES_THEME[t];
    if (!syn) continue;
    if (a(m, ...syn)) return t;
    if (syn.some((x) => !x.includes(" ") && m.mots.some((w) => proche(w, x)))) return t;
  }
  return null;
}

/* ════════════════════════════════════════════════════════════════
   7. FAQ
   ════════════════════════════════════════════════════════════════ */

const MOTS_VIDES = new Set([
  "le", "la", "les", "un", "une", "des", "du", "de", "et", "ou", "a", "au", "aux", "en", "dans", "pour", "par", "sur", "avec", "sans",
  "je", "tu", "il", "elle", "nous", "vous", "ils", "mon", "ma", "mes", "ton", "ta", "ses", "son", "ce", "cet", "cette", "ces", "que", "qui",
  "quoi", "est", "sont", "suis", "pas", "ne", "se", "sa", "peux", "peut", "puis", "comment", "quel", "quelle", "quels", "quelles", "veux",
  "voudrais", "faire", "fait", "dois", "doit", "ai", "as", "ont", "y", "on", "si", "plus", "tres", "bien", "tout", "tous", "cela", "ca",
]);

export function motsUtiles(m: Msg): string[] {
  return m.mots.filter((w) => w.length > 2 && !MOTS_VIDES.has(w));
}

export function chercherFaq<T extends { question: string; reponse: string }>(m: Msg, faqs: T[]): { faq: T; score: number } | null {
  const mots = motsUtiles(m);
  if (mots.length === 0) return null;
  let meilleure: { faq: T; score: number } | null = null;
  for (const faq of faqs) {
    const q = plain(faq.question).split(" ");
    const r = new Set(plain(faq.reponse).split(" "));
    let score = 0;
    let dansQuestion = 0;
    for (const w of mots) {
      if (q.includes(w)) {
        score += 2;
        dansQuestion++;
      } else if (w.length >= 5 && q.some((x) => x.length >= 5 && (x.startsWith(w.slice(0, 5)) || w.startsWith(x.slice(0, 5))))) {
        score += 1;
        dansQuestion++;
      } else if (r.has(w)) {
        score += 0.5;
      }
    }
    if (dansQuestion >= 1 && score >= 2 && (!meilleure || score > meilleure.score)) meilleure = { faq, score };
  }
  return meilleure;
}
