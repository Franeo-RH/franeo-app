// lib/buddy/intentions.ts
// Comprend ce que veut l'utilisateur à partir d'une phrase libre (règles, sans appel à une IA).

import {
  a,
  aPrefixe,
  analyserDates,
  detecterContrat,
  detecterThematique,
  detecterTypeVariable,
  estAbsence,
  estQuestion,
  matchSalaries,
  parseNombre,
  type Msg,
} from "./outils";
import { detecterChamp } from "./flux-rh";
import { detecterTypeEcheance, motEcheance, typeEcheanceFort } from "./flux-echeances";
import type { Ctx, Env, ModuleBuddy } from "./types";

export type IntentionId =
  | "vide"
  | "salut"
  | "merci"
  | "aurevoir"
  | "identite"
  | "aide"
  | "annuler_rien"
  | "oui_non_seul"
  | "nav"
  | "actus_liste"
  | "actus_resume"
  | "actus_lire"
  | "facturation"
  | "abo_info"
  | "abo_formules"
  | "abo_evolution"
  | "abo_annuler"
  | "recrutement_creer"
  | "recrutement_liste"
  | "ticket_creer"
  | "ticket_liste"
  | "ticket_voir"
  | "ticket_repondre"
  | "echeance_ajout"
  | "echeance_suppr"
  | "echeance_modif"
  | "echeance_traiter"
  | "echeance_info"
  | "absence_ajout"
  | "absence_suppr"
  | "absence_modif"
  | "absence_info"
  | "variable_ajout"
  | "variable_suppr"
  | "variable_modif"
  | "variable_info"
  | "salarie_ajout"
  | "salarie_modif"
  | "salarie_suppr"
  | "salarie_fiche"
  | "salarie_liste"
  | "paie_recap"
  | "precision_retrait"
  | "inconnu";

export interface Intention {
  id: IntentionId;
  /** rh | paie | support : de quel service parle-t-on ? */
  canal: "rh" | "paie" | "support" | null;
}

const intention = (id: IntentionId, canal: Intention["canal"] = null): Intention => ({ id, canal });

/* ───────────── Verbes d'action ───────────── */

export const veutSupprimer = (m: Msg): boolean =>
  aPrefixe(m, "supprim", "retir", "efface", "enlev", "delet", "annul") || a(m, "plus besoin", "ne plus avoir");

export const veutModifier = (m: Msg): boolean =>
  aPrefixe(m, "modifi", "chang", "corrig", "remplac", "decal", "prolong", "rallong", "raccourc", "repouss") || a(m, "mets a jour", "mise a jour", "maj", "passe a", "passer a");

export const veutAjouter = (m: Msg): boolean =>
  aPrefixe(m, "ajout", "cree", "creer", "declar", "enregistr", "saisi", "insert", "nouveau", "nouvelle", "pose", "poser", "prend", "mets", "mettre", "add", "verse", "accord", "attribu", "octroi", "embauch", "integr") ||
  a(m, "met", "rajoute", "rajouter", "donne", "donner");

const veutLister = (m: Msg): boolean =>
  aPrefixe(m, "list", "montr", "affich", "voir", "combien", "quel", "quand", "historique", "recap", "bilan", "resume") ||
  a(m, "mes", "les", "ou en est", "ou en sont", "etat", "statut", "suivi", "qui", "est ce que", "donne moi", "dis moi");

/* ───────────── Détection ───────────── */

const SALUTATIONS = ["bonjour", "salut", "hello", "coucou", "bonsoir", "hey", "yo", "bjr", "slt", "cc"];

function nomme(m: Msg, env: Env): boolean {
  return matchSalaries(m, env.salaries).length > 0;
}

