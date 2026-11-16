// lib/courriers.ts
// Courriers et e-mails types (utilisable côté navigateur et serveur, sans base de données).
// Un modèle contient des champs entre doubles accolades :
//   - champs remplis automatiquement : {{salarie.prenom}}, {{entreprise.nom}}, {{date}}…
//   - tout autre texte, ex. {{Date de fin du contrat}}, devient une case « à compléter ».

export type FormatCourrier = "COURRIER" | "MAIL";

export type ModeleCourrierVue = {
  id: string;
  nom: string;
  categorie: string;
  format: FormatCourrier;
  objet: string | null;
  contenu: string;
  /** DEFAUT (fourni avec l'app), FRANEO (ajouté par FRANEO RH pour tous), ENTREPRISE (modèle du client) */
  origine: "DEFAUT" | "FRANEO" | "ENTREPRISE";
  /** Conseil affiché au-dessus du modèle (règles à respecter) */
  conseil?: string;
};

export type SalarieCourrier = {
  id: string; prenom: string; nom: string; poste: string; typeContrat: string | null; dateDebut: string | null; dateFin: string | null;
  dateNaissance: string | null; rue: string | null; codePostal: string | null; ville: string | null; heuresHebdomadaires: number | null;
  matricule: string | null; email: string | null;
};

/** logo : image du logo du client (data:image/…), placée en haut des courriers */
export type EntrepriseCourrier = { nom: string; rue: string | null; codePostal: string | null; ville: string | null; siret: string | null; telephone: string | null; email: string | null; logo: string | null };

/** Champs remplis automatiquement, proposés dans l'éditeur de modèles */
export const VARIABLES: { cle: string; label: string }[] = [
  { cle: "salarie.prenom", label: "Prénom du salarié" },
  { cle: "salarie.nom", label: "Nom du salarié" },
  { cle: "salarie.poste", label: "Poste" },
  { cle: "salarie.typeContrat", label: "Type de contrat" },
  { cle: "salarie.dateEntree", label: "Date d'entrée" },
  { cle: "salarie.dateFin", label: "Date de fin de contrat" },
  { cle: "salarie.dateNaissance", label: "Date de naissance" },
  { cle: "salarie.heures", label: "Heures par semaine" },
  { cle: "salarie.matricule", label: "Matricule" },
  { cle: "salarie.adresse", label: "Adresse du salarié" },
  { cle: "entreprise.nom", label: "Nom de l'entreprise" },
  { cle: "entreprise.adresse", label: "Adresse de l'entreprise" },
  { cle: "entreprise.ville", label: "Ville de l'entreprise" },
  { cle: "entreprise.siret", label: "SIRET" },
  { cle: "date", label: "Date du jour" },
  { cle: "delaiPrevenance", label: "Délai de prévenance (période d'essai)" },
];

const RE_CHAMP = /\{\{\s*([^{}]+?)\s*\}\}/g;
const fr = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : "");

/**
 * Délai de prévenance quand l'employeur rompt la période d'essai (art. L. 1221-25 du Code du travail),
 * selon le temps de présence : moins de 8 jours → 24 heures ; 8 jours à 1 mois → 48 heures ;
 * après 1 mois → 2 semaines ; après 3 mois → 1 mois.
 */
export function delaiPrevenance(dateEntree: string | null, aujourdhui = new Date()): string {
  if (!dateEntree) return "";
  const debut = new Date(dateEntree);
  const jours = Math.floor((aujourdhui.getTime() - debut.getTime()) / 86400000) + 1;
  if (jours < 8) return "24 heures";
  const unMois = new Date(debut); unMois.setMonth(unMois.getMonth() + 1);
  if (aujourdhui < unMois) return "48 heures";
  const troisMois = new Date(debut); troisMois.setMonth(troisMois.getMonth() + 3);
  if (aujourdhui < troisMois) return "2 semaines";
  return "1 mois";
}

