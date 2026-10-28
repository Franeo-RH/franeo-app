import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supprimer } from "@/lib/admin-actions";

// POST { modele, id } ou { modele, ids: [] } : suppression admin (modèles autorisés uniquement)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { modele, id, ids } = await request.json().catch(() => ({}));
  const liste: string[] = Array.isArray(ids) ? ids.filter((x: unknown) => typeof x === "string").slice(0, 500) : typeof id === "string" ? [id] : [];
  if (typeof modele !== "string" || liste.length === 0) return NextResponse.json({ erreur: "Requête invalide" }, { status: 400 });
  let ok = 0;
  for (const x of liste) {
    try {
      const r = await supprimer(modele, x);
      if (r.erreur) return NextResponse.json(r, { status: 400 });
      ok++;
    } catch {
      // élément déjà supprimé ou lié à d'autres données : on continue
    }
  }
  return NextResponse.json({ succes: true, supprimes: ok });
}
