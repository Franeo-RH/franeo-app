// Exports complets côté admin : toutes les colonnes utiles, plusieurs feuilles par fichier.
import { prisma } from "@/lib/prisma";

type Ligne = Record<string, string | number | boolean | null>;
export type Feuille = { nom: string; lignes: Ligne[] };

// Intitulés français des champs (les autres gardent leur nom technique)
const LIBELLES: Record<string, string> = {
  id: "Identifiant", createdAt: "Créé le", updatedAt: "Modifié le", statut: "Statut", nom: "Nom", prenom: "Prénom", email: "Email",
  telephone: "Téléphone", dateNaissance: "Date de naissance", lieuNaissance: "Lieu de naissance", nationalite: "Nationalité",
  numeroSecuriteSociale: "N° sécurité sociale", rue: "Adresse", codePostal: "Code postal", ville: "Ville", pays: "Pays",
  poste: "Poste", typeContrat: "Contrat", dateDebut: "Date de début", dateFin: "Date de fin", heuresHebdomadaires: "Heures / semaine",
  manager: "Manager", conventionCollective: "Convention collective", categorie: "Catégorie", coefficient: "Coefficient",
  salaireMensuel: "Salaire mensuel brut", salaireAnnuel: "Salaire annuel brut", primes: "Primes", avantages: "Avantages",
  titreSejour: "Fin titre de séjour", matricule: "Matricule", siret: "SIRET", siteWeb: "Site web", iban: "IBAN", bic: "BIC", banque: "Banque",
  tauxCharges: "Taux de charges (%)", actif: "Actif", motifSuspension: "Motif suspension", dateSuspension: "Suspendue le",
  ticketsUtilises: "Tickets utilisés (compteur)", permissions: "Modules / droits", type: "Type", valeur: "Valeur", commentaire: "Commentaire",
  mois: "Mois", annee: "Année", dateValidation: "Validée le", libelle: "Libellé", dateEcheance: "Échéance", traite: "Traité", traiteAt: "Traité le",
  titre: "Titre", description: "Description", montant: "Montant (€)", dateLimitePaie: "Date limite de paiement", declareeParSalarie: "Déclarée par le salarié",
  motifRefus: "Motif du refus", quantite: "Quantité", prixUnitaire: "Prix unitaire", total: "Total", salarie: "Salarié", auteur: "Auteur",
  faiteAt: "Réalisée le", code: "Code", resume: "Résumé", traiteAtD: "Traitée le", heures: "Heures", heuresSupp: "Heures supp", envoyeAt: "Envoyé le",
  valideAt: "Validé le", sujet: "Sujet", contenu: "Contenu", cible: "Destinataires", importante: "Importante", totalIndicatif: "Total indicatif",
  montantPropose: "Montant proposé", reponse: "Réponse", typeContrat2: "Contrat", candidat: "Candidat", signatureAt: "Contrat signé le",
  finEssaiAt: "Fin d'essai validée le", termineAt: "Terminé le", facturationAuto: "Facturation automatique", salaireMini: "Salaire mini", salaireMaxi: "Salaire maxi",
  missions: "Missions", profil: "Profil", experience: "Expérience", formation: "Formation", role: "Rôle", luAt: "Lu le", categorieSupport: "Catégorie",
};

const SECRETS = new Set(["motDePasse", "token"]);

function valeur(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
  if (Array.isArray(v)) return v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return v as string | number | boolean;
}

/** Transforme un enregistrement en ligne Excel : champs simples + champs « à plat » des objets liés indiqués */
function aplatir(o: Record<string, unknown>, extra: Record<string, unknown> = {}): Ligne {
  const l: Ligne = {};
  for (const [k, v] of Object.entries(extra)) l[k] = valeur(v);
  for (const [k, v] of Object.entries(o)) {
    if (SECRETS.has(k)) continue;
    if (v !== null && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v)) continue; // relations : ajoutées via extra
    if (Array.isArray(v) && v.length && typeof v[0] === "object") continue;
    l[LIBELLES[k] ?? k] = valeur(v);
  }
  return l;
}

