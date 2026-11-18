import { NextRequest, NextResponse } from "next/server";
import { stripe, verifierWebhook } from "@/lib/stripe";
import { enregistrerMandat, majMandat, signalerIncident } from "@/lib/prelevement";

// Webhook Stripe (à déclarer dans Stripe › Développeurs › Webhooks, URL : https://<votre-app>/api/stripe/webhook)
// Événements : checkout.session.completed, mandate.updated, payment_intent.payment_failed, charge.dispute.created
export async function POST(request: NextRequest) {
  const corps = await request.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!verifierWebhook(corps, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ erreur: "Signature invalide" }, { status: 400 });
  }
  const evt = JSON.parse(corps) as { type: string; data: { object: Record<string, unknown> } };
  const o = evt.data.object;
  try {
    switch (evt.type) {
      case "checkout.session.completed":
        if (o.mode === "setup" && typeof o.id === "string") await enregistrerMandat(o.id);
        break;
      case "mandate.updated":
        await majMandat(o as { status?: string; payment_method?: string });
        break;
      case "payment_intent.payment_failed": {
        const err = o.last_payment_error as { message?: string } | undefined;
        await signalerIncident(o.customer as string, "Prélèvement rejeté", err?.message || "La banque du client a rejeté le prélèvement.", o.amount as number);
        break;
      }
      case "charge.dispute.created": {
        // Le litige ne porte pas le client : on le retrouve par le paiement contesté
        const charge = typeof o.charge === "string" ? await stripe<{ customer: string | null }>(`/charges/${o.charge}`, { methode: "GET" }) : null;
        await signalerIncident(charge?.customer, "Prélèvement contesté", "Le client a demandé à sa banque le remboursement de ce prélèvement.", o.amount as number);
        break;
      }
    }
  } catch (e) {
    console.error("Webhook Stripe :", evt.type, e);
    return NextResponse.json({ erreur: "Traitement impossible" }, { status: 500 }); // Stripe réessaiera
  }
  return NextResponse.json({ recu: true });
}
