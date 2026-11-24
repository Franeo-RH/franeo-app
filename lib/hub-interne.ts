// lib/hub-interne.ts
// Le portail admin FRANEO réutilise les fonctions existantes de l'admin (exports, modifications) :
// l'app appelle sa propre route admin avec une session ADMIN de 5 minutes, celle du compte qui a le même e-mail
// que l'admin du portail. Seuls les chemins listés ici sont accessibles.

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { creerJeton, NOM_COOKIE } from "@/lib/jeton-session";

export async function compteAdmin(email: string | null) {
  const parEmail = email ? await prisma.utilisateur.findFirst({ where: { role: "ADMIN", email: { equals: email, mode: "insensitive" } } }) : null;
  return parEmail ?? prisma.utilisateur.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
}

export async function appelInterne(request: NextRequest, email: string | null, chemin: string, init: { methode?: string; corps?: unknown } = {}) {
  const u = await compteAdmin(email);
  if (!u) return new Response(JSON.stringify({ erreur: "Aucun compte ADMIN dans l'app." }), { status: 400, headers: { "Content-Type": "application/json" } });
  const base = (process.env.HUB_URL_INTERNE || request.nextUrl.origin).replace(/\/$/, "");
  return fetch(`${base}${chemin}`, {
    method: init.methode ?? "GET",
    headers: { Cookie: `${NOM_COOKIE}=${creerJeton(u.id, u.motDePasse, 300)}`, "Content-Type": "application/json" },
    body: init.corps !== undefined ? JSON.stringify(init.corps) : undefined,
    cache: "no-store",
    redirect: "manual",
  });
}

const sur = (v: unknown) => /^[\w-]{1,60}$/.test(String(v ?? "")) ? String(v) : "";
const moisAnnee = (m: string | null) => (m && /^\d{4}-\d{2}$/.test(m) ? { a: m.slice(0, 4), m: String(Number(m.slice(5))) } : null);

/** Extractions disponibles (affichées dans le portail, rubrique Extractions) */
export const EXPORTS: { id: string; label: string; groupe: string; params: ("mois" | "entreprise")[]; description?: string }[] = [
  { id: "facturation-mois", label: "Facturation du mois (détail par client)", groupe: "Clients & facturation", params: ["mois"] },
  { id: "complet:facturations", label: "Factures", groupe: "Clients & facturation", params: ["mois", "entreprise"] },
  { id: "complet:prestations", label: "Prestations commandées", groupe: "Clients & facturation", params: ["mois", "entreprise"] },
  { id: "complet:devis", label: "Devis", groupe: "Clients & facturation", params: ["entreprise"] },
  { id: "entreprises", label: "Liste des entreprises", groupe: "Clients & facturation", params: [] },
  { id: "complet:entreprises", label: "Entreprises (fiches complètes)", groupe: "Clients & facturation", params: [] },
  { id: "complet:comptes", label: "Comptes utilisateurs", groupe: "Clients & facturation", params: ["entreprise"] },
  { id: "tickets-facturation", label: "Tickets du mois à facturer", groupe: "Clients & facturation", params: [] },
  { id: "paie", label: "Éléments de paie (variables + absences)", groupe: "Paie", params: ["mois", "entreprise"] },
  { id: "variables", label: "Variables de paie", groupe: "Paie", params: ["mois", "entreprise"] },
  { id: "absences", label: "Absences", groupe: "Paie", params: ["mois", "entreprise"] },
  { id: "complet:releves", label: "Relevés d'heures", groupe: "Paie", params: ["mois", "entreprise"] },
  { id: "salaries-admin", label: "Salariés", groupe: "RH", params: ["entreprise"] },
  { id: "complet:salaries", label: "Salariés (fiches complètes)", groupe: "RH", params: ["entreprise"] },
  { id: "complet:echeances", label: "Échéances (fin de période d'essai, CDD, visites…)", groupe: "RH", params: ["entreprise"] },
  { id: "complet:demandes", label: "Demandes des salariés", groupe: "RH", params: ["mois", "entreprise"] },
  { id: "complet:recrutements", label: "Recrutements", groupe: "RH", params: ["entreprise"] },
  { id: "complet:tickets", label: "Tickets RH", groupe: "Support & communication", params: ["mois", "entreprise"] },
  { id: "complet:questions", label: "Demandes RH ponctuelles", groupe: "Support & communication", params: ["mois", "entreprise"] },
  { id: "complet:helpdesk", label: "Helpdesk", groupe: "Support & communication", params: ["mois", "entreprise"] },
  { id: "complet:communications", label: "Communications", groupe: "Support & communication", params: [] },
  { id: "complet:tout", label: "Sauvegarde complète (tous les onglets)", groupe: "Sauvegarde", params: ["entreprise"], description: "Toutes les données, un onglet par thème. Avec un client choisi : son dossier complet." },
];

