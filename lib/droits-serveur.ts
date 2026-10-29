import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aDroit, type ActionId } from "@/lib/droits";

/** Renvoie une réponse 403 si le client connecté n'a pas ce droit (l'admin passe toujours) */
export async function refuserSansDroit(droit: ActionId): Promise<NextResponse | null> {
  const session = await getSession();
  if (session?.role === "CLIENT" && !aDroit(session.entreprise?.permissions, droit)) {
    return NextResponse.json({ erreur: "Action non autorisée pour votre compte. Contactez FRANEO RH." }, { status: 403 });
  }
  return null;
}
