import { NextRequest, NextResponse } from "next/server";
import { enregistrerFichier, ErreurStockage } from "@/lib/stockage";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { lireFichier } from "@/lib/fichiers";

async function salarieAutorise(salarieId: string) {
  const session = await getSession();
  if (!session) return { session: null, salarie: null };
  if (session.role === "CLIENT" && !aDroit(session.entreprise?.permissions, "rh.documents")) return { session, salarie: null };
  const salarie = await prisma.salarie.findUnique({ where: { id: salarieId }, select: { id: true, entrepriseId: true, prenom: true, nom: true } });
  if (!salarie || (session.role === "CLIENT" && salarie.entrepriseId !== session.entrepriseId)) return { session, salarie: null };
  return { session, salarie };
}

/** GET ?salarieId= : documents d'un salarié (sans le contenu) */
export async function GET(request: NextRequest) {
  const { session, salarie } = await salarieAutorise(request.nextUrl.searchParams.get("salarieId") || "");
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (!salarie) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const docs = await prisma.document.findMany({
    where: { salarieId: salarie.id },
    select: { id: true, nom: true, type: true, dateAjout: true, mime: true, taille: true, rappelId: true, auteur: true, url: true },
    orderBy: { dateAjout: "desc" },
  });
  return NextResponse.json(docs);
}

/** POST (formulaire) : salarieId, fichier, type, rappelId?, traiter? (« 1 » : l'échéance liée est marquée traitée) */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ erreur: "Formulaire invalide" }, { status: 400 });
  const { session, salarie } = await salarieAutorise(String(form.get("salarieId") || ""));
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (!salarie) return NextResponse.json({ erreur: "Salarié introuvable" }, { status: 404 });
  const lu = await lireFichier(form.get("fichier"));
  if ("erreur" in lu) return NextResponse.json({ erreur: lu.erreur }, { status: 400 });

  const rappelId = String(form.get("rappelId") || "") || null;
  if (rappelId) {
    const r = await prisma.rappelSalarie.findUnique({ where: { id: rappelId }, select: { salarieId: true } });
    if (!r || r.salarieId !== salarie.id) return NextResponse.json({ erreur: "Échéance introuvable" }, { status: 400 });
  }
  const type = String(form.get("type") || "AUTRE").slice(0, 40);
  let stocke: { cle: string | null; contenu: Buffer | null };
  try {
    stocke = await enregistrerFichier(`documents/${salarie.entrepriseId}`, lu.fichier.nom, lu.fichier.mime, lu.fichier.contenu);
  } catch (e) {
    return NextResponse.json({ erreur: e instanceof ErreurStockage ? e.message : "Envoi du fichier impossible." }, { status: 502 });
  }
  const doc = await prisma.document.create({
    data: {
      salarieId: salarie.id, nom: lu.fichier.nom, type, contenu: stocke.contenu, cle: stocke.cle, mime: lu.fichier.mime, taille: lu.fichier.taille,
      rappelId, auteur: session.role === "ADMIN" ? "FRANEO RH" : session.prenom,
    },
    select: { id: true },
  });
  if (rappelId && form.get("traiter") === "1") {
    await prisma.rappelSalarie.update({ where: { id: rappelId }, data: { traite: true, traiteAt: new Date() } });
  }
  return NextResponse.json({ succes: true, id: doc.id });
}
