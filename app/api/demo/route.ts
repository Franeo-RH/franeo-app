// app/api/demo/route.ts
// POST : ouvre une session sur l'entreprise de démonstration (bouton « Tester la démo »).

import { NextResponse } from "next/server";
import { preparerDemo, preparerDemoManager, preparerDemoSalarie } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { preparerDemoCabinet } from "@/lib/demo-cabinet";
import { COOKIE_CLIENT_CABINET } from "@/lib/jeton-session";
import { ouvrirSession } from "@/lib/jeton-session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const corps = await request.json().catch(() => ({}));
    const salarie = corps?.profil === "salarie" || corps?.profil === "manager";
    const cabinet = corps?.profil === "cabinet";
    const userId = cabinet ? await preparerDemoCabinet() : corps?.profil === "manager" ? await preparerDemoManager() : corps?.profil === "salarie" ? await preparerDemoSalarie() : (await preparerDemo()).userId;
    const res = NextResponse.json({ ok: true, role: cabinet ? "CABINET" : salarie ? "SALARIE" : "CLIENT" });
    res.cookies.set("fr_visite", "1", { path: "/", maxAge: 3600, sameSite: "lax" }); // démo : présentation à chaque ouverture
    res.cookies.set(COOKIE_CLIENT_CABINET, "", { path: "/", maxAge: 0 }); // le cabinet démo commence par son portefeuille
    const compte = await prisma.utilisateur.findUnique({ where: { id: userId }, select: { id: true, motDePasse: true } });
    if (!compte) throw new Error("Compte démo introuvable");
    return ouvrirSession(res, compte, 60 * 60 * 8, { demo: true }); // session démo de 8 h, en consultation seule
  } catch (e) {
    console.error("Démo indisponible", e);
    return NextResponse.json({ erreur: "La démo est momentanément indisponible, réessayez dans un instant." }, { status: 500 });
  }
}
