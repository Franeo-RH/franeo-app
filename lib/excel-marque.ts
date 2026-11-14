// lib/excel-marque.ts
// Tous les fichiers Excel de l'application (extractions et modèles d'import) portent un en-tête sur 3 lignes :
// logo FRANEO RH à gauche, titre et date d'extraction, logo du client à droite (Mon entreprise › Logo).
// Les données commencent ligne 4 (ligne des titres de colonnes), figée à l'écran.
// Les imports savent ignorer ces lignes d'en-tête (la ligne des titres de colonnes est retrouvée automatiquement).
//
// Correctif V36 : Excel refusait d'ouvrir certains fichiers (« sheet1.xml : erreur XML ») car les volets figés
// étaient recopiés avec une cellule de départ incohérente. Les volets sont maintenant toujours recalculés.

import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LOGO_FRANEO_PNG_BASE64, LOGO_FRANEO_TAILLE } from "@/lib/logo-franeo";

export const LIGNES_ENTETE = 3;
/** Ligne des titres de colonnes dans un fichier fabriqué par l'application */
export const LIGNE_TITRES = LIGNES_ENTETE + 1;

// Hauteur des lignes d'en-tête, en points (1 point = 4/3 pixel)
const H_LIGNE1 = 38;
const H_LIGNE2 = 22;
const H_LIGNE3 = 8;
const PX_PAR_PT = 4 / 3;
const EMU_PAR_PX = 9525;
const HAUTEUR_BANDEAU = Math.round((H_LIGNE1 + H_LIGNE2) * PX_PAR_PT); // ≈ 80 px

const HAUTEUR_FRANEO = 60; // px
const CLIENT_MAX_HAUTEUR = 76; // px
const CLIENT_MAX_LARGEUR = 320; // px

const ORANGE = "FFF97316";
const ORANGE_FONCE = "FFEA580C";

export type OptionsMarque = { entrepriseId?: string | null; titre?: string };

type LogoClient = { base64: string; extension: "png" | "jpeg"; largeur: number; hauteur: number; nom: string };
type Marque = { idFraneo: number; client: (LogoClient & { id: number }) | null; titre: string; date: string };

async function logoClient(entrepriseId?: string | null): Promise<LogoClient | null> {
  if (!entrepriseId) return null;
  const e = await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { nom: true, logoClient: true } });
  const l = e?.logoClient;
  const m = l ? /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(l.data) : null;
  if (!e || !l || !m) return null;
  return { base64: m[2], extension: m[1] === "png" ? "png" : "jpeg", largeur: l.largeur || 160, hauteur: l.hauteur || 80, nom: e.nom };
}

async function preparerMarque(wb: ExcelJS.Workbook, opts: OptionsMarque): Promise<Marque> {
  const client = await logoClient(opts.entrepriseId);
  const idFraneo = wb.addImage({ base64: LOGO_FRANEO_PNG_BASE64, extension: "png" });
  return {
    idFraneo,
    client: client ? { ...client, id: wb.addImage({ base64: client.base64, extension: client.extension }) } : null,
    titre: opts.titre ?? (client ? `FRANEO RH · ${client.nom}` : "FRANEO RH"),
    date: new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }),
  };
}

/** Nom de feuille accepté par Excel (31 caractères, sans \ / ? * [ ] :) */
export function nomFeuille(nom: string) {
  const n = nom.replace(/[\\/?*[\]:]/g, " ").replace(/^'+|'+$/g, "").trim().slice(0, 31);
  return n || "Feuille";
}

// --- Positionnement des images au pixel près ---
const largeurColonnePx = (ws: ExcelJS.Worksheet, c: number) => Math.floor((ws.getColumn(c).width || 8.43) * 7 + 5);
const hauteurLignePx = (ws: ExcelJS.Worksheet, r: number) => (ws.getRow(r).height || 15) * PX_PAR_PT;

