import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  return NextResponse.json({
    prenom: session.prenom,
    role: session.role,
    permissions: session.entreprise?.permissions || [],
  });
}