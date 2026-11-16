// lib/suivi-medical.ts
// Suivi médical des salariés (option « Suivi médical complet ») — règles du Code du travail, sans base de données.
//   SIG : suivi individuel général → visite d'information et de prévention (VIP) dans les 3 mois suivant la prise de poste,
//         puis au plus tard tous les 5 ans.
//   SIA : suivi adapté (travailleur handicapé ou invalide, femme enceinte, travail de nuit, moins de 18 ans) →
//         VIP avant la prise de poste ou dans les 3 mois selon le cas, puis au plus tard tous les 3 ans.
//   SIR : suivi renforcé (postes à risques) → examen médical d'aptitude avant la prise de poste, visite
//         intermédiaire 2 ans après, renouvellement de l'examen au plus tard tous les 4 ans.
// Visite de mi-carrière : l'année civile des 45 ans (à défaut d'accord de branche).
// Visite de reprise (dans les 8 jours de la reprise) : après un congé maternité, une absence d'au moins 30 jours
// pour accident du travail, une maladie professionnelle, ou au moins 60 jours pour maladie ou accident non professionnel.

export const TYPES_SUIVI: Record<string, { label: string; court: string; aide: string }> = {
  SIG: { label: "Suivi général (VIP)", court: "Général", aide: "Visite d'information et de prévention, au plus tard tous les 5 ans." },
  SIA: { label: "Suivi adapté", court: "Adapté", aide: "Travailleur handicapé, femme enceinte, travail de nuit, moins de 18 ans : au plus tard tous les 3 ans." },
  SIR: { label: "Suivi renforcé (SIR)", court: "Renforcé", aide: "Postes à risques : examen d'aptitude, visite intermédiaire à 2 ans, renouvellement à 4 ans." },
};

export type Statut = "retard" | "bientot" | "ok" | "inconnu";
export type Visite = { type: string; libelle: string; date: Date; statut: Statut; detail?: string };

const plusMois = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const plusAns = (d: Date, n: number) => plusMois(d, 12 * n);
const plusJours = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export function statutDate(date: Date, aujourdhui = new Date()): Statut {
  const jours = (date.getTime() - aujourdhui.getTime()) / 86400000;
  return jours < 0 ? "retard" : jours <= 30 ? "bientot" : "ok";
}

type Salarie = { suiviMedical?: string | null; derniereVisite?: Date | string | null; dateDebut?: Date | string | null; dateNaissance?: Date | string | null };
type Absence = { type: string; dateDebut: Date | string; dateFin: Date | string };

const d = (v: Date | string | null | undefined) => (v ? new Date(v) : null);

/** Prochaine visite périodique (ou initiale si aucune visite n'a encore eu lieu) */
export function prochaineVisite(s: Salarie, aujourdhui = new Date()): Visite | null {
  const type = TYPES_SUIVI[s.suiviMedical ?? ""] ? s.suiviMedical! : "SIG";
  const derniere = d(s.derniereVisite);
  const entree = d(s.dateDebut);
  if (!derniere) {
    if (!entree) return null;
    const date = type === "SIG" ? plusMois(entree, 3) : entree;
    const libelle = type === "SIR" ? "Examen médical d'aptitude à l'embauche" : "Visite d'information et de prévention (embauche)";
    return { type: "VISITE_EMBAUCHE", libelle, date, statut: statutDate(date, aujourdhui), detail: type === "SIG" ? "Dans les 3 mois suivant la prise de poste" : "Avant la prise de poste" };
  }
  if (type === "SIR") {
    // Visite intermédiaire 2 ans après l'examen, puis renouvellement de l'examen à 4 ans
    const date = plusAns(derniere, 2);
    return { type: "VISITE_PERIODIQUE", libelle: "Visite intermédiaire ou examen d'aptitude (SIR)", date, statut: statutDate(date, aujourdhui), detail: "2 ans après la dernière visite" };
  }
  const ans = type === "SIA" ? 3 : 5;
  const date = plusAns(derniere, ans);
  return { type: "VISITE_PERIODIQUE", libelle: "Visite d'information et de prévention (périodique)", date, statut: statutDate(date, aujourdhui), detail: `Au plus tard ${ans} ans après la dernière visite` };
}

/** Visites particulières à prévoir : mi-carrière, reprise après un arrêt */
export function alertes(s: Salarie, absences: Absence[], aujourdhui = new Date()): Visite[] {
  const res: Visite[] = [];
  const derniere = d(s.derniereVisite);
  const naissance = d(s.dateNaissance);
  if (naissance) {
    const annee45 = naissance.getFullYear() + 45;
    const debut = new Date(annee45, 0, 1), fin = new Date(annee45, 11, 31);
    // L'année des 45 ans (ou l'année précédente pour l'anticiper), si aucune visite n'a eu lieu depuis le 1er janvier
    if (aujourdhui.getFullYear() >= annee45 - 1 && aujourdhui <= plusMois(fin, 6) && (!derniere || derniere < debut)) {
      res.push({ type: "VISITE_MI_CARRIERE", libelle: "Visite de mi-carrière (45 ans)", date: fin, statut: statutDate(fin, aujourdhui), detail: `À organiser en ${annee45}` });
    }
  }
  for (const a of absences) {
    const debut = new Date(a.dateDebut), fin = new Date(a.dateFin);
    const jours = Math.round((fin.getTime() - debut.getTime()) / 86400000) + 1;
    const maternite = a.type === "MATERNITE_PATERNITE";
    const longue = a.type === "MALADIE" && jours >= 30;
    if (!maternite && !longue) continue;
    if (derniere && derniere >= fin) continue; // visite déjà faite après l'arrêt
    if (fin < plusJours(aujourdhui, -120)) continue; // reprise trop ancienne
    const date = plusJours(fin, 8);
    const detail = maternite
      ? "Après un congé maternité (pas pour un congé paternité)"
      : jours >= 60 ? `Arrêt de ${jours} jours` : `Arrêt de ${jours} jours : obligatoire s'il s'agit d'un accident du travail (au moins 30 jours) ou d'une maladie professionnelle`;
    res.push({ type: "VISITE_REPRISE", libelle: "Visite de reprise", date, statut: statutDate(date, aujourdhui), detail: `${detail} · dans les 8 jours suivant la reprise (${fin.toLocaleDateString("fr-FR")})` });
  }
  return res;
}