function ancre(ws: ExcelJS.Worksheet, xPx: number, yPx: number) {
  let col = 1;
  let x = Math.max(0, xPx);
  while (col < 200 && x >= largeurColonnePx(ws, col)) { x -= largeurColonnePx(ws, col); col++; }
  let row = 1;
  let y = Math.max(0, yPx);
  while (row < 50 && y >= hauteurLignePx(ws, row)) { y -= hauteurLignePx(ws, row); row++; }
  // Ancre « native » (colonne, ligne et décalages en EMU), comprise par exceljs
  return { nativeCol: col - 1, nativeColOff: Math.round(x * EMU_PAR_PX), nativeRow: row - 1, nativeRowOff: Math.round(y * EMU_PAR_PX) } as unknown as { col: number; row: number };
}

/** Réserve les 3 lignes d'en-tête d'une feuille vide : les données s'écrivent ensuite à partir de la ligne 4 */
function reserverEntete(ws: ExcelJS.Worksheet) {
  ws.getRow(1).height = H_LIGNE1;
  ws.getRow(2).height = H_LIGNE2;
  ws.getRow(3).height = H_LIGNE3;
}

/** Pose logos, titre et date sur les 3 premières lignes (vides) d'une feuille */
function poserEntete(ws: ExcelJS.Worksheet, m: Marque) {
  reserverEntete(ws);
  // Colonne A assez large pour le logo FRANEO RH
  if ((ws.getColumn(1).width || 8.43) < 9) ws.getColumn(1).width = 9;

  const largeurFraneo = Math.round((LOGO_FRANEO_TAILLE.largeur * HAUTEUR_FRANEO) / LOGO_FRANEO_TAILLE.hauteur);
  ws.addImage(m.idFraneo, { tl: ancre(ws, 6, (HAUTEUR_BANDEAU - HAUTEUR_FRANEO) / 2), ext: { width: largeurFraneo, height: HAUTEUR_FRANEO } });

  const titre = ws.getCell("B1");
  titre.value = m.titre;
  titre.font = { bold: true, size: 15, color: { argb: ORANGE_FONCE } };
  titre.alignment = { vertical: "bottom" };
  const sousTitre = `${ws.name} — extrait le ${m.date}`;
  const sous = ws.getCell("B2");
  sous.value = sousTitre;
  sous.font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
  sous.alignment = { vertical: "top" };

  if (m.client) {
    const echelle = Math.min(CLIENT_MAX_HAUTEUR / m.client.hauteur, CLIENT_MAX_LARGEUR / m.client.largeur);
    const largeur = Math.max(1, Math.round(m.client.largeur * echelle));
    const hauteur = Math.max(1, Math.round(m.client.hauteur * echelle));
    // Aligné sur le bord droit du tableau, sans jamais recouvrir le titre
    const nbColonnes = Math.max(ws.columnCount, 2);
    let bordDroit = 0;
    for (let c = 1; c <= nbColonnes; c++) bordDroit += largeurColonnePx(ws, c);
    const finTexte = largeurColonnePx(ws, 1) + 4 + Math.max(m.titre.length * 9.5, sousTitre.length * 6) + 24;
    const x = Math.max(bordDroit - largeur - 4, finTexte);
    ws.addImage(m.client.id, { tl: ancre(ws, x, (HAUTEUR_BANDEAU - hauteur) / 2), ext: { width: largeur, height: hauteur } });
  }
}

/** Volets figés cohérents (la cellule de départ doit être juste sous la zone figée, sinon Excel refuse le fichier) */
function figer(ws: ExcelJS.Worksheet, lignes: number, colonnes = 0) {
  if (lignes <= 0 && colonnes <= 0) { ws.views = []; return; }
  const depart = `${ws.getColumn(colonnes + 1).letter}${lignes + 1}`;
  ws.views = [{ state: "frozen", xSplit: colonnes, ySplit: lignes, topLeftCell: depart, activeCell: depart }];
}

/** Style de la ligne des titres de colonnes (blanc sur orange) */
export function styliserTitres(ws: ExcelJS.Worksheet, ligne: number, nb: number, couleur = ORANGE) {
  const row = ws.getRow(ligne);
  row.height = 22;
  for (let c = 1; c <= nb; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: couleur } };
    cell.alignment = { vertical: "middle" };
  }
}

/**
 * Classeur aux couleurs FRANEO RH : chaque feuille créée par `feuille()` a ses 3 lignes d'en-tête réservées,
 * on écrit les données à partir de la ligne 4 (addRow), puis `terminer()` pose les logos et renvoie le fichier.
 */
