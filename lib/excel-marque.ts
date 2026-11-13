// lib/excel-marque.ts
// Tous les fichiers Excel de l'application (extractions et modèles d'import) portent le logo FRANEO RH en haut à gauche,
// et le logo du client en haut à droite quand il en a ajouté un (Mon entreprise › Logo).
// Les imports savent ignorer ces lignes d'en-tête (la ligne des titres de colonnes est retrouvée automatiquement).

import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LOGO_FRANEO_PNG_BASE64, LOGO_FRANEO_TAILLE } from "@/lib/logo-franeo";

export const LIGNES_ENTETE = 3;
const HAUTEUR_LOGO = 48;

type LogoClient = { base64: string; extension: "png" | "jpeg"; largeur: number; hauteur: number; nom: string };

async function logoClient(entrepriseId?: string | null): Promise<LogoClient | null> {
  if (!entrepriseId) return null;
  const e = await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { nom: true, logoClient: true } });
  const l = e?.logoClient;
  const m = l ? /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(l.data) : null;
  if (!e || !l || !m) return null;
  return { base64: m[2], extension: m[1] === "png" ? "png" : "jpeg", largeur: l.largeur || 160, hauteur: l.hauteur || 80, nom: e.nom };
}

/** Ajoute l'en-tête (logos, titre, date) en haut de chaque feuille d'un fichier Excel existant */
export async function brander(contenu: Buffer | Uint8Array | ArrayBuffer, opts: { entrepriseId?: string | null; titre?: string } = {}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(contenu as any);
  const client = await logoClient(opts.entrepriseId);
  const idFraneo = wb.addImage({ base64: LOGO_FRANEO_PNG_BASE64, extension: "png" });
  const idClient = client ? wb.addImage({ base64: client.base64, extension: client.extension }) : null;
  const date = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

  for (const ws of wb.worksheets) {
    ws.spliceRows(1, 0, [], [], []);
    ws.getRow(1).height = HAUTEUR_LOGO * 0.78; // points
    ws.getRow(LIGNES_ENTETE).height = 6;
    ws.addImage(idFraneo, { tl: { col: 0.05, row: 0.05 }, ext: { width: Math.round((LOGO_FRANEO_TAILLE.largeur * HAUTEUR_LOGO) / LOGO_FRANEO_TAILLE.hauteur), height: HAUTEUR_LOGO } });
    const titre = ws.getCell("B1");
    titre.value = opts.titre ?? (client ? `FRANEO RH · ${client.nom}` : "FRANEO RH");
    titre.font = { bold: true, size: 14, color: { argb: "FFEA580C" } };
    titre.alignment = { vertical: "middle" };
    const sous = ws.getCell("B2");
    sous.value = `${ws.name} — extrait le ${date}`;
    sous.font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
    if (client && idClient != null) {
      const derniere = Math.max(ws.columnCount, 4);
      const largeur = Math.round((client.largeur * HAUTEUR_LOGO) / client.hauteur);
      ws.addImage(idClient, { tl: { col: Math.max(derniere - 1.6, 2), row: 0.05 }, ext: { width: Math.min(largeur, 220), height: HAUTEUR_LOGO } });
    }
    // Volets figés : on décale d'autant de lignes
    if (ws.views?.length) {
      ws.views = ws.views.map((v) => {
        const y = (v as { ySplit?: number }).ySplit;
        return (y ? { ...v, ySplit: y + LIGNES_ENTETE } : v) as typeof v;
      });
    }
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Fichier Excel « tableau » (première ligne = titres de colonnes), avec en-têtes stylés et logos */
export async function excelDepuisLignes(feuille: string, lignes: unknown[][], opts: { entrepriseId?: string | null; titre?: string } = {}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(feuille.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Export");
  for (const l of lignes) ws.addRow(l.map((v) => (v === null || v === undefined ? "" : v)));
  const entete = ws.getRow(1);
  entete.font = { bold: true, color: { argb: "FFFFFFFF" } };
  entete.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF97316" } }; });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  (lignes[0] ?? []).forEach((_, i) => {
    const max = Math.max(...lignes.slice(0, 300).map((l) => String(l[i] ?? "").length));
    ws.getColumn(i + 1).width = Math.min(Math.max(max + 2, 10), 60);
  });
  return brander(Buffer.from(await wb.xlsx.writeBuffer()), opts);
}

/** Réponse HTTP de téléchargement d'un fichier Excel */
export function reponseExcel(buffer: Buffer, nomFichier: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomFichier.replace(/\.(csv|xlsx)$/i, "")}.xlsx"`,
    },
  });
}

/** Imports : index (0 = première ligne) de la ligne des titres de colonnes, en sautant l'en-tête FRANEO RH */
export function indexLigneTitres(lignes: unknown[][]): number {
  const i = lignes.findIndex((l) => (l ?? []).filter((v) => String(v ?? "").trim() !== "").length >= 2);
  return i < 0 ? 0 : i;
}
