import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { importer, MODELES_IMPORT, modeleXlsx } from "@/lib/import-admin";
import { importerClient, modeleClient } from "@/lib/import-client";
import { brander, reponseExcel } from "@/lib/excel-marque";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?jeu= : modèle Excel à remplir
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const jeu = request.nextUrl.searchParams.get("jeu") || "";
  if (jeu === "client") return reponseExcel(await brander(modeleClient(), { titre: "FRANEO RH · Fiche nouveau client" }), "modele-nouveau-client");
  if (!MODELES_IMPORT[jeu]) return NextResponse.json({ erreur: "Import inconnu" }, { status: 400 });
  return reponseExcel(await brander(modeleXlsx(jeu), { titre: `FRANEO RH · Modèle d'import ${MODELES_IMPORT[jeu].titre.toLowerCase()}` }), `modele-import-${jeu}`);
}

// POST (formData : jeu, fichier) : import
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const form = await request.formData();
  const jeu = String(form.get("jeu") || "");
  const fichier = form.get("fichier");
  if (!MODELES_IMPORT[jeu] && jeu !== "client") return NextResponse.json({ erreur: "Import inconnu" }, { status: 400 });
  if (!fichier || typeof fichier === "string") return NextResponse.json({ erreur: "Aucun fichier reçu" }, { status: 400 });
  if (fichier.size > 5 * 1024 * 1024) return NextResponse.json({ erreur: "Fichier trop volumineux (5 Mo maximum)" }, { status: 400 });
  try {
    const r = jeu === "client" ? await importerClient(await fichier.arrayBuffer()) : await importer(jeu, await fichier.arrayBuffer());
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ erreur: "Impossible de lire ce fichier : utilisez le modèle Excel." }, { status: 400 });
  }
}
