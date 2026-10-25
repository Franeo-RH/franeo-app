// Réinitialisation manuelle de la démo, lancée par un administrateur depuis le dashboard.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { reinitialiserDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  try {
    await reinitialiserDemo();
  } catch (e) {
    console.error("Réinitialisation démo :", e);
    return NextResponse.json({ erreur: "La réinitialisation a échoué. Réessayez dans un instant." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
