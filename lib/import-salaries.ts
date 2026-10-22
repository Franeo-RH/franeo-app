// lib/import-salaries.ts
// Import Excel des salariés : lecture des lignes, contrôles, préparation des données.
// (Aucune dépendance Excel ici : le fichier brut est converti en tableau par lib/import-salaries-xlsx.ts)

export const CONTRATS_IMPORT = ["CDI", "CDD", "Alternance", "Stage", "Intérim"];

export type ChampImport =
  | "matricule" | "prenom" | "nom" | "poste" | "typeContrat" | "dateDebut" | "dateFin"
  | "heuresHebdomadaires" | "salaireMensuel" | "salaireAnnuel" | "email" | "telephone";

/** Colonnes du modèle, dans l'ordre. `alias` = autres intitulés acceptés (sans accents, en minuscules). */
export const COLONNES: { champ: ChampImport; titre: string; requis?: boolean; alias: string[]; aide: string }[] = [
  { champ: "matricule", titre: "Matricule", alias: ["matricule", "n matricule", "numero matricule", "id salarie"], aide: "Facultatif. Unique dans l'entreprise." },
  { champ: "prenom", titre: "Prénom", requis: true, alias: ["prenom"], aide: "Obligatoire." },
  { champ: "nom", titre: "Nom", requis: true, alias: ["nom", "nom de famille"], aide: "Obligatoire." },
  { champ: "poste", titre: "Poste", requis: true, alias: ["poste", "fonction", "emploi"], aide: "Obligatoire." },
  { champ: "typeContrat", titre: "Type de contrat", alias: ["type de contrat", "contrat", "type contrat"], aide: "CDI, CDD, Alternance, Stage ou Intérim." },
  { champ: "dateDebut", titre: "Date de début", alias: ["date de debut", "debut", "date d entree", "entree", "date entree"], aide: "JJ/MM/AAAA." },
  { champ: "dateFin", titre: "Date de fin", alias: ["date de fin", "fin", "date de sortie", "sortie", "fin de contrat"], aide: "JJ/MM/AAAA (CDD, stage…)." },
  { champ: "heuresHebdomadaires", titre: "Heures hebdo", alias: ["heures hebdo", "heures hebdomadaires", "heures", "heures par semaine"], aide: "Ex : 35." },
  { champ: "salaireMensuel", titre: "Salaire mensuel", alias: ["salaire mensuel", "mensuel", "salaire brut mensuel"], aide: "En euros." },
  { champ: "salaireAnnuel", titre: "Salaire annuel", alias: ["salaire annuel", "annuel", "salaire brut annuel"], aide: "En euros." },
  { champ: "email", titre: "Email", alias: ["email", "e mail", "mail", "courriel"], aide: "Adresse email." },
  { champ: "telephone", titre: "Téléphone", alias: ["telephone", "tel", "portable", "mobile"], aide: "Facultatif." },
];

export const MAX_LIGNES = 1000;

export function norm(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface DonneesSalarie {
  matricule: string | null;
  prenom: string;
  nom: string;
  poste: string;
  typeContrat: string | null;
  dateDebut: Date | null;
  dateFin: Date | null;
  heuresHebdomadaires: number | null;
  salaireMensuel: number | null;
  salaireAnnuel: number | null;
  email: string | null;
  telephone: string | null;
}

export interface LigneErreur {
  ligne: number; // numéro de ligne dans Excel
  raisons: string[];
  /** valeurs d'origine (texte) dans l'ordre des colonnes du modèle */
  valeurs: string[];
}

export interface Analyse {
  valides: { ligne: number; donnees: DonneesSalarie }[];
  erreurs: LigneErreur[];
  erreurGlobale?: string;
}

/* ───────────── conversions ───────────── */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateValide(y: number, m: number, d: number): Date | null {
  if (y < 1900 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? dt : null;
}

/** Date lue dans une cellule : vraie date Excel, numéro de série, « 31/12/2026 », « 2026-12-31 ». `undefined` = illisible. */
export function lireDate(v: unknown): Date | null | undefined {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return undefined;
    return dateValide(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate()) ?? undefined;
  }
  if (typeof v === "number") {
    if (v < 20000 || v > 80000) return undefined;
    const dt = new Date(Math.round((v - 25569) * 86400000));
    return dateValide(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()) ?? undefined;
  }
  const t = String(v).trim();
  if (!t) return null;
  let mm = t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/);
  if (mm) {
    let y = parseInt(mm[3], 10);
    if (mm[3].length === 2) y += 2000;
    return dateValide(y, parseInt(mm[2], 10), parseInt(mm[1], 10)) ?? undefined;
  }
  mm = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
  if (mm) return dateValide(parseInt(mm[1], 10), parseInt(mm[2], 10), parseInt(mm[3], 10)) ?? undefined;
  return undefined;
}

/** Nombre lu dans une cellule (« 2 500,50 € » accepté). `undefined` = illisible. */
export function lireNombre(v: unknown): number | null | undefined {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const t = String(v).trim().replace(/[€\s ]/g, "").replace(",", ".");
  if (!t) return null;
  if (!/^-?\d+(\.\d+)?$/.test(t)) return undefined;
  return parseFloat(t);
}

export function texte(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : `${pad(v.getUTCDate())}/${pad(v.getUTCMonth() + 1)}/${v.getUTCFullYear()}`;
  return String(v).trim();
}