export function detecter(m: Msg, env: Env, ctx: Ctx): Intention {
  if (m.mots.length === 0) return intention("vide");
  const n = m.mots.length;

  /* 1) Conversation courante */
  if (n <= 4 && SALUTATIONS.includes(m.mots[0])) return intention("salut");
  if (n <= 5 && a(m, "merci", "thanks", "thx", "merci beaucoup", "super merci", "genial merci")) return intention("merci");
  if (n <= 5 && a(m, "au revoir", "a bientot", "bye", "a plus", "bonne journee", "bonne soiree", "ciao", "a demain")) return intention("aurevoir");
  if (a(m, "qui es tu", "tu es qui", "t es qui", "comment tu t appelles", "comment t appelles tu", "ton nom", "c est quoi buddy", "qui est buddy", "presente toi")) return intention("identite");
  if (
    (n <= 4 && a(m, "aide", "help", "menu", "aidez moi", "aide moi", "besoin d aide", "commandes")) ||
    a(m, "que sais tu faire", "que peux tu faire", "tu sais faire quoi", "tes fonctionnalites", "quelles sont tes fonctions", "tu peux faire quoi", "que sais-tu faire", "qu est ce que tu sais faire", "comment ca marche")
  ) {
    return intention("aide");
  }
  if (n <= 2 && a(m, "annule", "annuler", "stop", "laisse tomber")) return intention("annuler_rien");
  if (n <= 2 && a(m, "oui", "non", "ok", "ouais", "d accord")) return intention("oui_non_seul");

  /* 2) Navigation (« va sur… », « emmène-moi… ») */
  const verbeNav = aPrefixe(m, "emmen", "amen", "redirig", "naviguer") || a(m, "va", "vas", "aller", "ouvre", "ouvrir", "acceder", "acces", "page", "direction", "retourne", "retour");
  if (verbeNav && !a(m, "un", "une", "nouveau", "nouvelle") && !aPrefixe(m, "ajout", "cree", "creer", "supprim")) {
    return intention("nav");
  }

  const salarie = nomme(m, env);
  const nSalarie = aPrefixe(m, "salari", "employe", "collaborat", "personnel", "effectif");

  /* 3) Salariés + facturation : « combien de salariés comptent pour la facturation ? » */
  if (nSalarie && aPrefixe(m, "factur")) return intention("salarie_liste");

  /* 4) Actualités RH */
  const nActu = a(m, "actu", "actus", "actualite", "actualites", "news", "nouveaute", "nouveautes", "quoi de neuf", "veille");
  const verbeResume = aPrefixe(m, "resum", "simplif", "vulgaris", "synthes", "expliqu", "explicit") || a(m, "en clair", "mots simples", "en bref", "l essentiel", "en resume", "c est quoi");
  if (nActu) {
    if (aPrefixe(m, "lis", "lir") || a(m, "en entier", "en entiere", "texte complet", "integralite", "complet", "complete")) return intention("actus_lire");
    if (verbeResume) return intention("actus_resume");
    return intention("actus_liste");
  }
  if (ctx.liste?.type === "actus" && !estAbsence(m)) {
    // « Lis-la en entier », « lis la 2 », « texte complet » juste après une actualité
    if (aPrefixe(m, "lis", "lir", "ouvr", "affich") || a(m, "en entier", "en entiere", "texte complet", "integralite", "complet", "complete", "la suite")) return intention("actus_lire");
    if (verbeResume) return intention("actus_resume");
  }

  /* 5) Facturation */
  if (aPrefixe(m, "factur") || a(m, "combien je dois", "combien je paie", "montant du mois", "mon reglement", "ma note")) return intention("facturation");

  /* 6) Abonnements */
  const nAbo = aPrefixe(m, "abonnement", "formule", "forfait", "souscri", "tarif", "upgrade", "downgrade") || a(m, "pack", "mon offre", "les offres", "nos offres", "offres", "prix");
  const nEvolution = a(m, "evolution", "evolutions", "changement", "changements");
  const canalAbo: Intention["canal"] = aPrefixe(m, "paie", "bulletin") ? "paie" : a(m, "rh", "ticket", "tickets", "salaries", "salarie") ? "rh" : null;
  if (veutSupprimer(m) && a(m, "demande", "demandes") && (nAbo || nEvolution || a(m, "evolution", "changement"))) return intention("abo_annuler", canalAbo);
  if (veutSupprimer(m) && a(m, "ma demande", "mes demandes") && !estAbsence(m) && !aPrefixe(m, "recrut")) return intention("abo_annuler", canalAbo);
  if (
    aPrefixe(m, "souscri", "upgrad", "migr") ||
    a(m, "passer a", "passer en", "passe a", "changer de formule", "changer d abonnement", "changer de forfait", "changer de pack", "evoluer", "evolution", "prendre la formule", "choisir la formule", "monter en gamme", "je prends la formule", "je veux la formule", "je veux le pack") ||
    (veutModifier(m) && nAbo) ||
    (nAbo && a(m, "veux", "voudrais", "souhaite", "aimerais", "prendre", "demande", "demander"))
  ) {
    if (!(a(m, "passer a", "passe a") && !nAbo && (salarie || nSalarie || estAbsence(m) || detecterTypeVariable(m)))) return intention("abo_evolution", canalAbo);
  }
  if (nAbo && (a(m, "formules", "tarifs", "forfaits", "offres", "prix", "comparer", "comparatif", "differentes", "disponibles", "proposez", "proposes", "existe", "existent") || aPrefixe(m, "tarif"))) {
    return intention("abo_formules", canalAbo);
  }
  if (nAbo) return intention("abo_info", canalAbo);

  /* 7) Recrutement */
  const nRecrut = aPrefixe(m, "recrut", "candidat") || a(m, "offre d emploi", "offres d emploi") || ((a(m, "embaucher", "embauche") && !nSalarie && !a(m, "date")) && !salarie);
  if (nRecrut) {
    const creation =
      aPrefixe(m, "recruter", "cree", "creer", "lanc", "ouvr", "nouvelle", "besoin") ||
      a(m, "embaucher", "je veux", "je voudrais", "j aimerais", "je souhaite", "on cherche", "je cherche", "nous cherchons", "demande de recrutement") ||
      a(m, "trouver un candidat", "chercher un candidat");
    const liste_ = aPrefixe(m, "list", "historique", "suivi", "statut", "etat") || a(m, "mes demandes", "mes recrutements", "ou en est", "ou en sont", "combien");
    if (creation && !liste_) return intention("recrutement_creer");
    return intention("recrutement_liste");
  }

  /* 8) Tickets RH et helpdesk */
  const nTicket = aPrefixe(m, "ticket");
  const nSupport =
    aPrefixe(m, "helpdesk", "support", "bug", "anomalie", "plantage") ||
    a(m, "probleme technique", "souci technique", "ca ne marche pas", "ne marche pas", "ne fonctionne pas", "fonctionne pas", "marche plus", "plante", "bloque", "erreur");
  if (nTicket) {
    const canal: Intention["canal"] = a(m, "helpdesk", "support", "technique", "bug") ? "support" : "rh";
    if (aPrefixe(m, "repon", "ecri", "envoy", "commente", "relanc", "complet") || a(m, "ajoute un message", "reponds")) return intention("ticket_repondre", canal);
    const creation =
      aPrefixe(m, "ouvr", "cree", "creer", "nouveau", "nouvelle", "lanc", "signal", "soumett", "poser") ||
      (a(m, "un ticket", "une demande") && !aPrefixe(m, "list", "combien", "quel", "mes", "voir", "montr", "affich", "detail"));
    if (creation && !veutLister(m)) return intention("ticket_creer", canal);
    if (aPrefixe(m, "detail", "consult") || (a(m, "voir", "lis") && /\b\d\b/.test(m.norm))) return intention("ticket_voir", canal);
    return intention("ticket_liste", canal);
  }
  const mentionneProbleme = aPrefixe(m, "probleme", "souci", "difficulte", "dysfonction") || a(m, "signaler", "signale", "anomalie");
  const premierePersonne = a(m, "j ai", "on a", "nous avons", "il y a", "signaler", "signale", "rencontre", "je rencontre", "j rencontre");
  const termesTech = a(m, "page", "site", "connexion", "connecter", "appli", "application", "affichage", "mot de passe", "ecran", "bouton", "telecharger", "chargement", "lent", "technique");
  if (nSupport && !estAbsence(m)) {
    const probleme = aPrefixe(m, "bug", "probleme", "souci", "erreur", "anomalie", "plant", "bloqu") || a(m, "ne marche pas", "ne fonctionne pas", "ca ne marche pas", "marche plus", "fonctionne pas", "plante", "bloque");
    if (probleme) return intention("ticket_creer", "support");
    return intention("ticket_liste", "support");
  }
  if (mentionneProbleme && (premierePersonne || n <= 4) && !veutSupprimer(m)) {
    return intention("ticket_creer", termesTech ? "support" : "rh");
  }

  /* 8bis) Échéances de documents (visite médicale, titre de séjour, avenant…) */
  const definition = !motEcheance(m) && !salarie && a(m, "c est quoi", "qu est ce", "definition", "signifie", "differ", "obligatoire");
  if (!definition && (motEcheance(m) || typeEcheanceFort(m))) {
    const ajoutEch = aPrefixe(m, "ajout", "cree", "creer", "enregistr", "saisi", "note", "noter", "programm", "mets", "mettre", "rajout", "rappelle", "declar", "nouvelle", "nouveau", "planifi");
    if (veutSupprimer(m)) return intention("echeance_suppr");
    const demande = estQuestion(m) || a(m, "qui", "combien", "quelles", "quels", "quelle", "quel", "mes", "liste", "toutes");
    const fait = aPrefixe(m, "traite", "realis", "effectu", "termin", "accompli", "cloture") || a(m, "est fait", "est faite", "c est fait", "marque", "marquer", "coche");
    if (!ajoutEch && fait && !(demande && !a(m, "marquer", "marque"))) return intention("echeance_traiter");
    if (veutModifier(m)) return intention("echeance_modif");
    if (ajoutEch) return intention("echeance_ajout");
    if (demande || veutLister(m)) return intention("echeance_info");
    if (detecterTypeEcheance(m) && (salarie || analyserDates(m.brut, env.today.iso).periode)) return intention("echeance_ajout");
    return intention("echeance_info");
  }

  /* 9) Absences */
  const typeVarAvant = detecterTypeVariable(m);
  const motAbsenceFort = aPrefixe(m, "conge", "absen", "maladie", "malade", "arret", "vacance") || a(m, "rtt", "sans solde");
  const nAbsence = (estAbsence(m) && !(typeVarAvant && !motAbsenceFort)) || aPrefixe(m, "absent");
  if (nAbsence) {
    if (veutSupprimer(m)) return intention("absence_suppr");
    if (veutModifier(m)) return intention("absence_modif");
    const ajoutExplicite = aPrefixe(m, "ajout", "cree", "creer", "declar", "enregistr", "saisi", "pose", "poser", "prend", "mets", "mettre", "nouvelle", "nouveau", "rajout");
    if (ajoutExplicite) return intention("absence_ajout");
    const pluriel = m.mots.some((w) => w === "absences" || w === "conges" || w === "arrets" || w === "rtts");
    const periode = analyserDates(m.brut, env.today.iso).periode;
    if (estQuestion(m) || pluriel || veutLister(m)) return intention("absence_info");
    if (a(m, "pour") && !salarie && !periode && !estQuestion(m)) return intention("absence_ajout");
    if (salarie || periode || detecterContrat(m) === null) {
      if (salarie || periode) return intention("absence_ajout");
    }
    return intention("absence_info");
  }

  /* 10) Variables de paie */
  const typeVar = detecterTypeVariable(m);
  const nVariable = typeVar !== null || aPrefixe(m, "variable");
  if (nVariable) {
    if (veutSupprimer(m)) return intention("variable_suppr");
    if (veutModifier(m)) return intention("variable_modif");
    const pluriel = m.mots.some((w) => ["primes", "variables", "acomptes", "frais", "bonus"].includes(w)) || a(m, "heures supp", "heures supplementaires");
    const ajoutExplicite = aPrefixe(m, "ajout", "cree", "creer", "declar", "enregistr", "saisi", "mets", "mettre", "rajout", "verse", "accord", "attribu", "octroi", "nouvelle", "nouveau") || a(m, "donne", "donner", "met");
    if (ajoutExplicite) return intention("variable_ajout");
    const avecMontant = parseNombre(m.brut) !== null;
    if (estQuestion(m) || (veutLister(m) && !avecMontant)) return intention("variable_info");
    // « prime de 200 pour Zoé », « heures supp pour Jean » : une cible (« pour … ») ou un montant = on veut ajouter
    if (avecMontant && (salarie || a(m, "pour"))) return intention("variable_ajout");
    if (a(m, "pour") && (salarie || !pluriel || a(m, "heures supp", "heures supplementaires"))) return intention("variable_ajout");
    if (pluriel && !salarie) return intention("variable_info");
    if (salarie && avecMontant) return intention("variable_ajout");
    return intention("variable_info");
  }

  /* 11) Salariés */
  if (nSalarie || salarie) {
    const champ = detecterChamp(m);
    if (nSalarie && veutAjouter(m)) return intention("salarie_ajout");
    if (veutSupprimer(m)) {
      return nSalarie ? intention("salarie_suppr") : intention("precision_retrait");
    }
    if (salarie && (veutModifier(m) || (champ && !estQuestion(m) && (parseNombre(m.brut) !== null || analyserDates(m.brut, env.today.iso).periode || champ === "dateFin")))) return intention("salarie_modif");
    if (salarie && champ === "dateFin" && !estQuestion(m)) return intention("salarie_modif");
    if (salarie && !nSalarie) return intention("salarie_fiche");
    if (salarie && a(m, "fiche", "info", "infos", "informations", "detail", "details", "coordonnees")) return intention("salarie_fiche");
    if (nSalarie && veutAjouter(m)) return intention("salarie_ajout");
    return intention("salarie_liste");
  }
  if (aPrefixe(m, "embauche") && veutAjouter(m)) return intention("salarie_ajout");

  /* 12) Une thématique seule, juste après une liste d'actualités */
  if (ctx.liste?.type === "actus" && n <= 4 && detecterThematique(m)) return intention("actus_liste");

  /* 12bis) « Qui est en CDD ? » */
  if (detecterContrat(m) && a(m, "qui", "combien", "liste", "quels", "quelles", "montre", "affiche")) return intention("salarie_liste");

  /* 13) Paie (récapitulatif) */
  if (aPrefixe(m, "paie", "bulletin") || a(m, "cout", "couts", "masse salariale")) return intention("paie_recap");

  return intention("inconnu");
}

/** Module à contrôler (permissions) pour chaque intention. */
export function moduleDe(id: IntentionId, canal: Intention["canal"]): ModuleBuddy {
  switch (id) {
    case "salarie_ajout":
    case "salarie_modif":
    case "salarie_suppr":
    case "salarie_fiche":
    case "salarie_liste":
    case "precision_retrait":
    case "echeance_ajout":
    case "echeance_suppr":
    case "echeance_modif":
    case "echeance_traiter":
    case "echeance_info":
      return "salaries";
    case "absence_ajout":
    case "absence_suppr":
    case "absence_modif":
    case "absence_info":
      return "absences";
    case "variable_ajout":
    case "variable_suppr":
    case "variable_modif":
    case "variable_info":
    case "paie_recap":
      return "paie";
    case "ticket_creer":
    case "ticket_liste":
    case "ticket_voir":
    case "ticket_repondre":
      return canal === "support" ? "helpdesk" : "tickets";
    case "recrutement_creer":
    case "recrutement_liste":
      return "tickets";
    case "facturation":
      return "entreprise";
    case "abo_info":
    case "abo_formules":
    case "abo_evolution":
    case "abo_annuler":
      return canal === "paie" ? "paie" : "entreprise";
    default:
      return "libre";
  }
}
