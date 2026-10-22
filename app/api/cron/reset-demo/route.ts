// app/api/cron/reset-demo/route.ts
// Appelée chaque nuit par Vercel (voir vercel.json) : remet la démo à zéro.
// Protégée par la variable d'environnement CRON_SECRET (Vercel l'envoie automatiquement).

import { NextRequest, NextResponse } from "next/server";
import { reinitialiserDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }
  await reinitialiserDemo();
  return NextResponse.json({ ok: true });
}
