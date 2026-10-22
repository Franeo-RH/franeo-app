// lib/import-salaries-xlsx.ts
// Lecture / écriture des fichiers Excel (bibliothèque « exceljs »).

import ExcelJS from "exceljs";
import { COLONNES, CONTRATS_IMPORT, type LigneErreur } from "./import-salaries";

function valeurCellule(v: any): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return valeurCellule(v.result); // formule
    if ("richText" in v && Array.isArray(v.richText)) return v.richText.map((r: any) => r.text).join("");
    if ("text" in v) return typeof v.text === "string" ? v.text : valeurCellule(v.text); // lien (email)
    if ("error" in v) return null;
    return String(v);
  }
  return v;
}

/** Lit la première feuille du fichier : tableau de lignes (la première = en-têtes). */
export async function lireFichierExcel(contenu: ArrayBuffer | Buffer): Promise<unknown[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(contenu as any);
  const feuille = wb.worksheets[0];
  if (!feuille) return [];
  const nbCol = Math.max(feuille.columnCount, COLONNES.length);
  const lignes: unknown[][] = [];
  for (let r = 1; r <= feuille.rowCount; r++) {
    const row = feuille.getRow(r);
    const cellules: unknown[] = [];
    for (let c = 1; c <= nbCol; c++) cellules.push(valeurCellule(row.getCell(c).value));
    lignes.push(cellules);
  }
  return lignes;
}

const VERT = "FF1F6F5C";

function styleEntetes(ws: ExcelJS.Worksheet, nb: number, rouge?: number) {
  const row = ws.getRow(1);
  row.height = 22;
  for (let c = 1; c <= nb; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c === rouge ? "FFB91C1C" : VERT } };
    cell.alignment = { vertical: "middle" };
  }
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function formaterColonnes(ws: ExcelJS.Worksheet) {
  COLONNES.forEach((col, i) => {
    const c = ws.getColumn(i + 1);
    c.width = col.champ === "poste" || col.champ === "email" ? 28 : 18;
    if (col.champ === "matricule" || col.champ === "telephone") c.numFmt = "@";
    if (col.champ === "dateDebut" || col.champ === "dateFin") c.numFmt = "dd/mm/yyyy";
  });
}

export async function fabriquerModele(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Salariés");
  ws.addRow(COLONNES.map((c) => c.titre));
  formaterColonnes(ws);
  styleEntetes(ws, COLONNES.length);

  const contrat = COLONNES.findIndex((c) => c.champ === "typeContrat") + 1;
  for (let r = 2; r <= 1001; r++) {
    ws.getCell(r, contrat).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${CONTRATS_IMPORT.join(",")}"`],
    };
  }

  const aide = wb.addWorksheet("Mode d'emploi");
  aide.getColumn(1).width = 24;
  aide.getColumn(2).width = 70;
  aide.addRow(["Colonne", "À savoir"]);
  COLONNES.forEach((c) => aide.addRow([c.titre + (c.requis ? " *" : ""), c.aide]));
  aide.addRow([]);
  aide.addRow(["Exemple", "Jean | Dupont | Comptable | CDI | 01/09/2026 | | 35 | 2500 | | jean@exemple.fr"]);
  aide.addRow([]);
  aide.addRow(["Règles", "* = obligatoire. Une ligne avec une erreur n'est pas importée : vous récupérez un fichier d'erreurs à corriger et à renvoyer. Un matricule déjà utilisé est refusé."]);
  aide.getRow(1).font = { bold: true };
  aide.getColumn(2).alignment = { wrapText: true, vertical: "top" };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Fichier des lignes refusées : mêmes colonnes que le modèle + colonne « Erreur » à droite. */
export async function fabriquerFichierErreurs(erreurs: LigneErreur[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Salariés");
  ws.addRow([...COLONNES.map((c) => c.titre), "Erreur"]);
  formaterColonnes(ws);
  for (const e of erreurs) ws.addRow([...e.valeurs, e.raisons.join(" ; ")]);
  const colErreur = COLONNES.length + 1;
  ws.getColumn(colErreur).width = 70;
  styleEntetes(ws, colErreur, colErreur);
  for (let r = 2; r <= erreurs.length + 1; r++) {
    ws.getCell(r, colErreur).font = { color: { argb: "FFB91C1C" } };
    ws.getCell(r, colErreur).alignment = { wrapText: true, vertical: "top" };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
