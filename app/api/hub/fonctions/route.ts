import { NextRequest, NextResponse } from "next/server";
import { appelDuPortail } from "@/lib/hub";
import { ACTIONS, EXPORTS } from "@/lib/hub-interne";

export const dynamic = "force-dynamic";

const L = (href: string, label: string, description: string) => ({ href, label, description });

/** Toutes les fonctions de l'admin Franeo RH (ouvertes depuis le portail sans se reconnecter), extractions et actions */
const MENU = [
  { groupe: "📊 Pilotage", liens: [
    L("/admin/dashboard", "Tableau de bord", "Chiffres clés, factures, activité"),
    L("/admin/entreprises/pilotage", "Pilotage", "Revenu récurrent, marges brute et nette, croissance"),
    L("/admin/indicateurs", "Indicateurs RH", "Effectifs, absentéisme, turnover de tous les clients"),
    L("/admin/releves", "Relevés d'heures", "Relevés de tous les clients"),
  ] },
  { groupe: "🏢 Entreprises", liens: [
    L("/admin/entreprises", "Liste des entreprises", "Fiches clients : infos, salariés, facturation, remises, journal"),
    L("/admin/entreprises/nouveau", "Ajouter une entreprise", "Créer un client à la main"),
    L("/admin/entreprises/nouveaux-clients", "Nouveaux clients", "Demandes d'inscription à valider"),
    L("/admin/entreprises/cabinets", "Cabinets comptables", "Cabinets partenaires et leurs clients"),
  ] },
  { groupe: "💳 Abonnements & facturation", liens: [
    L("/admin/entreprises/demandes", "Abonnements", "Changements de formule demandés"),
    L("/admin/abonnement-paie", "Formules paie", "Tarifs et contenus des formules paie"),
    L("/admin/abonnements-rh", "Packs RH", "Tarifs et contenus des packs RH"),
    L("/admin/entreprises/facturation", "Facturation", "Factures du mois, génération, statuts"),
    L("/admin/entreprises/impayes", "Impayés & relances", "Factures en retard, relances automatiques"),
    L("/admin/entreprises/prestations", "Prestations supplémentaires", "Prestations commandées à faire et facturer"),
    L("/admin/entreprises/remises", "Remises & parrainage", "Codes promo, parrainages, remises du mois"),
    L("/admin/entreprises/commissions", "Commissions à reverser", "Part du CA due aux apporteurs"),
    L("/admin/entreprises/tickets", "Facturation tickets", "Tickets RH au-delà du quota"),
  ] },
  { groupe: "📬 Demandes des clients", liens: [
    L("/admin/entreprises/devis", "Demandes de devis", "Devis à chiffrer"),
    L("/admin/entreprises/demandes-services", "Apps, options & formations", "Demandes de services, livrets d'accueil"),
    L("/admin/tickets", "Tickets RH", "Tous les tickets RH"),
    L("/admin/tickets/questions", "Demandes RH ponctuelles", "Questions RH des clients"),
    L("/admin/recrutement", "Recrutement", "Demandes de recrutement"),
    L("/admin/helpdesk", "Helpdesk", "Assistance technique"),
  ] },
  { groupe: "👥 Salariés & documentaire", liens: [
    L("/admin/salaries", "Tous les salariés", "Salariés de tous les clients"),
    L("/admin/salaries/nouveau", "Ajouter un salarié", "Créer une fiche salarié"),
    L("/admin/salaries/import", "Importer des salariés", "Import Excel"),
    L("/admin/documentaire", "Vue d'ensemble documentaire", "Dossiers, documents, échéances"),
    L("/admin/salaries/mouvements", "Mouvements", "Entrées et sorties"),
    L("/admin/salaries/echeances", "Échéances", "Fins de période d'essai, CDD, visites médicales"),
    L("/admin/salaries/absences", "Absences", "Absences de tous les clients"),
    L("/admin/salaries/demandes", "Demandes des salariés", "Congés, attestations…"),
    L("/admin/salaries/accidents", "Accidents du travail", "Déclarations et suivi"),
    L("/admin/salaries/acces", "Accès des salariés", "Comptes de l'espace salarié"),
    L("/admin/salaries/pointages", "Journal des pointages", "Badgeuse"),
    L("/admin/salaries/rgpd", "Journal d'activité & RGPD", "Connexions, exports, anonymisations"),
  ] },
  { groupe: "📝 Modèles", liens: [
    L("/admin/documentaire/modeles", "Modèles de contrats", "Trames de contrats FRANEO"),
    L("/admin/documentaire/entretiens", "Modèles d'entretien", "Rubriques des comptes rendus"),
    L("/admin/salaries/courriers", "Modèles de courriers", "Courriers RH"),
    L("/admin/salaries/contrats", "Contrats générés", "Contrats produits par les clients"),
  ] },
  { groupe: "💰 Paie", liens: [
    L("/admin/paie", "Tableau de bord paie", "Avancement de la paie du mois"),
    L("/admin/paie/variables", "Variables", "Heures supp., primes, frais, acomptes"),
    L("/admin/paie/releves", "Relevés d'heures", "Relevés à intégrer"),
    L("/admin/paie/absences", "Absences", "Absences du mois pour la paie"),
    L("/admin/paie/bulletins", "Bulletins de paie", "Dépôt des bulletins aux salariés"),
    L("/admin/paie/historique", "Historique", "Paies passées"),
    L("/admin/paie/clotures", "Clôtures & journal", "Clôture mensuelle"),
    L("/admin/paie/demandes", "Demandes de modification", "Corrections demandées par les clients"),
  ] },
  { groupe: "📢 Communication", liens: [
    L("/admin/communication", "Communications", "Messages dans l'espace client"),
    L("/admin/actualites", "Actualité RH", "Articles"),
    L("/admin/faq", "FAQ", "Questions fréquentes"),
    L("/admin/communication/buddy", "Buddy", "Questions et réponses de l'assistant"),
    L("/admin/communication/emails", "Modèles d'e-mails", "E-mails aux clients"),
    L("/admin/communication/maintenance", "Maintenance & mises à jour", "Bloquer, annoncer"),
  ] },
];

export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  return NextResponse.json({ menu: MENU, exports: EXPORTS, actions: Object.keys(ACTIONS) });
}
