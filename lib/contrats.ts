// Champs de fusion des contrats (publipostage) : utilisables dans un modèle Word sous la forme {{nom_du_champ}}

export type ChampContrat = { cle: string; label: string; groupe: string; type?: "date" | "nombre" | "texte" | "liste"; options?: string[]; aide?: string };

export const CHAMPS_CONTRAT: ChampContrat[] = [
  { cle: "societe", label: "Nom de l'entreprise", groupe: "Entreprise" },
  { cle: "siret_societe", label: "SIRET", groupe: "Entreprise" },
  { cle: "adresse_societe", label: "Adresse de l'entreprise", groupe: "Entreprise" },
  { cle: "ccn", label: "Convention collective", groupe: "Entreprise" },
  { cle: "representant", label: "Représentant de l'entreprise (nom, fonction)", groupe: "Entreprise" },
  { cle: "civilite", label: "Civilité", groupe: "Salarié", type: "liste", options: ["Madame", "Monsieur"] },
  { cle: "prenom", label: "Prénom", groupe: "Salarié" },
  { cle: "nom", label: "Nom", groupe: "Salarié" },
  { cle: "date_naissance", label: "Date de naissance", groupe: "Salarié", type: "date" },
  { cle: "lieu_naissance", label: "Lieu de naissance", groupe: "Salarié" },
  { cle: "nationalite", label: "Nationalité", groupe: "Salarié" },
  { cle: "numero_ss", label: "N° de sécurité sociale", groupe: "Salarié" },
  { cle: "adresse_salarie", label: "Adresse du salarié", groupe: "Salarié" },
  { cle: "type_contrat", label: "Type de contrat", groupe: "Contrat", type: "liste", options: ["INDÉTERMINÉE", "DÉTERMINÉE"], aide: "S'écrit dans la phrase « contrat à durée … »" },
  { cle: "motif_cdd", label: "Motif du CDD", groupe: "Contrat", aide: "Ex : remplacement de Mme X absente, accroissement temporaire d'activité…" },
  { cle: "poste", label: "Poste", groupe: "Contrat" },
  { cle: "statut", label: "Statut", groupe: "Contrat", type: "liste", options: ["employé", "agent de maîtrise", "cadre"] },
  { cle: "coefficient", label: "Coefficient", groupe: "Contrat" },
  { cle: "position", label: "Position / niveau", groupe: "Contrat" },
  { cle: "date_debut", label: "Date de début", groupe: "Contrat", type: "date" },
  { cle: "date_fin", label: "Date de fin (CDD)", groupe: "Contrat", type: "date" },
  { cle: "duree_essai", label: "Durée de la période d'essai", groupe: "Contrat", aide: "Ex : 2 mois" },
  { cle: "lieu_travail", label: "Lieu de travail", groupe: "Contrat" },
  { cle: "manager", label: "Responsable hiérarchique", groupe: "Contrat" },
  { cle: "duree_hebdo", label: "Durée hebdomadaire (heures)", groupe: "Temps de travail", type: "nombre" },
  { cle: "horaires", label: "Horaires", groupe: "Temps de travail" },
  { cle: "salaire_brut_mensuel", label: "Salaire brut mensuel (€)", groupe: "Rémunération", type: "nombre" },
  { cle: "salaire_brut_annuel", label: "Salaire brut annuel (€)", groupe: "Rémunération", type: "nombre" },
  { cle: "primes", label: "Primes", groupe: "Rémunération" },
  { cle: "avantages", label: "Avantages", groupe: "Rémunération" },
  { cle: "lieu_signature", label: "Lieu de signature", groupe: "Signature" },
  { cle: "date_signature", label: "Date de signature", groupe: "Signature", type: "date" },
];

export const GROUPES_CONTRAT = ["Entreprise", "Salarié", "Contrat", "Temps de travail", "Rémunération", "Signature", "Autres champs du modèle"];

/** Repère les champs {{...}} dans le texte d'un modèle */
export function champsDuTexte(texte: string): string[] {
  const vus = new Set<string>();
  for (const m of texte.matchAll(/\{\{\s*([A-Za-z0-9_À-ÿ]+)\s*\}\}/g)) vus.add(m[1]);
  return [...vus];
}

/** « 2026-11-07 » → « 07/11/2026 » ; « 2500 » → « 2 500 » */
export function formaterValeur(champ: ChampContrat | undefined, v: string): string {
  if (!v) return "";
  if (champ?.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const [a, m, j] = v.split("-"); return `${j}/${m}/${a}`; }
  if (champ?.type === "nombre") { const n = Number(v.replace(",", ".").replace(/\s/g, "")); return Number.isFinite(n) ? n.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : v; }
  return v;
}

export const libelleChamp = (cle: string) => CHAMPS_CONTRAT.find((c) => c.cle === cle)?.label ?? cle.replace(/_/g, " ");
