// lib/rgpd.ts
// Droits des personnes (RGPD) et durées de conservation :
// - export de toutes les données d'un salarié (droit d'accès / portabilité) ;
// - anonymisation d'un salarié sorti (identité, coordonnées, n° SS, IBAN, pointages, documents, compte effacés ;
//   les données de paie restent, car elles doivent être conservées 5 ans) ;
// - suppression complète (avec les fichiers stockés chez OVH) ;
// - purge automatique des données dont la durée de conservation est dépassée.

import { prisma } from "@/lib/prisma";
import { supprimerFichierStocke } from "@/lib/stockage";
import { classeurMarque } from "@/lib/excel-marque";
import { CONSERVATION } from "@/lib/legal";

const J = 86400000;
const fr = (d: Date | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "");
const frH = (d: Date | null | undefined) => (d ? new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "");

// Durées de conservation : définies dans lib/legal.ts (affichées sur la page Confidentialité)
export { CONSERVATION };

/** Fichier Excel avec toutes les données d'un salarié (une feuille par type de données) */
export async function exporterDonneesSalarie(salarieId: string): Promise<{ buffer: Buffer; nom: string } | null> {
  const s = await prisma.salarie.findUnique({
    where: { id: salarieId },
    include: {
      entreprise: { select: { nom: true } },
      compte: { select: { email: true, role: true, actif: true, createdAt: true } },
      absences: { orderBy: { dateDebut: "desc" } },
      variablesPaie: { orderBy: [{ annee: "desc" }, { mois: "desc" }] },
      releves: { include: { jours: { orderBy: { date: "asc" } } }, orderBy: [{ annee: "desc" }, { mois: "desc" }] },
      pointages: { orderBy: { at: "desc" }, include: { projet: { select: { nom: true } } } },
      notesFrais: { orderBy: { date: "desc" } },
      rappels: { orderBy: { dateEcheance: "desc" } },
      documents: { select: { nom: true, type: true, dateAjout: true, auteur: true } },
      formations: { orderBy: { date: "desc" } },
      tempsProjets: { include: { projet: { select: { nom: true } } }, orderBy: { jour: "desc" } },
      affectations: { include: { projet: { select: { nom: true } } }, orderBy: { du: "desc" } },
    },
  });
  if (!s) return null;
  const c = await classeurMarque({ entrepriseId: s.entrepriseId, titre: `FRANEO RH · Données personnelles de ${s.prenom} ${s.nom}` });
  const feuille = (nom: string, lignes: unknown[][]) => c.tableau(nom, lignes);
  const champs: [string, unknown][] = [
    ["Entreprise", s.entreprise.nom], ["Matricule", s.matricule], ["Nom", s.nom], ["Prénom", s.prenom], ["E-mail", s.email], ["Téléphone", s.telephone],
    ["Date de naissance", fr(s.dateNaissance)], ["Lieu de naissance", s.lieuNaissance], ["Nationalité", s.nationalite], ["N° de sécurité sociale", s.numeroSecuriteSociale],
    ["Adresse", [s.rue, s.codePostal, s.ville, s.pays].filter(Boolean).join(", ")], ["Poste", s.poste], ["Type de contrat", s.typeContrat],
    ["Date d'entrée", fr(s.dateDebut)], ["Date de sortie", fr(s.dateFin)], ["Heures hebdomadaires", s.heuresHebdomadaires], ["Statut", s.statut],
    ["Convention collective", s.conventionCollective], ["Catégorie", s.categorie], ["Coefficient", s.coefficient], ["Position", s.position],
    ["Établissement", s.etablissement], ["Service", s.service], ["Rôle", s.roleRH], ["Salaire mensuel brut", s.salaireMensuel], ["Salaire annuel brut", s.salaireAnnuel],
    ["Primes", s.primes], ["Avantages", s.avantages], ["IBAN", s.iban], ["Titre de séjour (échéance)", fr(s.titreSejour)], ["Solde de congés", s.soldeConges],
    ["Compte espace salarié", s.compte ? `${s.compte.email} (${s.compte.actif ? "actif" : "coupé"}, créé le ${fr(s.compte.createdAt)})` : "aucun"],
    ["Fiche créée le", frH(s.createdAt)], ["Dernière modification", frH(s.updatedAt)], ["Export réalisé le", frH(new Date())],
  ];
  feuille("Fiche", [["Information", "Valeur"], ...champs.map(([k, v]) => [k, v == null ? "" : String(v)])]);
  feuille("Absences", [["Type", "Du", "Au", "Statut", "Commentaire"], ...s.absences.map((a) => [a.type, fr(a.dateDebut), fr(a.dateFin), a.statut, a.commentaire])]);
  feuille("Variables de paie", [["Type", "Valeur", "Mois", "Année", "Statut", "Commentaire"], ...s.variablesPaie.map((v) => [v.type, v.valeur, v.mois, v.annee, v.statut, v.commentaire])]);
  feuille("Relevés d'heures", [["Mois", "Année", "Statut", "Jour", "Heures", "Heures supp.", "Télétravail", "Commentaire"],
    ...s.releves.flatMap((r) => {
      const jours: ((typeof r.jours)[number] | null)[] = r.jours.length ? r.jours : [null];
      return jours.map((j) => [r.mois, r.annee, r.statut, j ? fr(j.date) : "", j?.heures ?? "", j?.heuresSupp ?? "", j?.teletravail ? "oui" : "", j?.commentaire ?? ""]);
    })]);
  feuille("Pointages", [["Date et heure", "Type", "Adresse", "Projet"], ...s.pointages.map((p) => [frH(p.at), p.type, p.adresse, p.projet?.nom])]);
  feuille("Notes de frais", [["Date", "Montant (€)", "Motif", "Statut"], ...s.notesFrais.map((n) => [fr(n.date), n.montant, n.motif, n.statut])]);
  feuille("Échéances", [["Type", "Libellé", "Échéance", "Traité"], ...s.rappels.map((r) => [r.type, r.libelle, fr(r.dateEcheance), r.traite ? "oui" : "non"])]);
  feuille("Documents", [["Nom", "Type", "Déposé le", "Par"], ...s.documents.map((d) => [d.nom, d.type, fr(d.dateAjout), d.auteur])]);
  feuille("Formations", [["Intitulé", "Date", "Heures", "Coût (€)"], ...s.formations.map((f) => [f.intitule, fr(f.date), f.heures, f.cout])]);
  feuille("Projets", [["Projet", "Type", "Date / période", "Heures"], ...s.affectations.map((a) => [a.projet.nom, "Planning", `${fr(a.du)} → ${fr(a.au)}`, `${a.heuresSemaine} h/semaine`]), ...s.tempsProjets.map((t) => [t.projet.nom, "Temps passé", t.jour.split("-").reverse().join("/"), t.heures])]);
  const buffer = await c.terminer();
  return { buffer, nom: `donnees-${s.prenom}-${s.nom}`.normalize("NFD").replace(/[^\w-]+/g, "-").toLowerCase() };
}

