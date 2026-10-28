import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/session";
import { feuilles, JEUX } from "@/lib/export-complet";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET ?jeu=salaries|entreprises|…|tout&entrepriseId=&mois=AAAA-MM : export Excel complet (admin)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const p = request.nextUrl.searchParams;
  const jeu = p.get("jeu") || "";
  if (!JEUX[jeu]) return NextResponse.json({ erreur: "Export inconnu" }, { status: 400 });

  const liste = await feuilles(jeu, { entrepriseId: p.get("entrepriseId") || p.get("entreprise"), mois: p.get("mois") });
  const wb = XLSX.utils.book_new();
  const noms = new Set<string>();
  for (const f of liste) {
    let nom = f.nom.slice(0, 31);
    for (let i = 2; noms.has(nom); i++) nom = `${f.nom.slice(0, 28)} ${i}`;
    noms.add(nom);
    const ws = XLSX.utils.json_to_sheet(f.lignes.length ? f.lignes : [{ Information: "Aucune donnée" }]);
    // Largeur des colonnes selon le contenu
    const cles = Object.keys(f.lignes[0] ?? { Information: "" });
    ws["!cols"] = cles.map((k) => ({ wch: Math.min(Math.max(k.length, ...f.lignes.slice(0, 200).map((l) => String(l[k] ?? "").length)) + 2, 60) }));
    XLSX.utils.book_append_sheet(wb, ws, nom);
  }
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="franeo-${jeu}-${date}.xlsx"`,
    },
  });
}
