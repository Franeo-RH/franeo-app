export type TypeRappel = { code: string; label: string; icone: string };

export const TYPES_RAPPEL: TypeRappel[] = [
  { code: "AVENANT", label: "Échéance d'avenant", icone: "📝" },
  { code: "PERIODE_ESSAI", label: "Fin de période d'essai", icone: "🧪" },
  { code: "TITRE_SEJOUR", label: "Titre de séjour", icone: "🛂" },
  { code: "VISITE_EMBAUCHE", label: "Visite médicale d'embauche", icone: "🩺" },
  { code: "VISITE_PERIODIQUE", label: "Visite médicale périodique", icone: "🩺" },
  { code: "ENTRETIEN_ANNUEL", label: "Entretien annuel", icone: "🗣️" },
  { code: "ENTRETIEN_PRO", label: "Entretien professionnel", icone: "🎯" },
  { code: "HABILITATION", label: "Habilitation / permis", icone: "🪪" },
  { code: "FORMATION", label: "Formation obligatoire", icone: "🎓" },
  { code: "DISPENSE_MUTUELLE", label: "Dispense de mutuelle", icone: "🛡️" },
  { code: "AUTRE", label: "Autre échéance", icone: "📌" },
];

export const FENETRE_BIENTOT_JOURS = 30;
export const FENETRE_DASHBOARD_JOURS = 60;

export type StatutRappel = "retard" | "aujourdhui" | "bientot" | "avenir" | "traite";

export type Echeance = {
  cle: string;
  salarieId: string;
  salarie: string;
  entreprise: string;
  label: string;
  icone: string;
  date: string;
  jours: number;
  statut: StatutRappel;
  auto: boolean;
};

export function typeDe(code: string): TypeRappel {
  return TYPES_RAPPEL.find((t) => t.code === code) ?? { code, label: code, icone: "📌" };
}

export function libelleRappel(r: { type: string; libelle?: string | null }): string {
  const t = typeDe(r.type);
  const precision = r.libelle?.trim();
  if (r.type === "AUTRE") return precision || t.label;
  return precision ? `${t.label} — ${precision}` : t.label;
}

/** Date du jour à Paris, au format AAAA-MM-JJ */
export function aujourdhuiISO(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
}

export function versISO(d: Date | string): string {
  return typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

/** Nombre de jours entre aujourd'hui et la date (négatif = en retard) */
export function joursAvant(d: Date | string): number {
  const ref = Date.parse(`${aujourdhuiISO()}T00:00:00Z`);
  const cible = Date.parse(`${versISO(d)}T00:00:00Z`);
  return Math.round((cible - ref) / 86400000);
}

export function statutRappel(jours: number, traite = false): StatutRappel {
  if (traite) return "traite";
  if (jours < 0) return "retard";
  if (jours === 0) return "aujourdhui";
  if (jours <= FENETRE_BIENTOT_JOURS) return "bientot";
  return "avenir";
}

export function texteDelai(jours: number, traite = false): string {
  if (traite) return "Traité";
  if (jours < -1) return `En retard de ${-jours} j`;
  if (jours === -1) return "En retard d'1 j";
  if (jours === 0) return "Aujourd'hui";
  if (jours === 1) return "Demain";
  if (jours <= 60) return `Dans ${jours} j`;
  return `Dans ${Math.round(jours / 30)} mois`;
}

export const STYLES_STATUT: Record<StatutRappel, string> = {
  retard: "bg-red-100 text-red-600",
  aujourdhui: "bg-red-100 text-red-600",
  bientot: "bg-orange-100 text-orange-600",
  avenir: "bg-green-100 text-green-600",
  traite: "bg-gray-100 text-gray-500",
};

export function formaterDateFR(d: Date | string): string {
  return new Date(`${versISO(d)}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

/** Vérifie et nettoie une échéance reçue par l'API */
export function lireRappel(brut: unknown):
  | { valeur: { type: string; libelle: string | null; dateEcheance: Date; commentaire: string | null }; erreur?: undefined }
  | { erreur: string; valeur?: undefined } {
  const r = (brut ?? {}) as Record<string, unknown>;
  const type = typeof r.type === "string" ? r.type : "";
  if (!TYPES_RAPPEL.some((t) => t.code === type)) return { erreur: "Type d'échéance inconnu." };

  const date = typeof r.dateEcheance === "string" ? r.dateEcheance.slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    return { erreur: "Date d'échéance invalide." };
  }

  const libelle = typeof r.libelle === "string" && r.libelle.trim() ? r.libelle.trim().slice(0, 120) : null;
  if (type === "AUTRE" && !libelle) return { erreur: "Précisez le libellé de l'échéance." };

  const commentaire = typeof r.commentaire === "string" && r.commentaire.trim() ? r.commentaire.trim().slice(0, 500) : null;

  return { valeur: { type, libelle, dateEcheance: new Date(`${date}T00:00:00.000Z`), commentaire } };
}