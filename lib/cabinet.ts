// lib/cabinet.ts
// Accès CABINET (expert-comptable partenaire) : un seul accès pour plusieurs entreprises clientes.
// - le cabinet ouvre le dossier d'un client et y travaille avec les droits de son profil (lib/session.ts) ;
// - le gérant gère ses collaborateurs : clients autorisés et profil de droits ;
// - FRANEO RH paramètre un tarif sur mesure (forfait, prix par dossier, remise sur les abonnements des clients).

import { prisma } from "@/lib/prisma";
import { getSessionBrute } from "@/lib/session";
import { PROFILS_DROITS } from "@/lib/droits";
import { envoyerActivation, motDePasseProvisoire, emailPropre, emailValide } from "@/lib/invitation";
import type { NextRequest } from "next/server";

/** Compte cabinet connecté (portefeuille ou dossier client ouvert), actif et cabinet actif */
export async function getSessionCabinet() {
  const session = await getSessionBrute();
  if (!session?.modeCabinet || session.actif === false || session.cabinet?.actif === false) return null;
  return session as typeof session & { modeCabinet: NonNullable<typeof session.modeCabinet> };
}

/** Filtre Prisma des entreprises que ce compte cabinet peut ouvrir */
export function filtreClients(mode: { cabinetId: string; clients: string[] }) {
  return { cabinetId: mode.cabinetId, ...(mode.clients.length ? { id: { in: mode.clients } } : {}) };
}

export const euros = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

/** Tarif sur mesure du cabinet : forfait + prix par dossier client actif */
export function tarifCabinet(c: { tarifForfait: number | null; tarifParClient: number | null; tarifRemise: number | null }, nbClients: number) {
  const forfait = c.tarifForfait ?? 0;
  const parClient = c.tarifParClient ?? 0;
  return { forfait, parClient, remise: c.tarifRemise ?? 0, total: Math.round((forfait + parClient * nbClients) * 100) / 100, defini: c.tarifForfait != null || c.tarifParClient != null || c.tarifRemise != null };
}

export type LigneClient = {
  id: string; nom: string; ville: string | null; actif: boolean; demo: boolean; formule: string;
  salaries: number; absences: number; variables: number; demandes: number; tickets: number; echeances: number; cloture: string | null;
};

/** Portefeuille : chiffres clés de chaque client (une requête groupée par indicateur) */
export async function portefeuille(mode: { cabinetId: string; clients: string[] }): Promise<LigneClient[]> {
  const entreprises = await prisma.entreprise.findMany({
    where: filtreClients(mode),
    select: { id: true, nom: true, ville: true, actif: true, demo: true, abonnement: { select: { nom: true } }, abonnementPaie: { select: { nom: true } } },
    orderBy: { nom: "asc" },
  });
  const ids = entreprises.map((e) => e.id);
  if (!ids.length) return [];
  const maintenant = new Date();
  const mois = maintenant.getMonth() + 1, annee = maintenant.getFullYear();
  const dans30 = new Date(maintenant.getTime() + 30 * 86400000);
  const [salaries, absences, variables, demandes, tickets, echeances, clotures] = await Promise.all([
    prisma.salarie.groupBy({ by: ["entrepriseId"], where: { entrepriseId: { in: ids }, statut: "Actif", OR: [{ dateFin: null }, { dateFin: { gte: maintenant } }] }, _count: { _all: true } }),
    prisma.absence.groupBy({ by: ["entrepriseId"], where: { entrepriseId: { in: ids }, statut: "En attente" }, _count: { _all: true } }),
    prisma.variablePaie.groupBy({ by: ["entrepriseId"], where: { entrepriseId: { in: ids }, mois, annee, statut: "En attente" }, _count: { _all: true } }),
    prisma.demandeSalarie.groupBy({ by: ["entrepriseId"], where: { entrepriseId: { in: ids }, statut: "EN_ATTENTE" }, _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ["entrepriseId"], where: { entrepriseId: { in: ids }, statut: { not: "Clôturé" } }, _count: { _all: true } }),
    prisma.rappelSalarie.findMany({ where: { traite: false, dateEcheance: { lte: dans30 }, salarie: { entrepriseId: { in: ids }, statut: "Actif" } }, select: { salarie: { select: { entrepriseId: true } } } }),
    prisma.clotureMois.findMany({ where: { entrepriseId: { in: ids }, mois, annee }, select: { entrepriseId: true, statut: true } }),
  ]);
  const compte = (g: { entrepriseId: string; _count: { _all: number } }[]) => new Map(g.map((x) => [x.entrepriseId, x._count._all]));
  const [mS, mA, mV, mD, mT] = [compte(salaries), compte(absences), compte(variables), compte(demandes), compte(tickets)];
  const mE = new Map<string, number>();
  for (const r of echeances) mE.set(r.salarie.entrepriseId, (mE.get(r.salarie.entrepriseId) ?? 0) + 1);
  const mC = new Map(clotures.map((c) => [c.entrepriseId, c.statut]));
  return entreprises.map((e) => ({
    id: e.id, nom: e.nom, ville: e.ville, actif: e.actif, demo: e.demo,
    formule: [e.abonnement?.nom, e.abonnementPaie ? `Paie ${e.abonnementPaie.nom}` : null].filter(Boolean).join(" + ") || "Sans formule",
    salaries: mS.get(e.id) ?? 0, absences: mA.get(e.id) ?? 0, variables: mV.get(e.id) ?? 0, demandes: mD.get(e.id) ?? 0,
    tickets: mT.get(e.id) ?? 0, echeances: mE.get(e.id) ?? 0, cloture: mC.get(e.id) ?? null,
  }));
}

