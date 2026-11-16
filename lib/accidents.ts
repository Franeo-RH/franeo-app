// lib/accidents.ts
// Accidents du travail / de trajet (utilisable côté navigateur et serveur).

import { joursFeries } from "@/lib/conges";

export const STATUTS_AT: Record<string, { label: string; fond: string; texte: string }> = {
  A_DECLARER: { label: "⏳ À déclarer à la CPAM", fond: "#fff7ed", texte: "#c2410c" },
  DECLARE: { label: "📨 Déclaré (DAT envoyée)", fond: "#dbeafe", texte: "#1d4ed8" },
  INSTRUCTION: { label: "🔎 Instruction CPAM", fond: "#ede9fe", texte: "#6d28d9" },
  DECIDE: { label: "⚖️ Décision reçue", fond: "#dcfce7", texte: "#15803d" },
  CLOS: { label: "✅ Clos", fond: "#f3f4f6", texte: "#374151" },
};

export const TYPES_AT: Record<string, string> = { TRAVAIL: "Accident du travail", TRAJET: "Accident de trajet" };
export const DECISIONS_AT: Record<string, string> = { PRISE_EN_CHARGE: "Caractère professionnel reconnu", REFUS: "Refus de prise en charge" };

/** Questions habituelles du questionnaire employeur de la CPAM (instruction du dossier) */
export const QUESTIONS_CPAM: { cle: string; question: string; trajet?: boolean }[] = [
  { cle: "horaires", question: "Quels étaient les horaires de travail du salarié le jour de l'accident ?" },
  { cle: "lieuHabituel", question: "Le salarié était-il sur son lieu de travail habituel ? Sinon, pour quelle raison était-il à cet endroit ?" },
  { cle: "tache", question: "Quelle tâche effectuait-il au moment des faits ? Faisait-elle partie de ses missions ?" },
  { cle: "circonstances", question: "Décrivez précisément les circonstances (lieu exact, geste, outil, objet ou machine en cause)." },
  { cle: "temoins", question: "Y a-t-il eu des témoins ? Lesquels (nom, fonction, coordonnées) ?" },
  { cle: "information", question: "Quand et par qui avez-vous été informé(e) de l'accident ?" },
  { cle: "poursuite", question: "Le salarié a-t-il poursuivi son travail après l'accident ? A-t-il consulté un médecin le jour même ?" },
  { cle: "etatAnterieur", question: "Avez-vous connaissance d'un état antérieur ou d'une cause étrangère au travail ?" },
  { cle: "trajetHabituel", question: "Trajet : quel est le trajet habituel du salarié (domicile ↔ travail ou lieu de repas) et ses horaires ?", trajet: true },
  { cle: "detour", question: "Trajet : le salarié a-t-il fait un détour ou interrompu son trajet ? Pour quelle raison ?", trajet: true },
  { cle: "reserves", question: "Émettez-vous des réserves ? Lesquelles (elles doivent être motivées : temps, lieu, cause étrangère au travail) ?" },
];

export const LIENS_AT = {
  dat: { label: "Déclarer en ligne (net-entreprises.fr)", href: "https://www.net-entreprises.fr" },
  questionnaire: { label: "Questionnaire en ligne (questionnaires-risquepro.ameli.fr)", href: "https://questionnaires-risquepro.ameli.fr/login" },
};

const cle = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Date limite de la déclaration (DAT) : 48 heures après que l'employeur a eu connaissance de l'accident,
 * dimanches et jours fériés non compris.
 */
export function limiteDAT(connuLe: Date | string): Date {
  const d = new Date(connuLe);
  let restant = 2;
  while (restant > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && !joursFeries(d.getFullYear()).has(cle(d))) restant--;
  }
  return d;
}

/** Réserves motivées : dans les 10 jours francs à compter de la déclaration (DAT) */
export function limiteReserves(datDate: Date | string): Date {
  const d = new Date(datDate);
  d.setDate(d.getDate() + 10);
  return d;
}

/** Questionnaire CPAM : 20 jours francs à compter de sa réception (la date exacte figure sur le questionnaire) */
export function limiteQuestionnaire(recuLe: Date | string): Date {
  const d = new Date(recuLe);
  d.setDate(d.getDate() + 20);
  return d;
}

/** Étape du dossier déduite des informations saisies (« Clos » reste un choix manuel) */
export function statutAT(a: { statut?: string | null; datDate?: Date | string | null; questionnaireRecuLe?: Date | string | null; decision?: string | null }): string {
  if (a.statut === "CLOS") return "CLOS";
  if (a.decision) return "DECIDE";
  if (a.questionnaireRecuLe) return "INSTRUCTION";
  if (a.datDate) return "DECLARE";
  return "A_DECLARER";
}

/** Prochaine action et sa date limite, pour l'affichage */
export function prochaineEtape(a: {
  statut: string; createdAt: Date | string; connuLe?: Date | string | null; datDate?: Date | string | null;
  questionnaireRecuLe?: Date | string | null; questionnaireEnvoyeLe?: Date | string | null; decision?: string | null;
}): { texte: string; limite: Date | null } | null {
  if (a.statut === "CLOS") return null;
  if (!a.datDate) return { texte: "Envoyer la déclaration d'accident du travail (DAT)", limite: limiteDAT(a.connuLe ?? a.createdAt) };
  if (!a.questionnaireRecuLe) return { texte: "Réserves motivées éventuelles", limite: limiteReserves(a.datDate) };
  if (!a.questionnaireEnvoyeLe) return { texte: "Répondre au questionnaire de la CPAM", limite: limiteQuestionnaire(a.questionnaireRecuLe) };
  if (!a.decision) return { texte: "Attendre la décision de la CPAM", limite: null };
  return { texte: "Suivre la reprise puis clore le dossier", limite: null };
}
