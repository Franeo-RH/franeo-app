// lib/excel-marque.ts
// Tous les fichiers Excel de l'application (extractions et modèles d'import) aux couleurs FRANEO RH :
// ligne des titres de colonnes en blanc sur orange (ligne 1, figée à l'écran), police Arial, largeurs ajustées.
// Aucune image ni ligne d'en-tête : des fichiers simples, qui s'ouvrent partout sans réparation.

import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { NextResponse } from "next/server";

/** Ligne des titres de colonnes dans un fichier fabriqué par l'application */
export const LIGNE_TITRES = 1;

const ORANGE = "FFF97316";
const POLICE = "Arial";

/** Options conservées pour compatibilité (plus de logo ni de titre dans les fichiers) */
export type OptionsMarque = { entrepriseId?: string | null; titre?: string };

/** Nom de feuille accepté par Excel (31 caractères, sans \ / ? * [ ] :) */
export function nomFeuille(nom: string) {
  const n = nom.replace(/[\\/?*[\]:]/g, " ").replace(/^'+|'+$/g, "").trim().slice(0, 31);
  return n || "Feuille";
}

/** Style de la ligne des titres de colonnes (blanc sur orange FRANEO, ou la couleur donnée) */
export function styliserTitres(ws: ExcelJS.Worksheet, ligne: number, nb: number, couleur = ORANGE) {
  const row = ws.getRow(ligne);
  row.height = 22;
  for (let c = 1; c <= nb; c++) {
    const cell = row.getCell(c);
    cell.font = { name: POLICE, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: couleur } };
    cell.alignment = { vertical: "middle" };
  }
}

/** Ligne des titres figée à l'écran */
function figerTitres(ws: ExcelJS.Worksheet) {
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: LIGNE_TITRES, topLeftCell: `A${LIGNE_TITRES + 1}`, activeCell: `A${LIGNE_TITRES + 1}` }];
}

/** Écrit un tableau (première ligne = titres) dans une feuille vide */
export function remplirTableau(ws: ExcelJS.Worksheet, lignes: unknown[][], couleur?: string, largeurs?: (number | undefined)[]) {
  const donnees = lignes.length > 1 ? lignes : [...(lignes.length ? lignes : [["Information"]]), ["Aucune donnée"]];
  for (const l of donnees) {
    const row = ws.addRow(l.map((v) => (v === null || v === undefined ? "" : v)));
    row.eachCell((cell) => {
      cell.font = { name: POLICE, size: 10 };
      if (cell.value instanceof Date) cell.numFmt = "dd/mm/yyyy"; // dates au format français
    });
  }
  const nb = Math.max(...donnees.map((l) => l.length), 1);
  styliserTitres(ws, LIGNE_TITRES, nb, couleur);
  for (let i = 0; i < nb; i++) {
    const imposee = largeurs?.[i];
    const max = Math.max(...donnees.slice(0, 300).map((l) => String(l[i] ?? "").length));
    ws.getColumn(i + 1).width = imposee && imposee > 0 ? Math.min(imposee, 80) : Math.min(Math.max(max + 2, 10), 60);
  }
  figerTitres(ws);
}

/** Classeur FRANEO RH : `feuille()` crée une feuille vide, `tableau()` une feuille remplie, `terminer()` renvoie le fichier */
export async function classeurMarque(opts: OptionsMarque = {}) {
  void opts;
  const wb = new ExcelJS.Workbook();
  wb.creator = "FRANEO RH";
  wb.created = new Date();
  const feuille = (nom: string) => wb.addWorksheet(nomFeuille(nom));
  return {
    wb,
    feuille,
    tableau(nom: string, lignes: unknown[][], couleur?: string) {
      const ws = feuille(nom);
      remplirTableau(ws, lignes, couleur);
      return ws;
    },
    async terminer(): Promise<Buffer> {
      return Buffer.from(await wb.xlsx.writeBuffer());
    },
  };
}

/** Fichier Excel « tableau » (première ligne = titres de colonnes) aux couleurs FRANEO RH */
export async function excelDepuisLignes(feuille: string, lignes: unknown[][], opts: OptionsMarque = {}): Promise<Buffer> {
  const c = await classeurMarque(opts);
  c.tableau(feuille || "Export", lignes);
  return c.terminer();
}

/**
 * Met aux couleurs FRANEO RH un fichier fabriqué par la bibliothèque « xlsx » (json_to_sheet, aoa_to_sheet).
 * Chaque feuille est relue puis reconstruite avec exceljs (mêmes noms, mêmes valeurs, mêmes largeurs).
 */
export async function brander(contenu: Buffer | Uint8Array | ArrayBuffer, opts: OptionsMarque = {}): Promise<Buffer> {
  const octets = contenu instanceof ArrayBuffer ? new Uint8Array(contenu) : new Uint8Array(contenu);
  const source = XLSX.read(octets, { type: "array", cellDates: true });
  const c = await classeurMarque(opts);
  for (const nom of source.SheetNames) {
    const f = source.Sheets[nom];
    if (!f) continue;
    const lignes = XLSX.utils.sheet_to_json<unknown[]>(f, { header: 1, raw: true, defval: null, blankrows: true });
    const largeurs = (f["!cols"] ?? []).map((col) => (col ? col.wch ?? (col.width ? col.width : undefined) : undefined));
    remplirTableau(c.feuille(nom), lignes, undefined, largeurs);
  }
  if (source.SheetNames.length === 0) c.tableau("Export", []);
  return c.terminer();
}

/** Réponse HTTP de téléchargement d'un fichier Excel */
export function reponseExcel(buffer: Buffer, nomFichier: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomFichier.replace(/\.(csv|xlsx)$/i, "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "-")}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Imports : index (0 = première ligne) de la ligne des titres de colonnes (saute d'éventuelles lignes de titre) */
export function indexLigneTitres(lignes: unknown[][]): number {
  const i = lignes.findIndex((l) => (l ?? []).filter((v) => String(v ?? "").trim() !== "").length >= 2);
  return i < 0 ? 0 : i;
}
