// app/api/rgpd/moi/route.ts
// Espace salarié : le salarié télécharge lui-même toutes ses données (droit d'accès RGPD).

import { NextRequest, NextResponse } from "next/server";
import { getSessionSalarie } from "@/lib/session";
import { exporterDonneesSalarie } from "@/lib/rgpd";
import { reponseExcel } from "@/lib/excel-marque";
import { estBloque, journaliser, noterEchec } from "@/lib/securite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  // 5 téléchargements par heure (fichier lourd)
  const cle = `rgpd:moi:${s.salarie.id}`;
  if (await estBloque(cle, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ erreur: "Vous avez déjà téléchargé vos données plusieurs fois : réessayez dans une heure." }, { status: 429 });
  }
  await noterEchec(cle, 5, 60 * 60 * 1000);
  const r = await exporterDonneesSalarie(s.salarie.id);
  if (!r) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  await journaliser({ action: "RGPD_EXPORT", utilisateur: s.utilisateur, cible: `${s.salarie.prenom} ${s.salarie.nom} (par lui-même)`, request });
  return reponseExcel(r.buffer, r.nom);
}
