// Stockage des fichiers (documents salariés, pièces jointes, modèles de contrat).
// Si les variables OVH_S3_* sont définies : fichiers sur OVH Object Storage (S3, données en France).
// Sinon : repli dans la base (comme avant), pour que l'app fonctionne toujours.
import { randomUUID } from "crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

let client: S3Client | null = null;

export function stockageOVH(): boolean {
  return !!(process.env.OVH_S3_ENDPOINT && process.env.OVH_S3_BUCKET && process.env.OVH_S3_ACCESS_KEY && process.env.OVH_S3_SECRET_KEY);
}

function s3() {
  if (!client) {
    client = new S3Client({
      endpoint: process.env.OVH_S3_ENDPOINT,
      region: process.env.OVH_S3_REGION || "gra",
      forcePathStyle: true,
      credentials: { accessKeyId: process.env.OVH_S3_ACCESS_KEY!, secretAccessKey: process.env.OVH_S3_SECRET_KEY! },
    });
  }
  return client;
}

/**
 * Enregistre un fichier. Renvoie soit { cle } (OVH), soit { contenu } (base) à mettre dans la ligne Prisma.
 * dossier : « documents/<entrepriseId> », « pieces-jointes/<entrepriseId> », « contrats/<entrepriseId> »
 */
export async function enregistrerFichier(dossier: string, nom: string, mime: string, contenu: Buffer): Promise<{ cle: string | null; contenu: Buffer | null }> {
  if (!stockageOVH()) return { cle: null, contenu };
  const extension = (nom.match(/\.[A-Za-z0-9]{1,6}$/)?.[0] || "").toLowerCase();
  const cle = `${dossier}/${randomUUID()}${extension}`;
  await s3().send(new PutObjectCommand({ Bucket: process.env.OVH_S3_BUCKET, Key: cle, Body: contenu, ContentType: mime || "application/octet-stream" }));
  return { cle, contenu: null };
}

/** Relit un fichier, qu'il soit sur OVH (cle) ou dans la base (contenu) */
export async function lireFichierStocke(f: { cle?: string | null; contenu?: Uint8Array | Buffer | null }): Promise<Uint8Array | null> {
  if (f.cle && stockageOVH()) {
    const r = await s3().send(new GetObjectCommand({ Bucket: process.env.OVH_S3_BUCKET, Key: f.cle }));
    return r.Body ? await r.Body.transformToByteArray() : null;
  }
  return f.contenu ? new Uint8Array(f.contenu) : null;
}

/** Supprime le fichier sur OVH (ne bloque jamais la suppression de la ligne en base) */
export async function supprimerFichierStocke(cle?: string | null) {
  if (!cle || !stockageOVH()) return;
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: process.env.OVH_S3_BUCKET, Key: cle }));
  } catch (e) {
    console.error("Suppression OVH impossible :", e);
  }
}
