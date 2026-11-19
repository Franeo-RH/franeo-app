// lib/buddy/catalogue.ts
// Tout ce que Buddy sait déjà faire (actions exécutées dans l'app), avec des exemples de phrases.
// Sert à la page Admin › Questions Buddy : catalogue, et « relier » une question à une action existante.
// (Fichier sans base de données : utilisable dans le navigateur.)

export type CapaciteBuddy = { id: string; groupe: string; label: string; exemples: string[]; motsCles: string[] };

export const CAPACITES_BUDDY: CapaciteBuddy[] = [
  { id: "absence_ajout", groupe: "🏖️ Absences", label: "Déclarer une absence (congé, maladie, RTT…)", exemples: ["Marie en congé du 03/11 au 07/11", "Jean malade demain"], motsCles: ["absence", "conge", "conges", "maladie", "arret", "rtt", "poser", "declarer", "vacances"] },
  { id: "absence_modif", groupe: "🏖️ Absences", label: "Modifier ou décaler une absence", exemples: ["Décale l'absence de Marie du 10 au 14 novembre"], motsCles: ["decaler", "modifier", "changer", "absence", "conge", "prolonger"] },
  { id: "absence_suppr", groupe: "🏖️ Absences", label: "Supprimer une absence", exemples: ["Supprime l'absence de Marie"], motsCles: ["supprimer", "annuler", "absence", "conge"] },
  { id: "absence_info", groupe: "🏖️ Absences", label: "Voir les absences (salarié, semaine, mois)", exemples: ["Qui est absent cette semaine ?", "Absences de Marie"], motsCles: ["absent", "absents", "absences", "qui", "semaine", "planning", "conges"] },

  { id: "variable_ajout", groupe: "💰 Paie", label: "Saisir une variable de paie (prime, heures supp…)", exemples: ["Prime de 500 € pour Jean", "4 heures supp à Marie"], motsCles: ["prime", "heures", "supplementaires", "variable", "bonus", "acompte", "saisir"] },
  { id: "variable_modif", groupe: "💰 Paie", label: "Modifier une variable de paie", exemples: ["Change la prime de Jean à 600"], motsCles: ["modifier", "changer", "prime", "variable", "montant"] },
  { id: "variable_suppr", groupe: "💰 Paie", label: "Supprimer une variable de paie", exemples: ["Supprime la prime de Jean"], motsCles: ["supprimer", "annuler", "prime", "variable"] },
  { id: "variable_info", groupe: "💰 Paie", label: "Voir les variables du mois", exemples: ["Quelles variables ce mois-ci ?"], motsCles: ["variables", "primes", "mois", "saisies", "voir"] },
  { id: "paie_recap", groupe: "💰 Paie", label: "Récapitulatif de la paie du mois", exemples: ["Où en est la paie ?", "Récap paie de novembre"], motsCles: ["paie", "recap", "recapitulatif", "bulletins", "salaires", "masse", "cloture"] },

  { id: "salarie_ajout", groupe: "👥 Salariés", label: "Ajouter un salarié", exemples: ["Ajoute un salarié Paul Lefèvre comme développeur en CDI"], motsCles: ["ajouter", "embaucher", "nouveau", "salarie", "embauche", "recrue", "arrivee"] },
  { id: "salarie_modif", groupe: "👥 Salariés", label: "Modifier un salarié (salaire, poste, sortie…)", exemples: ["Change le salaire de Jean à 2800", "Marie quitte l'entreprise le 30/11"], motsCles: ["modifier", "changer", "salaire", "poste", "adresse", "quitte", "depart", "demission", "sortie"] },
  { id: "salarie_suppr", groupe: "👥 Salariés", label: "Supprimer un salarié", exemples: ["Supprime le salarié Paul Lefèvre"], motsCles: ["supprimer", "salarie", "effacer"] },
  { id: "salarie_fiche", groupe: "👥 Salariés", label: "Voir la fiche d'un salarié", exemples: ["Fiche de Marie", "Quel est le salaire de Jean ?"], motsCles: ["fiche", "infos", "informations", "salaire", "contrat", "anciennete"] },
  { id: "salarie_liste", groupe: "👥 Salariés", label: "Liste des salariés", exemples: ["Liste de mes salariés", "Combien de salariés ?"], motsCles: ["liste", "salaries", "effectif", "combien", "equipe"] },

  { id: "echeance_ajout", groupe: "⏰ Échéances", label: "Ajouter une échéance (visite médicale, titre de séjour…)", exemples: ["Ajoute une visite médicale pour Marie le 15/12"], motsCles: ["echeance", "visite", "medicale", "titre", "sejour", "rappel", "ajouter", "habilitation"] },
  { id: "echeance_traiter", groupe: "⏰ Échéances", label: "Marquer une échéance comme faite", exemples: ["La visite médicale de Marie est faite"], motsCles: ["faite", "fait", "realisee", "traitee", "echeance", "visite"] },
  { id: "echeance_modif", groupe: "⏰ Échéances", label: "Décaler une échéance", exemples: ["Décale la visite médicale de Marie au 15/01"], motsCles: ["decaler", "reporter", "modifier", "echeance", "visite"] },
  { id: "echeance_suppr", groupe: "⏰ Échéances", label: "Supprimer une échéance", exemples: ["Supprime l'échéance de Marie"], motsCles: ["supprimer", "echeance", "rappel"] },
  { id: "echeance_info", groupe: "⏰ Échéances", label: "Voir les échéances à venir", exemples: ["Quelles sont mes prochaines échéances ?"], motsCles: ["echeances", "prochaines", "venir", "retard", "visites", "fin", "contrat", "periode", "essai"] },

  { id: "ticket_creer", groupe: "🎫 Tickets & recrutement", label: "Ouvrir un ticket RH", exemples: ["Ouvre un ticket pour une rupture conventionnelle"], motsCles: ["ticket", "ouvrir", "demande", "aide", "accompagnement", "rupture", "licenciement", "disciplinaire"] },
  { id: "ticket_liste", groupe: "🎫 Tickets & recrutement", label: "Voir mes tickets", exemples: ["Mes tickets en cours"], motsCles: ["tickets", "mes", "cours", "suivi", "statut"] },
  { id: "recrutement_creer", groupe: "🎫 Tickets & recrutement", label: "Demander un recrutement", exemples: ["Je veux recruter un comptable en CDI"], motsCles: ["recruter", "recrutement", "embaucher", "annonce", "candidat", "poste"] },
  { id: "recrutement_liste", groupe: "🎫 Tickets & recrutement", label: "Suivre mes recrutements", exemples: ["Où en sont mes recrutements ?"], motsCles: ["recrutements", "candidats", "suivi", "annonces"] },

  { id: "facturation", groupe: "🧾 Abonnement & facturation", label: "Facture du mois et historique", exemples: ["Combien je paie ce mois-ci ?", "Ma dernière facture"], motsCles: ["facture", "factures", "payer", "paie", "montant", "cout", "prix", "prelevement", "tarif"] },
  { id: "abo_info", groupe: "🧾 Abonnement & facturation", label: "Mon abonnement actuel", exemples: ["Quelle est ma formule ?"], motsCles: ["abonnement", "formule", "pack", "inclus", "offre"] },
  { id: "abo_formules", groupe: "🧾 Abonnement & facturation", label: "Comparer les formules", exemples: ["Quelles sont les formules ?"], motsCles: ["formules", "offres", "tarifs", "comparer", "difference", "premium", "serenite", "essentiel", "basic"] },
  { id: "abo_evolution", groupe: "🧾 Abonnement & facturation", label: "Changer de formule", exemples: ["Je veux passer à la formule Premium"], motsCles: ["passer", "changer", "formule", "upgrade", "monter", "evoluer"] },
  { id: "abo_annuler", groupe: "🧾 Abonnement & facturation", label: "Résilier / annuler une formule", exemples: ["Je veux résilier mon abonnement"], motsCles: ["resilier", "resiliation", "arreter", "annuler", "abonnement"] },

  { id: "actus_liste", groupe: "📢 Infos", label: "Actualités RH", exemples: ["Quoi de neuf en RH ?", "Les actualités sociales"], motsCles: ["actualites", "actu", "nouveautes", "loi", "smic", "veille", "news"] },
  { id: "projets_info", groupe: "📢 Infos", label: "Projets, planning et rentabilité (option)", exemples: ["Où en sont mes projets ?"], motsCles: ["projet", "projets", "chantier", "planning", "rentabilite", "marge", "temps"] },
  { id: "aide", groupe: "📢 Infos", label: "Ce que Buddy sait faire (aide)", exemples: ["Aide", "Que sais-tu faire ?"], motsCles: ["aide", "sais", "faire", "fonctionne", "utiliser", "buddy"] },
];

export const capacite = (id: string | null | undefined) => CAPACITES_BUDDY.find((c) => c.id === id) ?? null;
export const GROUPES_CAPACITES = [...new Set(CAPACITES_BUDDY.map((c) => c.groupe))];

/** Racine simple d'un mot (pluriels, accents déjà retirés) : « absences » → « absence » */
export const racine = (m: string) => (m.length > 4 ? m.replace(/(es|s|x)$/, "") : m);

/** Ressemblance entre deux listes de mots-clés (0 à 1), sur les racines */
export function ressemblance(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const B = new Set(b.map(racine));
  const communs = new Set(a.map(racine).filter((x) => B.has(x)));
  return communs.size / Math.min(a.length, b.length);
}
