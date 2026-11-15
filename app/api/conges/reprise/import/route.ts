// app/api/conges/reprise/import/route.ts
// POST (fichier Excel) : lit le modèle rempli et renvoie les lignes reconnues, à vérifier avant d'enregistrer

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { accesReprise, jours, salariesConges } from "@/lib/conges-reprise";
import { indexLigneTitres } from "@/lib/excel-marque";

export const runtime = "nodejs";

const norm = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const a = await accesReprise(request, true, form?.get("entrepriseId"));
  if (!a.ok) return a.refus;
  const fichier = form?.get("fichier");
  if (!fichier || typeof fichier === "string") return NextResponse.json({ erreur: "Choisissez le fichier Excel." }, { status: 400 });
  if (fichier.size > 5_000_000) return NextResponse.json({ erreur: "Fichier trop lourd (5 Mo maximum)." }, { status: 400 });

  const wb = XLSX.read(new Uint8Array(await fichier.arrayBuffer()), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return NextResponse.json({ erreur: "Fichier vide." }, { status: 400 });
  const brut = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  const debut = indexLigneTitres(brut);
  const titres = (brut[debut] ?? []).map(norm);
  const col = (...mots: string[]) => titres.findIndex((t) => mots.some((m) => t.includes(m)));
  const cMat = col("matricule"), cNom = col("nom"), cPrenom = col("prenom"), cReste = col("reste"), cEnCours = col("en cours", "acquis");
  if (cReste < 0 || cEnCours < 0) return NextResponse.json({ erreur: "Colonnes « Reste à prendre » et « Acquis en cours » introuvables : utilisez le modèle." }, { status: 400 });

  const salaries = await salariesConges(a.entrepriseId, a.filtre);
  const lignes: { ligne: number; salarieId: string | null; nom: string; reste: number | null; enCours: number | null; erreur?: string }[] = [];
  brut.slice(debut + 1).forEach((r, i) => {
    const mat = cMat >= 0 ? String(r[cMat] ?? "").trim() : "";
    const nom = cNom >= 0 ? norm(r[cNom]) : "", prenom = cPrenom >= 0 ? norm(r[cPrenom]) : "";
    if (!mat && !nom && !prenom) return;
    const s = (mat && salaries.find((x) => (x.matricule ?? "").trim() === mat)) || salaries.find((x) => norm(x.nom) === nom && norm(x.prenom) === prenom);
    const reste = jours(r[cReste]), enCours = jours(r[cEnCours]);
    const libelle = s ? `${s.prenom} ${s.nom}` : [r[cPrenom], r[cNom], mat].filter(Boolean).join(" ");
    lignes.push({
      ligne: debut + i + 2, salarieId: s?.id ?? null, nom: libelle, reste: Number.isNaN(reste) ? null : reste, enCours: Number.isNaN(enCours) ? null : enCours,
      ...(!s ? { erreur: "Salarié introuvable" } : Number.isNaN(reste) || Number.isNaN(enCours) ? { erreur: "Nombre de jours invalide" } : {}),
    });
  });
  return NextResponse.json({ lignes });
}
