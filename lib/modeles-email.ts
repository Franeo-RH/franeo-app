// lib/modeles-email.ts
// Modèles d'e-mails de FRANEO RH : variables remplacées à l'envoi depuis la fiche d'un client.
// (Sans base de données : utilisable dans le navigateur.)

export const VARIABLES_EMAIL: { cle: string; aide: string }[] = [
  { cle: "{prenom}", aide: "prénom du destinataire" },
  { cle: "{entreprise}", aide: "nom du client" },
  { cle: "{mois}", aide: "mois en cours" },
  { cle: "{montant}", aide: "montant de la dernière facture" },
  { cle: "{lien}", aide: "adresse de l'application" },
];

export const MODELES_EMAIL_DEFAUT: { nom: string; sujet: string; corps: string }[] = [
  {
    nom: "Bienvenue",
    sujet: "Bienvenue chez FRANEO RH, {prenom} !",
    corps: "Bonjour {prenom},\n\nBienvenue chez FRANEO RH ! Votre espace {entreprise} est prêt : {lien}\n\nPour bien démarrer :\n• ajoutez vos salariés (ou envoyez-nous votre fichier, nous nous en chargeons) ;\n• signez votre mandat de prélèvement dans Mon entreprise ;\n• posez vos questions à Buddy, notre assistant, en bas à droite de l'écran.\n\nJe reste disponible pour un premier point quand vous le souhaitez.\n\nÀ très vite,\nLucas — FRANEO RH",
  },
  {
    nom: "Relance de paiement",
    sujet: "Votre facture FRANEO RH en attente",
    corps: "Bonjour {prenom},\n\nSauf erreur de ma part, la dernière facture de {entreprise} ({montant}) n'est pas encore réglée.\n\nSi le règlement est déjà parti, merci de ne pas tenir compte de ce message. Sinon, n'hésitez pas à me dire si quelque chose bloque.\n\nBien cordialement,\nLucas — FRANEO RH",
  },
  {
    nom: "Fin de l'essai gratuit",
    sujet: "Votre essai de l'application Franeo RH se termine bientôt",
    corps: "Bonjour {prenom},\n\nL'essai gratuit de l'application Franeo RH pour {entreprise} se termine bientôt. Pour continuer sans interruption, il vous suffit de choisir votre formule dans Mon entreprise : {lien}\n\nJe vous propose un rapide appel pour faire le point sur vos besoins et la formule la plus adaptée.\n\nBien cordialement,\nLucas — FRANEO RH",
  },
  {
    nom: "Rappel mandat de prélèvement",
    sujet: "Un dernier détail : votre mandat de prélèvement",
    corps: "Bonjour {prenom},\n\nPour régler vos abonnements par prélèvement mensuel, pensez à signer votre mandat SEPA dans Mon entreprise (1 minute, sur la page sécurisée de Stripe) : {lien}\n\nMerci et belle journée,\nLucas — FRANEO RH",
  },
  {
    nom: "Point mensuel",
    sujet: "Point RH de {mois} pour {entreprise}",
    corps: "Bonjour {prenom},\n\nJe vous propose notre point RH de {mois} : échéances à venir, paie, questions en cours.\n\nQuel créneau vous conviendrait cette semaine ?\n\nBien cordialement,\nLucas — FRANEO RH",
  },
];

export function remplirModele(texte: string, v: Record<string, string>) {
  return texte.replace(/\{(prenom|entreprise|mois|montant|lien)\}/g, (m, k: string) => v[k] ?? m);
}
