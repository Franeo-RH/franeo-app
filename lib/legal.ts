// lib/legal.ts
// Informations légales affichées sur /mentions-legales et /confidentialite.
// ⚠️ À COMPLÉTER avant la mise en ligne : remplacez chaque « À compléter » par vos informations.

export const EDITEUR = {
  nomCommercial: "FRANEO RH",
  responsable: "À compléter (prénom et nom)",
  statut: "Entrepreneur individuel (micro-entreprise)",
  siret: "À compléter",
  adresse: "À compléter (adresse de domiciliation)",
  email: "À compléter (adresse de contact)",
  site: "franeo-rh.com",
  /** Région de la base de données : console Neon › votre projet › Settings › Region (ex. : « Union européenne (Francfort) ») */
  regionBase: "À compléter (région de la base Neon)",
};

/** Prestataires techniques (sous-traitants au sens du RGPD) */
export const SOUS_TRAITANTS = [
  { nom: "Vercel Inc.", role: "Hébergement de l'application", lieu: "États-Unis / Union européenne", adresse: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis" },
  { nom: "Neon", role: "Base de données", lieu: EDITEUR.regionBase },
  { nom: "OVHcloud", role: "Stockage des documents (contrats, bulletins, justificatifs)", lieu: "France" },
  { nom: "Resend", role: "Envoi des e-mails (invitations, mot de passe oublié)", lieu: "États-Unis" },
  { nom: "Anthropic", role: "Assistant Buddy (uniquement si activé) : les questions sont envoyées sans e-mail, téléphone, n° de sécurité sociale ni IBAN", lieu: "États-Unis" },
];

export const estComplete = () => !Object.values(EDITEUR).some((v) => v.startsWith("À compléter"));

/** Durées de conservation appliquées automatiquement (purge chaque nuit, voir lib/rgpd.ts) */
export const CONSERVATION = {
  pointagesJours: 365,
  journalAuditJours: 365,
  tentativesJours: 2,
  questionsBuddyIgnoreesJours: 365,
  contexteBuddyJours: 30,
  anonymisationApresSortieAns: 5,
} as const;
