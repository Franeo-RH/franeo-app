// app/api/cron/reset-demo/route.ts
// Appelée chaque nuit par Vercel (voir vercel.json) : remet la démo à zéro, relance les impayés,
// envoie le bilan mensuel le 1er du mois,
// et purge les données dont la durée de conservation RGPD est dépassée.
// Protégée par la variable d'environnement CRON_SECRET (Vercel l'envoie automatiquement).

import { NextRequest, NextResponse } from "next/server";
import { reinitialiserDemo } from "@/lib/demo";
import { purgerDonneesExpirees } from "@/lib/rgpd";
import { relancesAutomatiques } from "@/lib/relances";
import { envoyerBilans } from "@/lib/bilan-mensuel";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }
  await reinitialiserDemo();
  // Relances d'impayés (chaque nuit) et bilan mensuel des dirigeants (le 1er du mois)
  const relances = await relancesAutomatiques().catch((e) => { console.error("[Relances]", e); return 0; });
  const bilans = new Date().getDate() === 1 ? await envoyerBilans().catch((e) => { console.error("[Bilans]", e); return 0; }) : 0;
  const purge = await purgerDonneesExpirees().catch((e) => { console.error("[RGPD] purge", e); return null; });
  return NextResponse.json({ ok: true, purge, relances, bilans });
}