/** Valeurs des champs automatiques pour ce salarié et cette entreprise */
export function valeursAuto(s: SalarieCourrier | null, e: EntrepriseCourrier | null, aujourdhui = new Date()): Record<string, string> {
  const adresseEnt = e ? [e.rue, [e.codePostal, e.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "";
  const v: Record<string, string> = {
    date: aujourdhui.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    "entreprise.nom": e?.nom ?? "",
    "entreprise.adresse": adresseEnt,
    "entreprise.ville": e?.ville ?? "",
    "entreprise.siret": e?.siret ?? "",
  };
  if (s) {
    Object.assign(v, {
      "salarie.prenom": s.prenom,
      "salarie.nom": s.nom,
      "salarie.poste": s.poste,
      "salarie.typeContrat": s.typeContrat ?? "",
      "salarie.dateEntree": fr(s.dateDebut),
      "salarie.dateFin": fr(s.dateFin),
      "salarie.dateNaissance": fr(s.dateNaissance),
      "salarie.heures": s.heuresHebdomadaires ? String(s.heuresHebdomadaires).replace(".", ",") : "",
      "salarie.matricule": s.matricule ?? "",
      "salarie.adresse": [s.rue, [s.codePostal, s.ville].filter(Boolean).join(" ")].filter(Boolean).join(", "),
      delaiPrevenance: delaiPrevenance(s.dateDebut, aujourdhui),
    });
  }
  return v;
}

const estAuto = (cle: string) => VARIABLES.some((x) => x.cle === cle);

/** Cases « à compléter » d'un modèle (champs qui ne sont pas remplis automatiquement), dans l'ordre */
export function champsLibres(...textes: (string | null | undefined)[]): string[] {
  const vus: string[] = [];
  for (const t of textes) for (const m of (t ?? "").matchAll(RE_CHAMP)) if (!estAuto(m[1]) && !vus.includes(m[1])) vus.push(m[1]);
  return vus;
}

/** Un champ dont le libellé contient « facultatif » peut rester vide */
export const estFacultatif = (cle: string) => /facultatif/i.test(cle);

/** Remplace les champs ; un champ obligatoire vide reste visible « [ … ] » pour ne pas l'oublier */
export function remplir(texte: string, valeurs: Record<string, string>): string {
  const rempli = texte.replace(RE_CHAMP, (_, cle: string) => {
    const v = valeurs[cle];
    if (estFacultatif(cle) && !(v && v.trim())) return "";
    return v && v.trim() ? v : `[${cle.startsWith("salarie.") || cle.startsWith("entreprise.") ? VARIABLES.find((x) => x.cle === cle)?.label ?? cle : cle}]`;
  });
  return rempli.replace(/\n{3,}/g, "\n\n");
}

/* ═══════════════ Modèles fournis avec l'application ═══════════════ */

export const MODELES_DEFAUT: ModeleCourrierVue[] = [
  {
    id: "defaut:rupture-pe",
    origine: "DEFAUT",
    categorie: "Période d'essai",
    nom: "Rupture de la période d'essai (employeur)",
    format: "COURRIER",
    objet: "Rupture de votre période d'essai",
    conseil: "À envoyer en recommandé avec accusé de réception ou à remettre en main propre contre décharge, avant la fin de la période d'essai. Le délai de prévenance est proposé selon le temps de présence (art. L. 1221-25) : vérifiez-le et la date de fin du contrat.",
    contenu: `Madame, Monsieur,

Vous avez été engagé(e) le {{salarie.dateEntree}} en qualité de {{salarie.poste}}, dans le cadre d'un contrat {{salarie.typeContrat}} comportant une période d'essai.

Nous vous informons de notre décision de mettre fin à votre période d'essai.

Conformément à l'article L. 1221-25 du Code du travail, vous bénéficiez d'un délai de prévenance de {{delaiPrevenance}}. Votre contrat de travail prendra donc fin le {{Date de fin du contrat}} au soir.

À cette date, nous tiendrons à votre disposition votre certificat de travail, votre attestation destinée à France Travail ainsi que votre reçu pour solde de tout compte, comprenant les sommes qui vous restent dues.

Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

{{Nom et fonction du signataire}}


Remis en main propre contre décharge le ____________________
Signature du salarié :`,
  },
  {
    id: "defaut:prolongation-pe",
    origine: "DEFAUT",
    categorie: "Période d'essai",
    nom: "Renouvellement de la période d'essai",
    format: "COURRIER",
    objet: "Proposition de renouvellement de votre période d'essai",
    conseil: "Le renouvellement n'est possible que s'il est prévu par un accord de branche étendu ET par le contrat de travail. Il doit être proposé avant la fin de la période initiale et accepté par écrit par le salarié (signature précédée de la mention manuscrite).",
    contenu: `Madame, Monsieur,

Vous avez été engagé(e) le {{salarie.dateEntree}} en qualité de {{salarie.poste}}. Votre période d'essai, d'une durée initiale de {{Durée initiale de la période d'essai}}, prend fin le {{Date de fin de la période initiale}}.

Comme le prévoient votre contrat de travail et la convention collective applicable, nous vous proposons de renouveler votre période d'essai pour une durée de {{Durée du renouvellement}}, soit jusqu'au {{Nouvelle date de fin de la période d'essai}} inclus.

Ce renouvellement ne peut intervenir qu'avec votre accord exprès. Si vous l'acceptez, nous vous remercions de nous retourner un exemplaire de ce courrier, daté et signé, précédé de la mention manuscrite « Bon pour accord pour le renouvellement de ma période d'essai », au plus tard le {{Date de fin de la période initiale}}.

Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

{{Nom et fonction du signataire}}

Fait en deux exemplaires.

Date, mention manuscrite « Bon pour accord pour le renouvellement de ma période d'essai » et signature du salarié :`,
  },
  {
    id: "defaut:relance-documents",
    origine: "DEFAUT",
    categorie: "Relances",
    nom: "Relance : documents à transmettre",
    format: "MAIL",
    objet: "Documents à nous transmettre",
    contenu: `Bonjour {{salarie.prenom}},

Pour compléter votre dossier, il nous manque encore les documents suivants :
{{Documents manquants}}

Merci de nous les transmettre au plus tard le {{Date limite}}, par retour de mail ou depuis votre espace salarié.

N'hésitez pas à revenir vers nous si vous avez une question.

Bien cordialement,
{{Nom et fonction du signataire}}
{{entreprise.nom}}`,
  },
  {
    id: "defaut:relance-justificatif",
    origine: "DEFAUT",
    categorie: "Relances",
    nom: "Relance : justificatif d'absence",
    format: "COURRIER",
    objet: "Demande de justificatif d'absence",
    conseil: "Courrier à envoyer en recommandé avec accusé de réception. Laissez un délai raisonnable au salarié pour répondre avant d'envisager toute autre suite.",
    contenu: `Madame, Monsieur,

Nous constatons que vous êtes absent(e) de votre poste de travail depuis le {{Date de début de l'absence}}, sans nous avoir transmis de justificatif à ce jour.

Nous vous demandons de bien vouloir nous faire parvenir un justificatif de cette absence, ou de reprendre votre poste, au plus tard le {{Date limite de réponse}}.

Si vous rencontrez une difficulté, nous vous invitons à prendre contact avec nous dans les meilleurs délais.

Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

{{Nom et fonction du signataire}}`,
  },
  {
    id: "defaut:relance-visite",
    origine: "DEFAUT",
    categorie: "Relances",
    nom: "Rappel : visite médicale",
    format: "MAIL",
    objet: "Rappel de votre visite médicale",
    contenu: `Bonjour {{salarie.prenom}},

Nous vous rappelons votre rendez-vous auprès du service de prévention et de santé au travail :
- le {{Date et heure du rendez-vous}}
- à l'adresse suivante : {{Adresse du rendez-vous}}

Ce rendez-vous a lieu sur votre temps de travail. Merci de vous munir d'une pièce d'identité et, si vous en avez, de vos lunettes ou de vos documents médicaux utiles.

En cas d'empêchement, merci de nous prévenir au plus vite.

Bien cordialement,
{{Nom et fonction du signataire}}
{{entreprise.nom}}`,
  },
  {
    id: "defaut:attestation-employeur",
    origine: "DEFAUT",
    categorie: "Attestations",
    nom: "Attestation employeur",
    format: "COURRIER",
    objet: "Attestation employeur",
    conseil: "Attestation à remettre au salarié qui en fait la demande (banque, bailleur, administration…). Vérifiez les informations du contrat avant de signer. La « Précision » est facultative (ex. : le salarié n'est ni en période d'essai, ni en procédure de licenciement).",
    contenu: `Je soussigné(e) {{Nom et fonction du signataire}}, agissant pour le compte de la société {{entreprise.nom}}, située {{entreprise.adresse}}, immatriculée sous le numéro SIRET {{entreprise.siret}},

atteste que {{salarie.prenom}} {{salarie.nom}}, né(e) le {{salarie.dateNaissance}}, est employé(e) au sein de notre société depuis le {{salarie.dateEntree}}, en qualité de {{salarie.poste}}, dans le cadre d'un contrat {{salarie.typeContrat}}, à raison de {{salarie.heures}} heures par semaine.

{{Précision (facultatif)}}

Cette attestation est délivrée à l'intéressé(e), à sa demande, pour servir et valoir ce que de droit.

Fait à {{entreprise.ville}}, le {{date}}.

{{Nom et fonction du signataire}}
Signature et cachet de l'entreprise :`,
  },
];

export const CATEGORIES = ["Période d'essai", "Relances", "Attestations", "Mes modèles"];
