// Grille du recrutement (montants nets, TVA non applicable) : lancement fixe puis primes au succès

export const LANCEMENT_RECRUTEMENT = 400;

export const CATEGORIES_RECRUTEMENT = [
  { code: "NON_QUALIFIE", label: "Non qualifié / administratif", signature: 400, finEssai: 800 },
  { code: "TECHNICIEN", label: "Technicien / commercial / métier spécialisé / manager", signature: 600, finEssai: 1500 },
  { code: "EXPERT", label: "Expert / cadre", signature: 900, finEssai: 2000 },
] as const;

export function categorieRecrutement(code: string | null | undefined) {
  return CATEGORIES_RECRUTEMENT.find((c) => c.code === code) ?? CATEGORIES_RECRUTEMENT[0];
}

export const totalRecrutement = (code: string) => {
  const c = categorieRecrutement(code);
  return LANCEMENT_RECRUTEMENT + c.signature + c.finEssai;
};

// Les 3 onglets de suivi côté admin
export const ETAPES_RECRUTEMENT = [
  { cle: "demande", label: "📥 Demandes", statuts: ["Reçue"] },
  { cle: "en-cours", label: "🔎 En cours", statuts: ["En cours", "Candidats proposés", "Contrat signé"] },
  { cle: "termine", label: "✅ Terminés", statuts: ["Terminé", "Clôturée", "Annulé"] },
] as const;