/** Un salarié peut être anonymisé s'il est sorti (date de fin passée ou statut autre qu'« Actif ») */
export function estSorti(s: { statut: string; dateFin: Date | null }) {
  return s.statut !== "Actif" || (!!s.dateFin && s.dateFin < new Date());
}

/** Anonymise un salarié sorti ; les données de paie sont conservées (obligation légale), sans identité */
export async function anonymiserSalarie(salarieId: string): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const s = await prisma.salarie.findUnique({ where: { id: salarieId }, include: { documents: { select: { cle: true } } } });
  if (!s) return { ok: false, erreur: "Salarié introuvable" };
  if (s.anonymiseLe) return { ok: false, erreur: "Salarié déjà anonymisé" };
  if (!estSorti(s)) return { ok: false, erreur: "Seul un salarié sorti de l'entreprise peut être anonymisé." };
  for (const d of s.documents) await supprimerFichierStocke(d.cle);
  await prisma.$transaction([
    prisma.document.deleteMany({ where: { salarieId } }),
    prisma.pointage.deleteMany({ where: { salarieId } }),
    prisma.utilisateur.deleteMany({ where: { salarieId } }),
    prisma.salarie.update({
      where: { id: salarieId },
      data: {
        nom: "ANONYME", prenom: `Salarié ${salarieId.slice(-5).toUpperCase()}`, matricule: null, email: null, telephone: null,
        dateNaissance: null, lieuNaissance: null, nationalite: null, numeroSecuriteSociale: null,
        rue: null, codePostal: null, ville: null, pays: null, iban: null, titreSejour: null, avantages: null, manager: null,
        statut: s.statut === "Actif" ? "Sorti" : s.statut, anonymiseLe: new Date(),
      },
    }),
  ]);
  return { ok: true };
}

/** Suppression complète d'un salarié, y compris ses fichiers stockés chez OVH */
export async function supprimerSalarieComplet(salarieId: string) {
  const docs = await prisma.document.findMany({ where: { salarieId }, select: { cle: true } });
  for (const d of docs) await supprimerFichierStocke(d.cle);
  await prisma.utilisateur.deleteMany({ where: { salarieId } });
  await prisma.salarie.delete({ where: { id: salarieId } });
}

/** Purge quotidienne des données dont la durée de conservation est dépassée */
export async function purgerDonneesExpirees() {
  const avant = (jours: number) => new Date(Date.now() - jours * J);
  const [pointages, audit, tentatives, jetons, buddy, contexte] = await Promise.all([
    prisma.pointage.deleteMany({ where: { at: { lt: avant(CONSERVATION.pointagesJours) } } }),
    prisma.journalAudit.deleteMany({ where: { createdAt: { lt: avant(CONSERVATION.journalAuditJours) } } }),
    prisma.tentativeConnexion.deleteMany({ where: { debut: { lt: avant(CONSERVATION.tentativesJours) } } }),
    prisma.tokenReset.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    prisma.buddyQuestion.deleteMany({ where: { statut: "IGNOREE", createdAt: { lt: avant(CONSERVATION.questionsBuddyIgnoreesJours) } } }),
    prisma.buddyContexte.deleteMany({ where: { updatedAt: { lt: avant(CONSERVATION.contexteBuddyJours) } } }).catch(() => ({ count: 0 })),
  ]);
  return { pointages: pointages.count, audit: audit.count, tentatives: tentatives.count, jetons: jetons.count, buddy: buddy.count, contexte: contexte.count };
}

/** Salariés sortis depuis plus de 5 ans, pas encore anonymisés (à traiter par l'admin) */
export async function salariesAAnonymiser() {
  const limite = new Date(Date.now() - CONSERVATION.anonymisationApresSortieAns * 365 * J);
  return prisma.salarie.findMany({
    where: { anonymiseLe: null, dateFin: { lt: limite }, entreprise: { demo: false } },
    select: { id: true, nom: true, prenom: true, dateFin: true, entreprise: { select: { nom: true } } },
    orderBy: { dateFin: "asc" },
    take: 200,
  });
}
