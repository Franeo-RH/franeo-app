// app/api/demo/route.ts
// POST : ouvre une session sur l'entreprise de démonstration (bouton « Tester la démo »).

import { NextResponse } from "next/server";
import { preparerDemo, preparerDemoSalarie } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const corps = await request.json().catch(() => ({}));
    const salarie = corps?.profil === "salarie";
    const userId = salarie ? await preparerDemoSalarie() : (await preparerDemo()).userId;
    const res = NextResponse.json({ ok: true, role: salarie ? "SALARIE" : "CLIENT" });
    res.cookies.set("userId", userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8, // la session démo expire au bout de 8 h
    });
    return res;
  } catch (e) {
    console.error("Démo indisponible", e);
    return NextResponse.json({ erreur: "La démo est momentanément indisponible, réessayez dans un instant." }, { status: 500 });
  }
}
