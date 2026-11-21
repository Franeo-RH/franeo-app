// lib/relances.ts
// Relances automatiques des factures impayées : J+3, J+10 et J+20 après la date limite de paiement (3 relances au plus),
// puis FRANEO RH est prévenu. Lancées chaque nuit par la tâche planifiée (app/api/cron/reset-demo).

import { prisma } from "@/lib/prisma";
import { envoyerMail, notifierAdmin } from "@/lib/notifications";
import { MOIS_FR } from "@/lib/bulletins";

export const PALIERS_RELANCE = [3, 10, 20];
const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** Envoie une relance pour une facture (automatique ou depuis l'admin) */
export async function relancerFacture(id: string, manuelle = false): Promise<{ ok: boolean; erreur?: string }> {
  const f = await prisma.facturation.findUnique({ where: { id }, include: { entreprise: { select: { id: true, nom: true, demo: true } } } });
  if (!f) return { ok: false, erreur: "Facture introuvable" };
  if (f.statut === "Payé") return { ok: false, erreur: "Cette facture est déjà payée." };
  if (f.entreprise.demo) return { ok: false, erreur: "Indisponible pour la démo." };
  const comptes = await prisma.utilisateur.findMany({ where: { entrepriseId: f.entrepriseId, role: "CLIENT", actif: true, etablissementId: null }, select: { email: true } });
  if (!comptes.length) return { ok: false, erreur: "Aucun compte dirigeant à prévenir." };
  const n = f.relances + 1;
  const envoye = await envoyerMail({
    a: comptes.map((c) => c.email),
    sujet: `${n >= 3 ? "Dernière relance" : n === 2 ? "Deuxième relance" : "Rappel"} : facture FRANEO RH de ${MOIS_FR[f.mois - 1]} ${f.annee}`,
    titre: n >= 3 ? "⚠️ Facture toujours en attente" : "🧾 Rappel de paiement",
    lignes: [
      `Bonjour,`,
      `Sauf erreur de notre part, la facture de ${MOIS_FR[f.mois - 1]} ${f.annee} (${eur(f.montant)}) n'est pas encore réglée${f.dateLimitePaie ? ` : la date limite était le ${f.dateLimitePaie.toLocaleDateString("fr-FR")}` : ""}.`,
      "Si le prélèvement ou le virement est déjà parti, merci de ne pas tenir compte de ce message.",
      n >= 3 ? "Sans règlement de votre part, l'accès à l'application pourra être suspendu. Contactez-nous en cas de difficulté." : "Une question sur cette facture ? Répondez simplement à cet e-mail.",
    ],
    lien: "/client/entreprise/facturation",
    bouton: "Voir mes factures",
  });
  if (!envoye) return { ok: false, erreur: "L'e-mail n'a pas pu partir." };
  await prisma.facturation.update({ where: { id }, data: { relances: n, derniereRelance: new Date() } });
  if (n >= 3 && !manuelle) {
    await notifierAdmin({ sujet: `Impayé : ${f.entreprise.nom}`, titre: "⚠️ Facture impayée après 3 relances", lignes: [`${f.entreprise.nom} : ${MOIS_FR[f.mois - 1]} ${f.annee}, ${eur(f.montant)}.`, "Pensez à l'appeler, ou à suspendre l'accès si besoin."], lien: `/admin/entreprises/${f.entrepriseId}?onglet=facturation`, entrepriseId: f.entrepriseId });
  }
  return { ok: true };
}

/** Relances automatiques du jour */
export async function relancesAutomatiques() {
  const factures = await prisma.facturation.findMany({
    where: { statut: { not: "Payé" }, dateLimitePaie: { not: null, lt: new Date() }, relances: { lt: PALIERS_RELANCE.length }, entreprise: { demo: false, actif: true } },
    select: { id: true, dateLimitePaie: true, relances: true, derniereRelance: true },
  });
  let envoyees = 0;
  for (const f of factures) {
    const retard = Math.floor((Date.now() - f.dateLimitePaie!.getTime()) / 86400000);
    if (retard < PALIERS_RELANCE[f.relances]) continue;
    if (f.derniereRelance && Date.now() - f.derniereRelance.getTime() < 3 * 86400000) continue;
    if ((await relancerFacture(f.id)).ok) envoyees++;
  }
  return envoyees;
}