function contratNormalise(v: string): string | null | undefined {
  if (!v) return null;
  const n = norm(v);
  const t = CONTRATS_IMPORT.find((c) => norm(c) === n);
  if (t) return t;
  if (n.startsWith("apprenti") || n.startsWith("alternan") || n.includes("professionnalisation")) return "Alternance";
  if (n.startsWith("stage") || n.startsWith("stagiaire")) return "Stage";
  if (n.startsWith("interim")) return "Intérim";
  return undefined;
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ───────────── analyse ───────────── */

/**
 * @param tableau   ligne 0 = en-têtes, puis une ligne par salarié (cellules déjà lues)
 * @param matriculesExistants  matricules déjà utilisés dans l'entreprise
 */
export function analyserTableau(tableau: unknown[][], matriculesExistants: Iterable<string>): Analyse {
  const vide: Analyse = { valides: [], erreurs: [] };
  if (tableau.length === 0) return { ...vide, erreurGlobale: "Le fichier est vide." };

  // repérage des colonnes d'après les en-têtes (l'ordre des colonnes n'a pas d'importance)
  const index = new Map<ChampImport, number>();
  tableau[0].forEach((titre, i) => {
    const n = norm(titre);
    if (!n) return;
    const col = COLONNES.find((c) => c.alias.includes(n));
    if (col && !index.has(col.champ)) index.set(col.champ, i);
  });
  const manquantes = COLONNES.filter((c) => c.requis && !index.has(c.champ)).map((c) => c.titre);
  if (manquantes.length > 0) {
    return { ...vide, erreurGlobale: `Colonne(s) introuvable(s) : ${manquantes.join(", ")}. Utilisez le modèle à télécharger.` };
  }
  const corps = tableau.slice(1);
  if (corps.length > MAX_LIGNES) {
    return { ...vide, erreurGlobale: `Le fichier contient plus de ${MAX_LIGNES} lignes. Découpez-le en plusieurs fichiers.` };
  }

  const cellule = (ligne: unknown[], champ: ChampImport): unknown => {
    const i = index.get(champ);
    return i === undefined ? undefined : ligne[i];
  };

  const pris = new Map<string, string>(); // matricule (minuscules) -> "entreprise" ou "ligne N"
  for (const m of matriculesExistants) if (m) pris.set(m.trim().toLowerCase(), "entreprise");

  const resultat: Analyse = { valides: [], erreurs: [] };

  corps.forEach((ligne, k) => {
    const numero = k + 2;
    const valeurs = COLONNES.map((c) => texte(cellule(ligne, c.champ)));
    if (valeurs.every((v) => v === "")) return; // ligne vide

    const raisons: string[] = [];

    const prenom = texte(cellule(ligne, "prenom"));
    const nom = texte(cellule(ligne, "nom"));
    const poste = texte(cellule(ligne, "poste"));
    if (!prenom) raisons.push("Prénom manquant");
    if (!nom) raisons.push("Nom manquant");
    if (!poste) raisons.push("Poste manquant");

    const contratBrut = texte(cellule(ligne, "typeContrat"));
    const typeContrat = contratNormalise(contratBrut);
    if (typeContrat === undefined) raisons.push(`Type de contrat inconnu « ${contratBrut} » (CDI, CDD, Alternance, Stage, Intérim)`);

    const dateDebut = lireDate(cellule(ligne, "dateDebut"));
    if (dateDebut === undefined) raisons.push("Date de début invalide (format JJ/MM/AAAA)");
    const dateFin = lireDate(cellule(ligne, "dateFin"));
    if (dateFin === undefined) raisons.push("Date de fin invalide (format JJ/MM/AAAA)");
    if (dateDebut && dateFin && dateFin < dateDebut) raisons.push("La date de fin est avant la date de début");

    const heures = lireNombre(cellule(ligne, "heuresHebdomadaires"));
    if (heures === undefined || (heures !== null && (heures <= 0 || heures > 60))) raisons.push("Heures hebdomadaires invalides (entre 1 et 60)");
    const mensuel = lireNombre(cellule(ligne, "salaireMensuel"));
    if (mensuel === undefined || (mensuel !== null && (mensuel < 0 || mensuel > 1_000_000))) raisons.push("Salaire mensuel invalide");
    const annuel = lireNombre(cellule(ligne, "salaireAnnuel"));
    if (annuel === undefined || (annuel !== null && (annuel < 0 || annuel > 10_000_000))) raisons.push("Salaire annuel invalide");

    const email = texte(cellule(ligne, "email"));
    if (email && !RE_EMAIL.test(email)) raisons.push("Adresse email invalide");

    const matricule = texte(cellule(ligne, "matricule")).replace(/\s+/g, " ");
    if (matricule.length > 30) raisons.push("Matricule trop long (30 caractères maximum)");
    if (matricule) {
      const cle = matricule.toLowerCase();
      const ou = pris.get(cle);
      if (ou === "entreprise") raisons.push(`Matricule « ${matricule} » déjà attribué dans l'entreprise`);
      else if (ou) raisons.push(`Matricule « ${matricule} » en doublon dans le fichier (${ou})`);
    }

    if (raisons.length > 0) {
      resultat.erreurs.push({ ligne: numero, raisons, valeurs });
      return;
    }
    if (matricule) pris.set(matricule.toLowerCase(), `déjà utilisé ligne ${numero}`);

    resultat.valides.push({
      ligne: numero,
      donnees: {
        matricule: matricule || null,
        prenom,
        nom,
        poste,
        typeContrat: typeContrat ?? null,
        dateDebut: dateDebut ?? null,
        dateFin: dateFin ?? null,
        heuresHebdomadaires: heures ?? null,
        salaireMensuel: mensuel ?? null,
        salaireAnnuel: annuel ?? null,
        email: email || null,
        telephone: texte(cellule(ligne, "telephone")) || null,
      },
    });
  });

  return resultat;
}
