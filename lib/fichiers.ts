// Fichiers déposés dans l'app (documents salariés, pièces jointes, modèles de contrat).
// Ils sont stockés dans la base : 4 Mo maximum par fichier (limite d'envoi de Vercel).
import { NextResponse } from "next/server";

export const TAILLE_MAX = 4 * 1024 * 1024;

const TYPES_OK = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
]);
const EXT_OK = /\.(pdf|jpe?g|png|webp|heic|docx?|xlsx?|txt|csv)$/i;

export type FichierLu = { nom: string; mime: string; taille: number; contenu: Buffer };

/** Lit un fichier d'un formulaire et vérifie sa taille et son type */
export async function lireFichier(f: FormDataEntryValue | null, extensions: RegExp = EXT_OK): Promise<{ fichier: FichierLu } | { erreur: string }> {
  if (!f || typeof f === "string") return { erreur: "Aucun fichier reçu." };
  if (f.size === 0) return { erreur: "Le fichier est vide." };
  if (f.size > TAILLE_MAX) return { erreur: "Fichier trop lourd : 4 Mo maximum." };
  const nom = (f.name || "fichier").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 150);
  if (!extensions.test(nom) || (f.type && !TYPES_OK.has(f.type) && f.type !== "application/octet-stream")) {
    return { erreur: "Type de fichier non accepté (PDF, image, Word, Excel, texte)." };
  }
  return { fichier: { nom, mime: f.type || "application/octet-stream", taille: f.size, contenu: Buffer.from(await f.arrayBuffer()) } };
}

/** Réponse de téléchargement d'un fichier stocké */
export function telecharger(contenu: Uint8Array | Buffer, nom: string, mime: string, enLigne = false) {
  return new NextResponse(new Uint8Array(contenu), {
    headers: {
      "Content-Type": mime || "application/octet-stream",
      "Content-Disposition": `${enLigne ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(nom)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