/** Chemin de la route d'export existante pour une extraction du portail */
export function cheminExport(id: string, p: { mois: string | null; entreprise: string | null }): string | null {
  const def = EXPORTS.find((e) => e.id === id);
  if (!def) return null;
  const ent = sur(p.entreprise), m = moisAnnee(p.mois);
  if (id.startsWith("complet:")) {
    const q = new URLSearchParams({ jeu: id.slice(8) });
    if (ent && def.params.includes("entreprise")) q.set("entrepriseId", ent);
    if (p.mois && m && def.params.includes("mois")) q.set("mois", p.mois);
    return `/api/admin/export?${q}`;
  }
  const q = new URLSearchParams({ type: id });
  if (id === "facturation-mois") { const d = m ?? { a: String(new Date().getFullYear()), m: String(new Date().getMonth() + 1) }; q.set("mois", d.m); q.set("annee", d.a); }
  if (["paie", "variables", "absences"].includes(id)) {
    if (m) { q.set("moisDebut", m.m); q.set("anneeDebut", m.a); q.set("moisFin", m.m); q.set("anneeFin", m.a); }
    if (ent) q.set("entrepriseId", ent);
  }
  if (id === "salaries-admin" && ent) q.set("entreprise", ent);
  return `/api/export?${q}`;
}

/** Modifications possibles depuis le portail : nom → route admin existante */
export const ACTIONS: Record<string, (p: Record<string, unknown>) => { chemin: string; methode: string; corps?: unknown } | null> = {
  "client.statut": (p) => (sur(p.entrepriseId) && typeof p.actif === "boolean" ? { chemin: `/api/entreprises/${sur(p.entrepriseId)}/statut`, methode: "PUT", corps: { actif: p.actif, motif: typeof p.motif === "string" ? p.motif.slice(0, 300) : undefined } } : null),
  "facture.statut": (p) => (sur(p.id) && ["Payé", "En attente"].includes(String(p.statut)) ? { chemin: `/api/facturation/${sur(p.id)}`, methode: "PUT", corps: { statut: p.statut } } : null),
  "facture.relancer": (p) => (sur(p.id) ? { chemin: "/api/admin/relances", methode: "POST", corps: { facturationId: sur(p.id) } } : null),
  "inscription.refuser": (p) => (sur(p.id) ? { chemin: `/api/inscriptions/${sur(p.id)}`, methode: "PUT", corps: { action: "refuser" } } : null),
  "prestation.statut": (p) => (sur(p.id) && ["A_FAIRE", "FAITE", "ANNULEE"].includes(String(p.statut)) ? { chemin: `/api/prestations/${sur(p.id)}`, methode: "PATCH", corps: { statut: p.statut } } : null),
  "bilan.envoyer": (p) => (sur(p.entrepriseId) ? { chemin: "/api/admin/bilan-mensuel", methode: "POST", corps: { entrepriseId: sur(p.entrepriseId) } } : null),
  // Création d'un client depuis le formulaire commun du portail (le choix de la formule se fait ensuite dans la fiche)
  "client.creer": (p) => {
    const t = (v: unknown, n = 200) => (typeof v === "string" ? v.trim().slice(0, n) : "");
    if (!t(p.nom) || !t(p.emailContact)) return null;
    return { chemin: "/api/entreprises", methode: "POST", corps: {
      nom: t(p.nom, 120), siret: t(p.siret, 20), email: t(p.email), telephone: t(p.telephone, 30), siteWeb: "",
      rue: t(p.rue), codePostal: t(p.codePostal, 10), ville: t(p.ville, 80), pays: "France", abonnementId: t(p.abonnementId, 40),
      banque: "", iban: "", bic: "", prenomClient: t(p.prenomContact, 60), emailClient: t(p.emailContact),
    } };
  },
  "remise.ajouter": (p) => (sur(p.entrepriseId) ? { chemin: `/api/entreprises/${sur(p.entrepriseId)}/remises`, methode: "POST", corps: { libelle: p.libelle, type: p.type, valeur: p.valeur, portee: p.portee, debut: p.debut, nbMois: p.nbMois } } : null),
};