export async function classeurMarque(opts: OptionsMarque = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FRANEO RH";
  wb.created = new Date();
  const marque = await preparerMarque(wb, opts);
  const feuille = (nom: string) => {
    const ws = wb.addWorksheet(nomFeuille(nom));
    reserverEntete(ws);
    return ws;
  };
  return {
    wb,
    feuille,
    /** Tableau simple : titres de colonnes ligne 4 (stylés et figés), données dessous */
    tableau(nom: string, lignes: unknown[][], couleur?: string) {
      const ws = feuille(nom);
      remplirTableau(ws, lignes, couleur);
      return ws;
    },
    async terminer(): Promise<Buffer> {
      for (const ws of wb.worksheets) poserEntete(ws, marque);
      return Buffer.from(await wb.xlsx.writeBuffer());
    },
  };
}

/** Écrit un tableau (première ligne = titres) à partir de la ligne 4 d'une feuille préparée */
export function remplirTableau(ws: ExcelJS.Worksheet, lignes: unknown[][], couleur?: string) {
  const donnees = lignes.length > 1 ? lignes : [...(lignes.length ? lignes : [["Information"]]), ["Aucune donnée"]];
  for (const l of donnees) ws.addRow(l.map((v) => (v === null || v === undefined ? "" : v)));
  const nb = Math.max(...donnees.map((l) => l.length), 1);
  styliserTitres(ws, LIGNE_TITRES, nb, couleur);
  for (let i = 0; i < nb; i++) {
    const max = Math.max(...donnees.slice(0, 300).map((l) => String(l[i] ?? "").length));
    ws.getColumn(i + 1).width = Math.min(Math.max(max + 2, 10), 60);
  }
  figer(ws, LIGNE_TITRES);
}

/** Fichier Excel « tableau » (première ligne = titres de colonnes), avec en-têtes stylés et logos */
export async function excelDepuisLignes(feuille: string, lignes: unknown[][], opts: OptionsMarque = {}): Promise<Buffer> {
  const c = await classeurMarque(opts);
  c.tableau(feuille || "Export", lignes);
  return c.terminer();
}

/**
 * Ajoute l'en-tête FRANEO RH à un fichier Excel déjà fabriqué (par la bibliothèque « xlsx »).
 * Les lignes existantes descendent de 3 lignes ; la ligne des titres de colonnes est stylée et figée.
 */
export async function brander(contenu: Buffer | Uint8Array | ArrayBuffer, opts: OptionsMarque = {}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(contenu as any);
  const marque = await preparerMarque(wb, opts);

  for (const ws of wb.worksheets) {
    // Ligne des titres d'origine : première ligne avec au moins 2 cellules remplies
    let titres = 0;
    for (let r = 1; r <= Math.min(ws.rowCount, 20) && !titres; r++) {
      let pleines = 0;
      ws.getRow(r).eachCell((cell) => { if (String(cell.value ?? "").trim() !== "") pleines++; });
      if (pleines >= 2) titres = r;
    }
    const nb = ws.columnCount;
    ws.spliceRows(1, 0, [], [], []);
    poserEntete(ws, marque);
    if (titres) {
      const ligne = titres + LIGNES_ENTETE;
      // On ne restyle pas une ligne déjà mise en forme
      const deja = ws.getRow(ligne).getCell(1).fill as { fgColor?: unknown } | undefined;
      if (!deja?.fgColor) styliserTitres(ws, ligne, nb);
      figer(ws, ligne);
    } else {
      figer(ws, 0);
    }
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Réponse HTTP de téléchargement d'un fichier Excel */
export function reponseExcel(buffer: Buffer, nomFichier: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomFichier.replace(/\.(csv|xlsx)$/i, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.-]+/g, "-")}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Imports : index (0 = première ligne) de la ligne des titres de colonnes, en sautant l'en-tête FRANEO RH */
export function indexLigneTitres(lignes: unknown[][]): number {
  const i = lignes.findIndex((l) => (l ?? []).filter((v) => String(v ?? "").trim() !== "").length >= 2);
  return i < 0 ? 0 : i;
}
