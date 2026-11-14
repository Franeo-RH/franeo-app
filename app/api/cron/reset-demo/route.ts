// app/api/cron/reset-demo/route.ts
// Appelée chaque nuit par Vercel (voir vercel.json) : remet la démo à zéro
// et purge les données dont la durée de conservation RGPD est dépassée.
// Protégée par la variable d'environnement CRON_SECRET (Vercel l'envoie automatiquement).

import { NextRequest, NextResponse } from "next/server";
import { reinitialiserDemo } from "@/lib/demo";
import { purgerDonneesExpirees } from "@/lib/rgpd";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }
  await reinitialiserDemo();
  const purge = await purgerDonneesExpirees().catch((e) => { console.error("[RGPD] purge", e); return null; });
  return NextResponse.json({ ok: true, purge });
}
