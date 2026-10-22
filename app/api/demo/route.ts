// app/api/demo/route.ts
// POST : ouvre une session sur l'entreprise de démonstration (bouton « Tester la démo »).

import { NextResponse } from "next/server";
import { preparerDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const { userId } = await preparerDemo();
    const res = NextResponse.json({ ok: true, role: "CLIENT" });
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
