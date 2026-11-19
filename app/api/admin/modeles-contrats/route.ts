import { NextRequest, NextResponse } from "next/server";
import { enregistrerFichier, ErreurStockage, supprimerFichierStocke } from "@/lib/stockage";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { lireFichier } from "@/lib/fichiers";

// Admin : modèles de contrat FRANEO RH, proposés à tous les clients (Gestion RH › Contrats)
async function admin() {
  const session = await getSession();
  return session?.role === "ADMIN" ? session : null;
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const l = await prisma.trameContrat.findMany({ where: { entrepriseId: null }, select: { id: true, nom: true, champs: true, taille: true, createdAt: true }, orderBy: { nom: "asc" } });
  return NextResponse.json(l);
}

/** POST (formulaire) : fichier .docx, nom, champs (repérés dans le navigateur), remplace (id d'un modèle à remplacer) */
export async function POST(request: NextRequest) {
  if (!(await admin())) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const lu = await lireFichier(form?.get("fichier") ?? null, /\.docx$/i);
  if ("erreur" in lu) return NextResponse.json({ erreur: "Le modèle doit être un fichier Word .docx." }, { status: 400 });
  let champs: string[] = [];
  try { champs = (JSON.parse(String(form?.get("champs") || "[]")) as unknown[]).filter((c): c is string => typeof c === "string").slice(0, 200); } catch {}
  const nom = String(form?.get("nom") || lu.fichier.nom.replace(/\.docx$/i, "")).trim().slice(0, 120) || "Modèle";
  let stocke: { cle: string | null; contenu: Buffer | null };
  try {
    stocke = await enregistrerFichier("contrats/franeo", lu.fichier.nom, lu.fichier.mime, lu.fichier.contenu);
  } catch (e) {
    return NextResponse.json({ erreur: e instanceof ErreurStockage ? e.message : "Envoi du fichier impossible." }, { status: 502 });
  }
  const remplace = String(form?.get("remplace") || "");
  if (remplace) {
    const ancien = await prisma.trameContrat.findFirst({ where: { id: remplace, entrepriseId: null } });
    if (!ancien) return NextResponse.json({ erreur: "Modèle introuvable" }, { status: 404 });
    await prisma.trameContrat.update({ where: { id: ancien.id }, data: { nom, champs, fichier: stocke.contenu, cle: stocke.cle, taille: lu.fichier.taille } });
    if (ancien.cle && ancien.cle !== stocke.cle) await supprimerFichierStocke(ancien.cle).catch(() => {});
    return NextResponse.json({ succes: true, id: ancien.id });
  }
  const t = await prisma.trameContrat.create({ data: { entrepriseId: null, nom, champs, fichier: stocke.contenu, cle: stocke.cle, taille: lu.fichier.taille }, select: { id: true } });
  return NextResponse.json({ succes: true, id: t.id });
}
