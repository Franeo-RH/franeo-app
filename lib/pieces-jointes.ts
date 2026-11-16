// lib/pieces-jointes.ts
// Pièces jointes des échanges (devis, demandes complémentaires) : envoi, liste, suppression des fichiers.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enregistrerFichier, ErreurStockage, supprimerFichierStocke } from "@/lib/stockage";
import { lireFichier } from "@/lib/fichiers";

export const MAX_PJ = 15;
export const SELECT_PJ = { id: true, nom: true, taille: true, auteur: true, role: true, createdAt: true } as const;
export type { PieceJointeVue } from "@/lib/devis";

type Cible = { devisId: string } | { demandeServiceId: string } | { accidentId: string };

/** Ajoute le fichier du formulaire (champ « fichier ») à un devis ou une demande ; renvoie une réponse HTTP */
export async function ajouterPieceJointe(request: Request, cible: Cible, entrepriseId: string, session: { role: string; prenom: string }) {
  const n = await prisma.pieceJointe.count({ where: cible });
  if (n >= MAX_PJ) return NextResponse.json({ erreur: `${MAX_PJ} pièces jointes maximum.` }, { status: 400 });
  const form = await request.formData().catch(() => null);
  const lu = await lireFichier(form?.get("fichier") ?? null);
  if ("erreur" in lu) return NextResponse.json({ erreur: lu.erreur }, { status: 400 });
  let stocke: { cle: string | null; contenu: Buffer | null };
  try {
    stocke = await enregistrerFichier(`pieces-jointes/${entrepriseId}`, lu.fichier.nom, lu.fichier.mime, lu.fichier.contenu);
  } catch (e) {
    return NextResponse.json({ erreur: e instanceof ErreurStockage ? e.message : "Envoi du fichier impossible." }, { status: 502 });
  }
  const pj = await prisma.pieceJointe.create({
    data: {
      entrepriseId, ...cible, nom: lu.fichier.nom, mime: lu.fichier.mime, taille: lu.fichier.taille, contenu: stocke.contenu, cle: stocke.cle,
      auteur: session.role === "ADMIN" ? "FRANEO RH" : session.prenom, role: session.role,
    },
    select: { id: true, nom: true },
  });
  return NextResponse.json({ succes: true, id: pj.id, nom: pj.nom });
}

/** Avant de supprimer un devis ou une demande : retire aussi ses fichiers du stockage OVH */
export async function supprimerFichiersDe(cible: Cible) {
  const pjs = await prisma.pieceJointe.findMany({ where: cible, select: { cle: true } });
  for (const p of pjs) await supprimerFichierStocke(p.cle);
}
