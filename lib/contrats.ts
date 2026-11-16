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
  { cle: "statut", label: "Statut", groupe: "Contrat", type: "liste", options: ["ouvrier", "employé", "ETAM", "agent de maîtrise", "cadre"] },
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
  { cle: "caisse_retraite", label: "Caisse de retraite complémentaire", groupe: "Protection sociale", aide: "Ex : AG2R La Mondiale, Malakoff Humanis, PRO BTP…" },
  { cle: "organisme_prevoyance", label: "Organisme de prévoyance", groupe: "Protection sociale" },
  { cle: "mutuelle", label: "Complémentaire santé (mutuelle)", groupe: "Protection sociale" },
  { cle: "niveau", label: "Niveau", groupe: "Convention collective" },
  { cle: "echelon", label: "Échelon", groupe: "Convention collective" },
  { cle: "categorie_syntec", label: "Catégorie Syntec", groupe: "Convention collective", type: "liste", options: ["ETAM", "Ingénieurs et cadres"] },
  { cle: "modalite_temps", label: "Modalité de temps de travail (Syntec)", groupe: "Convention collective", type: "liste", options: ["modalité 1 dite « standard » (35 heures)", "modalité 2 dite « réalisation de missions » (forfait en heures)", "modalité 3 dite « réalisation de missions avec autonomie complète » (forfait en jours)"] },
  { cle: "indemnite_repas", label: "Indemnité de repas / panier (€ par jour)", groupe: "Convention collective", type: "nombre", aide: "Montant fixé par l'accord régional du BTP" },
  { cle: "zone_deplacement", label: "Zone de petits déplacements", groupe: "Convention collective", aide: "Ex : zone 1A (0 à 5 km), selon le chantier" },
  { cle: "caisse_conges", label: "Caisse de congés payés", groupe: "Convention collective" },
  { cle: "avantage_nourriture", label: "Avantage nourriture (HCR)", groupe: "Convention collective" },
  { cle: "lieu_signature", label: "Lieu de signature", groupe: "Signature" },
  { cle: "date_signature", label: "Date de signature", groupe: "Signature", type: "date" },
];

export const GROUPES_CONTRAT = ["Entreprise", "Salarié", "Contrat", "Convention collective", "Temps de travail", "Rémunération", "Protection sociale", "Signature", "Autres champs du modèle"];

/** Modèles détaillés fournis par FRANEO RH (fichiers dans public/modeles), avec des valeurs proposées par défaut */
export type ModeleIntegre = { id: string; nom: string; description: string; url: string; idcc?: string[]; defauts: Record<string, string> };
export const MODELES_INTEGRES: ModeleIntegre[] = [
  { id: "_cdi", nom: "CDI — droit commun", description: "Contrat à durée indéterminée détaillé, à adapter à toute convention collective.", url: "/modeles/contrat-cdi-classique.docx", defauts: {} },
  { id: "_cdd", nom: "CDD — droit commun", description: "Motif, terme, indemnité de fin de contrat, rupture anticipée.", url: "/modeles/contrat-cdd-classique.docx", defauts: { type_contrat: "DÉTERMINÉE" } },
  {
    id: "_btp", nom: "BTP — ouvrier du Bâtiment (CDI)", description: "Classification ouvriers, carte BTP, chantiers, indemnités de petits déplacements, intempéries, caisse de congés payés.", url: "/modeles/contrat-btp-ouvrier.docx", idcc: ["1596", "1597"],
    defauts: { ccn: "nationale des ouvriers du Bâtiment", statut: "ouvrier", caisse_conges: "caisse de congés payés du BTP de votre région (réseau CIBTP)", caisse_retraite: "PRO BTP", organisme_prevoyance: "PRO BTP" },
  },
  {
    id: "_syntec", nom: "Syntec — bureaux d'études et conseil (CDI)", description: "Catégorie ETAM ou cadre, modalités de temps de travail de l'accord de 1999, propriété intellectuelle.", url: "/modeles/contrat-syntec.docx", idcc: ["1486"],
    defauts: { ccn: "nationale des bureaux d'études techniques, cabinets d'ingénieurs-conseils et sociétés de conseils (Syntec)", modalite_temps: "modalité 1 dite « standard » (35 heures)", duree_hebdo: "35" },
  },
  {
    id: "_hcr", nom: "HCR — hôtels, cafés, restaurants (CDI)", description: "Niveau et échelon, heures au-delà de 35 h, avantage nourriture, hygiène HACCP.", url: "/modeles/contrat-hcr.docx", idcc: ["1979"],
    defauts: { ccn: "nationale des hôtels, cafés, restaurants (HCR)", statut: "employé", avantage_nourriture: "repas pris dans l'établissement lorsque le Salarié est présent au moment du service" },
  },
  {
    id: "_commerce", nom: "Commerce alimentaire — détail et gros (CDI)", description: "Niveau de classification, pauses rémunérées, dimanches et jours fériés.", url: "/modeles/contrat-commerce-alimentaire.docx", idcc: ["2216"],
    defauts: { ccn: "nationale du commerce de détail et de gros à prédominance alimentaire", statut: "employé" },
  },
  {
    id: "_proprete", nom: "Propreté — entreprises de nettoyage (CDI)", description: "Sites clients, transfert du contrat en cas de perte de marché (article 7), temps partiel.", url: "/modeles/contrat-proprete.docx", idcc: ["3043"],
    defauts: { ccn: "nationale des entreprises de propreté et services associés", statut: "employé" },
  },
];

/** Modèle conseillé selon la convention collective de l'entreprise (IDCC ou nom) */
export function modeleConseille(ccn: string | null | undefined): string | null {
  const t = (ccn || "").toLowerCase();
  if (!t) return null;
  const m = MODELES_INTEGRES.find((x) => x.idcc?.some((i) => t.includes(i)));
  if (m) return m.id;
  if (/btp|b[âa]timent/.test(t)) return "_btp";
  if (/syntec|bureaux? d.?[ée]tudes/.test(t)) return "_syntec";
  if (/hcr|h[ôo]tel|restaura/.test(t)) return "_hcr";
  if (/propret/.test(t)) return "_proprete";
  if (/alimentaire/.test(t)) return "_commerce";
  return null;
}

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