export const destinationValide = (v: unknown) => (typeof v === "string" && /^\/client(\/[a-z0-9\-/]*)?$/.test(v) ? v : "/client/dashboard");

/** Crée (ou rattache) un collaborateur de cabinet et lui envoie son e-mail d'activation */
export async function creerCollaborateur(
  request: NextRequest | null,
  cabinetId: string,
  d: { prenom?: unknown; email?: unknown; profil?: unknown; clients?: unknown; gerant?: unknown },
): Promise<{ ok: true; id: string; mailEnvoye: boolean; lien: string | null } | { ok: false; erreur: string; statut: number }> {
  const cabinet = await prisma.cabinet.findUnique({ where: { id: cabinetId }, select: { id: true, nom: true, demo: true } });
  if (!cabinet) return { ok: false, erreur: "Cabinet introuvable", statut: 404 };
  if (cabinet.demo) return { ok: false, erreur: "Indisponible dans la démo.", statut: 403 };
  const email = emailPropre(d.email);
  const prenom = typeof d.prenom === "string" ? d.prenom.trim().slice(0, 80) : "";
  if (!prenom || !emailValide(email)) return { ok: false, erreur: "Prénom et e-mail valide obligatoires.", statut: 400 };
  if (await prisma.utilisateur.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } })) {
    return { ok: false, erreur: "Cet e-mail est déjà utilisé par un compte Franeo.", statut: 409 };
  }
  const droits = await droitsCollaborateur(cabinetId, d);
  const u = await prisma.utilisateur.create({
    data: { email, prenom, role: "CABINET", cabinetId, motDePasse: await motDePasseProvisoire(), ...droits },
  });
  const r = await envoyerActivation(request, { email, prenom, cabinet: cabinet.nom });
  return { ok: true, id: u.id, ...r };
}

/** Profil de droits, clients autorisés (limités aux clients du cabinet) et rôle de gérant */
export async function droitsCollaborateur(cabinetId: string, d: { profil?: unknown; clients?: unknown; gerant?: unknown }) {
  const profil = PROFILS_DROITS.find((p) => p.id === d.profil) ?? PROFILS_DROITS[0];
  const demandes = Array.isArray(d.clients) ? d.clients.filter((x): x is string => typeof x === "string").slice(0, 500) : [];
  const valides = demandes.length
    ? (await prisma.entreprise.findMany({ where: { cabinetId, id: { in: demandes } }, select: { id: true } })).map((e) => e.id)
    : [];
  // Clients choisis mais aucun valide : aucun accès (une liste vide voudrait dire « tous les clients »)
  const clientsCabinet = demandes.length && !valides.length ? ["aucun"] : valides;
  return { profilCabinet: profil.id, permissionsRetirees: [...profil.retirer], clientsCabinet, cabinetGerant: d.gerant === true };
}

/** Collaborateurs d'un cabinet ; « active » : a déjà choisi son mot de passe et s'est connecté */
export async function collaborateursDe(cabinetId: string) {
  const comptes = await prisma.utilisateur.findMany({
    where: { cabinetId, role: "CABINET" },
    select: { id: true, prenom: true, email: true, actif: true, cabinetGerant: true, profilCabinet: true, clientsCabinet: true },
    orderBy: [{ cabinetGerant: "desc" }, { prenom: "asc" }],
  });
  const connectes = new Set(
    (await prisma.journalAudit.findMany({ where: { utilisateurId: { in: comptes.map((c) => c.id) }, action: { in: ["LOGIN", "MDP_RESET"] } }, select: { utilisateurId: true }, distinct: ["utilisateurId"] }))
      .map((j) => j.utilisateurId),
  );
  return comptes.map((c) => ({ id: c.id, prenom: c.prenom, email: c.email, actif: c.actif, gerant: c.cabinetGerant, profil: c.profilCabinet, clients: c.clientsCabinet, active: connectes.has(c.id) }));
}
