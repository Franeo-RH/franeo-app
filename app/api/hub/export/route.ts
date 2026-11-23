import { NextRequest, NextResponse } from "next/server";
import { appelDuPortail } from "@/lib/hub";
import { appelInterne, cheminExport } from "@/lib/hub-interne";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET (portail) ?id=&mois=AAAA-MM&entreprise=&email= : extraction Excel (mêmes fichiers que dans l'admin) */
export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const p = request.nextUrl.searchParams;
  const chemin = cheminExport(p.get("id") || "", { mois: p.get("mois"), entreprise: p.get("entreprise") });
  if (!chemin) return NextResponse.json({ erreur: "Extraction inconnue" }, { status: 400 });
  const r = await appelInterne(request, p.get("email"), chemin);
  if (!r.ok) return NextResponse.json({ erreur: (await r.json().catch(() => null))?.erreur ?? `Extraction impossible (${r.status})` }, { status: r.status === 401 ? 403 : r.status });
  return new NextResponse(r.body, {
    status: 200,
    headers: {
      "Content-Type": r.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": r.headers.get("content-disposition") || `attachment; filename="franeo-${p.get("id")}.xlsx"`,
    },
  });
}
