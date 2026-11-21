// lib/entretiens.ts
// Entretiens annuels et professionnels (Code du travail, art. L6315-1) : entretien professionnel tous les 2 ans,
// état des lieux récapitulatif tous les 6 ans d'ancienneté. Sans base de données : utilisable dans le navigateur.

export const TYPES_ENTRETIEN: Record<string, { label: string; court: string }> = {
  ANNUEL: { label: "Entretien annuel d'évaluation", court: "Annuel" },
  PROFESSIONNEL: { label: "Entretien professionnel", court: "Professionnel" },
  ETAT_DES_LIEUX: { label: "État des lieux récapitulatif (6 ans)", court: "Bilan 6 ans" },
};

/** Trame du compte rendu : mêmes rubriques pour tous les types (les vides ne sont pas imprimées) */
export const TRAME_ENTRETIEN: { cle: string; label: string; types?: string[] }[] = [
  { cle: "bilan", label: "Bilan de la période écoulée" },
  { cle: "objectifs_atteints", label: "Objectifs atteints", types: ["ANNUEL"] },
  { cle: "objectifs", label: "Objectifs pour la période à venir", types: ["ANNUEL"] },
  { cle: "competences", label: "Compétences acquises et à développer" },
  { cle: "formations_suivies", label: "Formations suivies", types: ["PROFESSIONNEL", "ETAT_DES_LIEUX"] },
  { cle: "formations", label: "Formations souhaitées" },
  { cle: "evolution", label: "Perspectives d'évolution professionnelle (qualification, emploi)", types: ["PROFESSIONNEL", "ETAT_DES_LIEUX"] },
  { cle: "cpf", label: "Information sur le CPF, le CEP et la VAE", types: ["PROFESSIONNEL", "ETAT_DES_LIEUX"] },
  { cle: "certification", label: "Certification ou élément de certification obtenu", types: ["ETAT_DES_LIEUX"] },
  { cle: "progression", label: "Progression salariale ou professionnelle", types: ["ETAT_DES_LIEUX"] },
  { cle: "commentaire_salarie", label: "Commentaires du salarié" },
  { cle: "commentaire_responsable", label: "Commentaires du responsable" },
];

const ANS = (d: Date, n: number) => { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; };

/** Prochains entretiens obligatoires d'un salarié */
export function prochainsEntretiens(dateDebut: Date | string | null, entretiens: { type: string; date: Date | string; statut: string }[]) {
  const debut = dateDebut ? new Date(dateDebut) : null;
  const realises = (t: string) => entretiens.filter((e) => e.type === t && e.statut === "REALISE").map((e) => new Date(e.date)).sort((a, b) => b.getTime() - a.getTime());
  const dernierPro = realises("PROFESSIONNEL")[0] ?? realises("ETAT_DES_LIEUX")[0] ?? null;
  const pro = dernierPro ? ANS(dernierPro, 2) : debut ? ANS(debut, 2) : null;
  let bilan: Date | null = null;
  if (debut) {
    // Prochain multiple de 6 ans d'ancienneté (en retard s'il est passé depuis moins d'un an et pas encore fait)
    const ilYaUnAn = ANS(new Date(), -1);
    let k = 1;
    while (ANS(debut, 6 * k) < ilYaUnAn) k++;
    bilan = ANS(debut, 6 * k);
    if (realises("ETAT_DES_LIEUX").some((d) => d >= ANS(bilan!, -1))) bilan = ANS(debut, 6 * (k + 1));
  }
  const dernierAnnuel = realises("ANNUEL")[0] ?? null;
  return { dernierPro, pro, bilan, dernierAnnuel, annuel: dernierAnnuel ? ANS(dernierAnnuel, 1) : null };
}

export const statutDate = (d: Date | null) => {
  if (!d) return "inconnu";
  const j = (d.getTime() - Date.now()) / 86400000;
  return j < 0 ? "retard" : j <= 90 ? "bientot" : "ok";
};
