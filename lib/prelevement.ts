// lib/prelevement.ts
// Prélèvement SEPA mensuel des abonnements FRANEO RH, via Stripe.
// Le client signe son mandat sur la page sécurisée de Stripe (Checkout en mode « setup ») : son IBAN n'est jamais
// enregistré dans Franeo. Chaque mois, FRANEO RH envoie la facture (Abby), puis lance le prélèvement depuis Stripe.

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { notifierAdmin } from "@/lib/notifications";

export { STATUTS_MANDAT, TEXTE_PRELEVEMENT } from "@/lib/prelevement-textes";

const statutDe = (s: string | undefined | null) => (s === "active" ? "ACTIF" : s === "pending" ? "EN_ATTENTE" : s ? "INACTIF" : null);

type Entreprise = { id: string; nom: string; email: string | null; siret: string | null; stripeClientId: string | null };

/** Client Stripe de l'entreprise (créé au premier mandat) */
async function clientStripe(e: Entreprise, emailContact?: string | null): Promise<string> {
  if (e.stripeClientId) return e.stripeClientId;
  const c = await stripe<{ id: string }>("/customers", {
    params: {
      name: e.nom,
      email: e.email || emailContact || undefined,
      preferred_locales: ["fr"],
      metadata: { entrepriseId: e.id, siret: e.siret || "" },
    },
    idempotence: `client-${e.id}`,
  });
  await prisma.entreprise.update({ where: { id: e.id }, data: { stripeClientId: c.id } });
  return c.id;
}

/** Page Stripe de signature du mandat (ou de changement d'IBAN) */
export async function urlSignatureMandat(entrepriseId: string, base: string, emailContact?: string | null): Promise<string> {
  const e = await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { id: true, nom: true, email: true, siret: true, stripeClientId: true } });
  if (!e) throw new Error("Entreprise introuvable");
  const client = await clientStripe(e, emailContact);
  const session = await stripe<{ url: string }>("/checkout/sessions", {
    params: {
      mode: "setup",
      // « Managed Payments » (activé par défaut sur les nouveaux comptes Stripe) n'accepte pas le mode setup
      managed_payments: { enabled: false },
      currency: "eur",
      customer: client,
      payment_method_types: ["sepa_debit"],
      locale: "fr",
      success_url: `${base}/client/entreprise?mandat=ok&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/client/entreprise?mandat=annule`,
      metadata: { entrepriseId: e.id },
      setup_intent_data: { metadata: { entrepriseId: e.id } },
    },
  });
  return session.url;
}

type SessionStripe = {
  id: string;
  customer: string | null;
  metadata?: { entrepriseId?: string };
  setup_intent?: {
    id: string;
    status: string;
    payment_method?: { id: string; sepa_debit?: { last4?: string } } | null;
    mandate?: { status?: string } | null;
  } | null;
};

/** Enregistre le mandat signé (retour de la page Stripe, ou webhook checkout.session.completed) */
export async function enregistrerMandat(sessionId: string, entrepriseAttendue?: string): Promise<boolean> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return false;
  const s = await stripe<SessionStripe>(`/checkout/sessions/${sessionId}`, {
    methode: "GET",
    params: { expand: ["setup_intent.payment_method", "setup_intent.mandate"] },
  });
  const entrepriseId = s.metadata?.entrepriseId;
  if (!entrepriseId || (entrepriseAttendue && entrepriseAttendue !== entrepriseId)) return false;
  const e = await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { id: true, nom: true, stripeClientId: true, mandatStatut: true, mandatIbanFin: true } });
  if (!e || !s.customer || e.stripeClientId !== s.customer) return false;
  const si = s.setup_intent;
  if (!si || si.status !== "succeeded" || !si.payment_method) return false;

  const statut = statutDe(si.mandate?.status) ?? "EN_ATTENTE";
  const ibanFin = si.payment_method.sepa_debit?.last4 ?? null;
  const dejaFait = e.mandatStatut === statut && e.mandatIbanFin === ibanFin;
  // Moyen de paiement par défaut du client : utilisé pour les prélèvements lancés depuis Stripe
  await stripe(`/customers/${s.customer}`, { params: { invoice_settings: { default_payment_method: si.payment_method.id } } });
  await prisma.entreprise.update({ where: { id: e.id }, data: { mandatStatut: statut, mandatIbanFin: ibanFin, mandatSigneAt: new Date() } });
  if (!dejaFait) {
    await notifierAdmin({
      sujet: `Mandat de prélèvement signé — ${e.nom}`,
      titre: "✅ Mandat de prélèvement signé",
      lignes: [`${e.nom} a signé son mandat SEPA${ibanFin ? ` (IBAN se terminant par ${ibanFin})` : ""}.`, "Les prochains abonnements pourront être prélevés depuis Stripe."],
      lien: `/admin/entreprises/${e.id}`,
      entrepriseId: e.id,
    });
  }
  return true;
}

/** Mandat modifié (révoqué par le client ou sa banque, validé…) : webhook mandate.updated */
export async function majMandat(mandat: { status?: string; payment_method?: string | { id: string } }) {
  const pmId = typeof mandat.payment_method === "string" ? mandat.payment_method : mandat.payment_method?.id;
  if (!pmId) return;
  const pm = await stripe<{ customer: string | null }>(`/payment_methods/${pmId}`, { methode: "GET" });
  if (!pm.customer) return;
  const e = await prisma.entreprise.findUnique({ where: { stripeClientId: pm.customer }, select: { id: true, nom: true, mandatStatut: true } });
  const statut = statutDe(mandat.status);
  if (!e || !statut || e.mandatStatut === statut) return;
  await prisma.entreprise.update({ where: { id: e.id }, data: { mandatStatut: statut } });
  if (statut === "INACTIF") {
    await notifierAdmin({
      sujet: `Mandat de prélèvement inactif — ${e.nom}`,
      titre: "⚠️ Mandat de prélèvement révoqué",
      lignes: [`Le mandat SEPA de ${e.nom} n'est plus actif (révoqué par le client ou par sa banque).`, "Demandez-lui de signer un nouveau mandat dans Mon entreprise."],
      lien: `/admin/entreprises/${e.id}`,
      entrepriseId: e.id,
    });
  }
}

/** Prélèvement rejeté ou contesté : on prévient FRANEO RH */
export async function signalerIncident(customer: string | null | undefined, titre: string, detail: string, montantCentimes?: number) {
  if (!customer) return;
  const e = await prisma.entreprise.findUnique({ where: { stripeClientId: customer }, select: { id: true, nom: true } });
  if (!e) return;
  const montant = montantCentimes != null ? ` de ${(montantCentimes / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €` : "";
  await notifierAdmin({
    sujet: `${titre} — ${e.nom}`,
    titre: `⚠️ ${titre}`,
    lignes: [`${e.nom} : prélèvement${montant}.`, detail],
    lien: `/admin/entreprises/${e.id}`,
    entrepriseId: e.id,
  });
}