const nomSal = (s?: { prenom: string; nom: string } | null) => (s ? `${s.prenom} ${s.nom}` : "");
const mois = (m: string | null) => (m && /^\d{4}-\d{2}$/.test(m) ? { annee: Number(m.slice(0, 4)), mois: Number(m.slice(5)) } : null);

export const JEUX: Record<string, string> = {
  salaries: "Salariés",
  entreprises: "Entreprises",
  absences: "Absences",
  variables: "Variables de paie",
  echeances: "Échéances",
  releves: "Relevés d'heures",
  tickets: "Tickets RH",
  helpdesk: "Helpdesk",
  recrutements: "Recrutements",
  devis: "Devis",
  questions: "Demandes RH ponctuelles",
  prestations: "Prestations commandées",
  facturations: "Factures",
  demandes: "Demandes salariés",
  communications: "Communications",
  comptes: "Comptes utilisateurs",
  tout: "Sauvegarde complète",
};

export async function feuilles(jeu: string, f: { entrepriseId?: string | null; mois?: string | null }): Promise<Feuille[]> {
  const ent = f.entrepriseId ? { entrepriseId: f.entrepriseId } : {};
  const pasDemo = { entreprise: { demo: false } };
  const m = mois(f.mois ?? null);
  const parMois = m ? { mois: m.mois, annee: m.annee } : {};

  switch (jeu) {
    case "salaries": {
      const rows = await prisma.salarie.findMany({
        where: { ...pasDemo, ...ent }, orderBy: [{ entreprise: { nom: "asc" } }, { nom: "asc" }],
        include: { entreprise: { select: { nom: true } }, compte: { select: { email: true, actif: true } }, _count: { select: { absences: true, variablesPaie: true, rappels: true } } },
      });
      return [{ nom: "Salariés", lignes: rows.map(({ entreprise, compte, _count, ...s }) => aplatir(s, {
        Entreprise: entreprise.nom, "Espace salarié": compte ? (compte.actif ? `actif (${compte.email})` : "coupé") : "aucun",
        "Nb absences": _count.absences, "Nb variables": _count.variablesPaie, "Nb échéances": _count.rappels,
      })) }];
    }
    case "entreprises": {
      const rows = await prisma.entreprise.findMany({
        where: { demo: false, ...(f.entrepriseId ? { id: f.entrepriseId } : {}) }, orderBy: { nom: "asc" },
        include: { abonnement: true, abonnementPaie: true, utilisateurs: { select: { prenom: true, email: true, role: true, actif: true, createdAt: true } }, _count: { select: { salaries: true, tickets: true, absences: true } } },
      });
      return [
        { nom: "Entreprises", lignes: rows.map(({ abonnement, abonnementPaie, utilisateurs, _count, ...e }) => aplatir(e, {
          "Pack RH": abonnement?.nom ?? "aucun", "Prix pack RH": abonnement?.prixMensuel ?? "", "Formule paie": abonnementPaie?.nom ?? "aucune",
          "Prix formule paie": abonnementPaie?.prixMensuel ?? "", "Nb salariés": _count.salaries, "Nb tickets": _count.tickets, "Nb absences": _count.absences,
          "Nb comptes clients": utilisateurs.filter((u) => u.role === "CLIENT").length, "Nb comptes salariés": utilisateurs.filter((u) => u.role === "SALARIE").length,
        })) },
        { nom: "Comptes", lignes: rows.flatMap((e) => e.utilisateurs.map((u) => aplatir(u, { Entreprise: e.nom }))) },
      ];
    }
    case "absences": {
      const rows = await prisma.absence.findMany({
        where: { ...pasDemo, ...ent, ...(m ? { dateDebut: { lte: new Date(m.annee, m.mois, 0, 23, 59) }, dateFin: { gte: new Date(m.annee, m.mois - 1, 1) } } : {}) },
        orderBy: { dateDebut: "desc" }, include: { entreprise: { select: { nom: true } }, salarie: { select: { prenom: true, nom: true, matricule: true } } },
      });
      return [{ nom: "Absences", lignes: rows.map(({ entreprise, salarie, ...a }) => aplatir(a, {
        Entreprise: entreprise.nom, Salarié: nomSal(salarie), Matricule: salarie.matricule ?? "",
        "Jours calendaires": Math.round((a.dateFin.getTime() - a.dateDebut.getTime()) / 86400000) + 1,
      })) }];
    }
    case "variables": {
      const rows = await prisma.variablePaie.findMany({
        where: { ...pasDemo, ...ent, ...parMois }, orderBy: [{ annee: "desc" }, { mois: "desc" }],
        include: { entreprise: { select: { nom: true } }, salarie: { select: { prenom: true, nom: true, matricule: true, salaireMensuel: true } } },
      });
      return [{ nom: "Variables", lignes: rows.map(({ entreprise, salarie, ...v }) => aplatir(v, { Entreprise: entreprise.nom, Salarié: nomSal(salarie), Matricule: salarie.matricule ?? "", "Salaire mensuel": salarie.salaireMensuel ?? "" })) }];
    }
    case "echeances": {
      const rows = await prisma.rappelSalarie.findMany({
        where: { salarie: { entreprise: { demo: false }, ...(f.entrepriseId ? { entrepriseId: f.entrepriseId } : {}) } }, orderBy: { dateEcheance: "asc" },
        include: { salarie: { select: { prenom: true, nom: true, entreprise: { select: { nom: true } } } } },
      });
      return [{ nom: "Échéances", lignes: rows.map(({ salarie, ...r }) => aplatir(r, { Entreprise: salarie.entreprise.nom, Salarié: nomSal(salarie) })) }];
    }
    case "releves": {
      const rows = await prisma.releveMois.findMany({
        where: { ...pasDemo, ...ent, ...parMois }, orderBy: [{ annee: "desc" }, { mois: "desc" }],
        include: { entreprise: { select: { nom: true } }, salarie: { select: { prenom: true, nom: true } }, jours: { orderBy: { date: "asc" } } },
      });
      return [
        { nom: "Relevés", lignes: rows.map(({ entreprise, salarie, jours, ...r }) => aplatir(r, {
          Entreprise: entreprise.nom, Salarié: nomSal(salarie), "Total heures": jours.reduce((a, j) => a + (j.heures ?? 0), 0), "Total heures supp": jours.reduce((a, j) => a + j.heuresSupp, 0), "Jours saisis": jours.length,
        })) },
        { nom: "Détail des jours", lignes: rows.flatMap((r) => r.jours.map(({ releveId: _r, ...j }) => aplatir(j, { Entreprise: r.entreprise.nom, Salarié: nomSal(r.salarie), Relevé: `${r.mois}/${r.annee}` }))) },
      ];
    }
    case "tickets": {
      const rows = await prisma.ticket.findMany({ where: { ...pasDemo, ...ent }, orderBy: { createdAt: "desc" }, include: { entreprise: { select: { nom: true } }, messages: { orderBy: { createdAt: "asc" } } } });
      return [
        { nom: "Tickets", lignes: rows.map(({ entreprise, messages, ...t }) => aplatir(t, { Entreprise: entreprise.nom, "Nb messages": messages.length })) },
        { nom: "Messages", lignes: rows.flatMap((t) => t.messages.map((mm) => aplatir(mm as unknown as Record<string, unknown>, { Entreprise: t.entreprise.nom, Ticket: t.titre }))) },
      ];
    }
    case "helpdesk": {
      const rows = await prisma.ticketSupport.findMany({ where: { ...pasDemo, ...ent }, orderBy: { createdAt: "desc" }, include: { entreprise: { select: { nom: true } } } });
      return [{ nom: "Helpdesk", lignes: rows.map(({ entreprise, ...t }) => aplatir(t as unknown as Record<string, unknown>, { Entreprise: entreprise.nom })) }];
    }
    case "recrutements": {
      const rows = await prisma.demandeRecrutement.findMany({ where: { ...pasDemo, ...ent }, orderBy: { createdAt: "desc" }, include: { entreprise: { select: { nom: true } } } });
      return [{ nom: "Recrutements", lignes: rows.map(({ entreprise, ...r }) => aplatir(r, { Entreprise: entreprise.nom })) }];
    }
    case "devis": {
      const rows = await prisma.devis.findMany({ where: { ...pasDemo, ...ent }, orderBy: { createdAt: "desc" }, include: { entreprise: { select: { nom: true } }, messages: { orderBy: { createdAt: "asc" } } } });
      return [
        { nom: "Devis", lignes: rows.map(({ entreprise, messages, lignes, ...d }) => aplatir(d, { Entreprise: entreprise.nom, Prestations: (lignes as { libelle: string; quantite: number }[]).map((x) => `${x.libelle} ×${x.quantite}`).join(" | "), "Nb messages": messages.length })) },
        { nom: "Échanges", lignes: rows.flatMap((d) => d.messages.map((mm) => aplatir(mm, { Entreprise: d.entreprise.nom, Devis: d.createdAt }))) },
      ];
    }
    case "questions": {
      const rows = await prisma.questionRH.findMany({ where: { ...pasDemo, ...ent }, orderBy: { createdAt: "desc" }, include: { entreprise: { select: { nom: true } }, messages: { orderBy: { createdAt: "asc" } } } });
      return [
        { nom: "Questions", lignes: rows.map(({ entreprise, messages, ...q }) => aplatir(q, { Entreprise: entreprise.nom, "Nb messages": messages.length })) },
        { nom: "Échanges", lignes: rows.flatMap((q) => q.messages.map((mm) => aplatir(mm, { Entreprise: q.entreprise.nom, Sujet: q.sujet }))) },
      ];
    }
    case "prestations": {
      const rows = await prisma.commandePrestation.findMany({ where: { ...pasDemo, ...ent, ...parMois }, orderBy: { createdAt: "desc" }, include: { entreprise: { select: { nom: true } } } });
      return [{ nom: "Prestations", lignes: rows.map(({ entreprise, ...p }) => aplatir(p, { Entreprise: entreprise.nom })) }];
    }
    case "facturations": {
      const rows = await prisma.facturation.findMany({ where: { ...pasDemo, ...ent, ...parMois }, orderBy: [{ annee: "desc" }, { mois: "desc" }], include: { entreprise: { select: { nom: true, siret: true, email: true } } } });
      return [{ nom: "Factures", lignes: rows.map(({ entreprise, ...x }) => aplatir(x, { Entreprise: entreprise.nom, SIRET: entreprise.siret ?? "", "Email client": entreprise.email ?? "" })) }];
    }
    case "demandes": {
      const rows = await prisma.demandeSalarie.findMany({ where: { ...pasDemo, ...ent }, orderBy: { createdAt: "desc" }, include: { entreprise: { select: { nom: true } } } });
      return [{ nom: "Demandes salariés", lignes: rows.map(({ entreprise, ...d }) => aplatir(d, { Entreprise: entreprise.nom })) }];
    }
    case "communications": {
      const rows = await prisma.communication.findMany({ orderBy: { createdAt: "desc" }, include: { entreprise: { select: { nom: true } }, lectures: { include: { utilisateur: { select: { prenom: true, email: true, entreprise: { select: { nom: true } } } } } } } });
      return [
        { nom: "Communications", lignes: rows.map(({ entreprise, lectures, ...c }) => aplatir(c, { Entreprise: entreprise?.nom ?? "Toutes", "Nb lectures": lectures.length })) },
        { nom: "Lectures", lignes: rows.flatMap((c) => c.lectures.map((l) => ({ Communication: c.titre, Personne: l.utilisateur.prenom, Email: l.utilisateur.email, Entreprise: l.utilisateur.entreprise?.nom ?? "", "Lu le": valeur(l.luAt) }))) },
      ];
    }
    case "comptes": {
      const rows = await prisma.utilisateur.findMany({ where: { OR: [{ entreprise: { demo: false } }, { role: "ADMIN" }], ...(f.entrepriseId ? { entrepriseId: f.entrepriseId } : {}) }, orderBy: { createdAt: "desc" }, include: { entreprise: { select: { nom: true } }, salarie: { select: { prenom: true, nom: true } } } });
      return [{ nom: "Comptes", lignes: rows.map(({ entreprise, salarie, ...u }) => aplatir(u, { Entreprise: entreprise?.nom ?? "", "Fiche salarié": nomSal(salarie) })) }];
    }
    case "tout": {
      const tous = await Promise.all(Object.keys(JEUX).filter((j) => j !== "tout").map((j) => feuilles(j, f)));
      return tous.flat();
    }
    default:
      return [];
  }
}
