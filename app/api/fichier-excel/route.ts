import { NextRequest, NextResponse } from "next/server";
import { getSessionBrute } from "@/lib/session";
import { excelDepuisLignes, reponseExcel } from "@/lib/excel-marque";

export const runtime = "nodejs";

/**
 * POST { nom, feuille?, lignes: [[titres…], [valeurs…]…], entrepriseId? (admin) }
 * Transforme un tableau affiché à l'écran en fichier Excel avec le logo FRANEO RH (et celui du client).
 */
export async function POST(request: NextRequest) {
  const u = await getSessionBrute();
  if (!u) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  if (!Array.isArray(b.lignes) || !b.lignes.length) return NextResponse.json({ erreur: "Tableau vide" }, { status: 400 });
  const lignes = (b.lignes as unknown[]).slice(0, 20001).map((l) => (Array.isArray(l) ? l.slice(0, 100).map((v) => (typeof v === "number" || typeof v === "string" ? v : v == null ? "" : String(v))) : []));
  const nom = String(b.nom || "export").replace(/[^\p{L}\p{N}._ -]+/gu, "-").slice(0, 80) || "export";
  const entrepriseId = u.role === "ADMIN" ? (typeof b.entrepriseId === "string" ? b.entrepriseId : null) : u.entrepriseId;
  return reponseExcel(await excelDepuisLignes(String(b.feuille || nom), lignes, { entrepriseId }), nom);
}
