import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { modifier } from "@/lib/admin-actions";

// POST { modele, id, data } : modification admin (champs autorisés uniquement)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { modele, id, data } = await request.json().catch(() => ({}));
  if (typeof modele !== "string" || typeof id !== "string" || typeof data !== "object" || !data) return NextResponse.json({ erreur: "Requête invalide" }, { status: 400 });
  try {
    const r = await modifier(modele, id, data);
    if (r.erreur) return NextResponse.json(r, { status: 400 });
    return NextResponse.json({ succes: true });
  } catch {
    return NextResponse.json({ erreur: "Modification impossible (élément introuvable ?)" }, { status: 400 });
  }
}
