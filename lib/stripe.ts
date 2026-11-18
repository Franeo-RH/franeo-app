// lib/stripe.ts
// Appels à l'API Stripe sans dépendance (fetch) + vérification de la signature des webhooks.
// Variables d'environnement : STRIPE_SECRET_KEY (sk_live_… ou sk_test_…), STRIPE_WEBHOOK_SECRET (whsec_…).
import crypto from "crypto";

const API = "https://api.stripe.com/v1";
const VERSION = "2024-06-20";

export const stripeActif = () => !!process.env.STRIPE_SECRET_KEY;

type Valeur = string | number | boolean | null | undefined | Valeur[] | { [cle: string]: Valeur };

/** Encodage « formulaire » de Stripe : a[b]=1, a[0]=x, expand[]=… */
function encoder(params: Record<string, Valeur>, prefixe = "", sortie = new URLSearchParams()): URLSearchParams {
  for (const [cle, v] of Object.entries(params)) {
    const nom = prefixe ? `${prefixe}[${cle}]` : cle;
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      v.forEach((x, i) => {
        if (x !== null && typeof x === "object") encoder(x as Record<string, Valeur>, `${nom}[${i}]`, sortie);
        else sortie.append(`${nom}[${i}]`, String(x));
      });
    } else if (typeof v === "object") encoder(v, nom, sortie);
    else sortie.append(nom, String(v));
  }
  return sortie;
}

export async function stripe<T = Record<string, unknown>>(
  chemin: string,
  options: { methode?: "GET" | "POST" | "DELETE"; params?: Record<string, Valeur>; idempotence?: string } = {},
): Promise<T> {
  const cle = process.env.STRIPE_SECRET_KEY;
  if (!cle) throw new Error("STRIPE_SECRET_KEY manquant");
  const methode = options.methode ?? "POST";
  const corps = options.params ? encoder(options.params) : null;
  const url = methode === "GET" && corps ? `${API}${chemin}?${corps}` : `${API}${chemin}`;
  const res = await fetch(url, {
    method: methode,
    headers: {
      Authorization: `Bearer ${cle}`,
      "Stripe-Version": VERSION,
      ...(methode !== "GET" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(options.idempotence ? { "Idempotency-Key": options.idempotence } : {}),
    },
    body: methode !== "GET" && corps ? corps.toString() : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!res.ok) throw new Error(`Stripe : ${json.error?.message || res.status}`);
  return json as T;
}

/** Signature d'un webhook (en-tête Stripe-Signature : t=…,v1=…), tolérance de 5 minutes */
export function verifierWebhook(corps: string, entete: string | null, secret: string): boolean {
  if (!entete || !secret) return false;
  const morceaux = entete.split(",").map((m) => m.trim().split("="));
  const t = morceaux.find(([k]) => k === "t")?.[1];
  const signatures = morceaux.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !/^\d+$/.test(t) || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const attendu = crypto.createHmac("sha256", secret).update(`${t}.${corps}`).digest("hex");
  return signatures.some((s) => s.length === attendu.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(attendu)));
}
