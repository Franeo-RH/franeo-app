// app/api/salaries/import/modele/route.ts
// GET : télécharge le modèle Excel vierge.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fabriquerModele } from "@/lib/import-salaries-xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  const contenu = await fabriquerModele();
  return new NextResponse(contenu as any, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modele-import-salaries.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
