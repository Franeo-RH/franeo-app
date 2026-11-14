// lib/import-salaries-xlsx.ts
// Lecture / écriture des fichiers Excel (bibliothèque « exceljs »).

import ExcelJS from "exceljs";
import { COLONNES, CONTRATS_IMPORT, type LigneErreur } from "./import-salaries";
import { classeurMarque, LIGNE_TITRES, styliserTitres, type OptionsMarque } from "./excel-marque";

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
  // Modèles avec en-tête FRANEO RH (logos) : on commence à la ligne des titres de colonnes
  const debut = lignes.findIndex((l) => l.filter((v) => v !== null && v !== undefined && String(v).trim() !== "").length >= 2);
  return debut > 0 ? lignes.slice(debut) : lignes;
}

const VERT = "FF1F6F5C";

function formaterColonnes(ws: ExcelJS.Worksheet) {
  COLONNES.forEach((col, i) => {
    const c = ws.getColumn(i + 1);
    c.width = col.champ === "poste" || col.champ === "email" ? 28 : 18;
    if (col.champ === "matricule" || col.champ === "telephone") c.numFmt = "@";
    if (col.champ === "dateDebut" || col.champ === "dateFin") c.numFmt = "dd/mm/yyyy";
  });
}

function figerTitres(ws: ExcelJS.Worksheet) {
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: LIGNE_TITRES, topLeftCell: `A${LIGNE_TITRES + 1}`, activeCell: `A${LIGNE_TITRES + 1}` }];
}

/** Modèle d'import vierge (en-tête FRANEO RH, titres de colonnes ligne 4, liste déroulante des contrats). */
export async function fabriquerModele(opts: OptionsMarque = {}): Promise<Buffer> {
  const c = await classeurMarque({ ...opts, titre: opts.titre ?? "FRANEO RH · Modèle d'import des salariés" });
  const ws = c.feuille("Salariés");
  ws.addRow(COLONNES.map((col) => col.titre));
  formaterColonnes(ws);
  styliserTitres(ws, LIGNE_TITRES, COLONNES.length, VERT);
  figerTitres(ws);

  const contrat = COLONNES.findIndex((col) => col.champ === "typeContrat") + 1;
  for (let r = LIGNE_TITRES + 1; r <= LIGNE_TITRES + 1000; r++) {
    ws.getCell(r, contrat).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${CONTRATS_IMPORT.join(",")}"`],
    };
  }

  const aide = c.feuille("Mode d'emploi");
  aide.getColumn(1).width = 24;
  aide.getColumn(2).width = 70;
  aide.addRow(["Colonne", "À savoir"]);
  COLONNES.forEach((col) => aide.addRow([col.titre + (col.requis ? " *" : ""), col.aide]));
  aide.addRow([]);
  aide.addRow(["Exemple", "Jean | Dupont | Comptable | CDI | 01/09/2026 | | 35 | 2500 | | jean@exemple.fr"]);
  aide.addRow([]);
  aide.addRow(["Règles", "* = obligatoire. Remplissez l'onglet « Salariés » à partir de la ligne 5 (une ligne par salarié). Une ligne avec une erreur n'est pas importée : vous récupérez un fichier d'erreurs à corriger et à renvoyer. Un matricule déjà utilisé est refusé."]);
  styliserTitres(aide, LIGNE_TITRES, 2, VERT);
  aide.getColumn(2).alignment = { wrapText: true, vertical: "top" };

  return c.terminer();
}

/** Fichier des lignes refusées : mêmes colonnes que le modèle + colonne « Erreur » à droite. */
export async function fabriquerFichierErreurs(erreurs: LigneErreur[], opts: OptionsMarque = {}): Promise<Buffer> {
  const c = await classeurMarque({ ...opts, titre: opts.titre ?? "FRANEO RH · Lignes à corriger" });
  const ws = c.feuille("Salariés");
  ws.addRow([...COLONNES.map((col) => col.titre), "Erreur"]);
  formaterColonnes(ws);
  for (const e of erreurs) ws.addRow([...e.valeurs, e.raisons.join(" ; ")]);
  const colErreur = COLONNES.length + 1;
  ws.getColumn(colErreur).width = 70;
  styliserTitres(ws, LIGNE_TITRES, colErreur, VERT);
  ws.getRow(LIGNE_TITRES).getCell(colErreur).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB91C1C" } };
  figerTitres(ws);
  for (let r = LIGNE_TITRES + 1; r <= LIGNE_TITRES + erreurs.length; r++) {
    ws.getCell(r, colErreur).font = { color: { argb: "FFB91C1C" } };
    ws.getCell(r, colErreur).alignment = { wrapText: true, vertical: "top" };
  }
  return c.terminer();
}
