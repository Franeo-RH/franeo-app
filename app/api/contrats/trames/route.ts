import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aAccesContrats } from "@/lib/droits";
import { lireFichier } from "@/lib/fichiers";

async function acces() {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return { session: null, refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  if (!aAccesContrats(session.entreprise)) return { session: null, refus: NextResponse.json({ erreur: "Les contrats automatiques sont inclus à partir de la formule RH Sérénité." }, { status: 403 }) };
  return { session, refus: null };
}

/** GET : modèles de contrat de l'entreprise */
export async function GET() {
  const { session, refus } = await acces();
  if (!session) return refus!;
  const l = await prisma.trameContrat.findMany({ where: { entrepriseId: session.entrepriseId! }, select: { id: true, nom: true, champs: true, taille: true, createdAt: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(l);
}

/** POST (formulaire) : fichier .docx, nom, champs (JSON, repérés dans le navigateur) */
export async function POST(request: NextRequest) {
  const { session, refus } = await acces();
  if (!session) return refus!;
  const form = await request.formData().catch(() => null);
  const lu = await lireFichier(form?.get("fichier") ?? null, /\.docx$/i);
  if ("erreur" in lu) return NextResponse.json({ erreur: lu.erreur === "Type de fichier non accepté (PDF, image, Word, Excel, texte)." ? "Le modèle doit être un fichier Word .docx." : lu.erreur }, { status: 400 });
  let champs: string[] = [];
  try { champs = (JSON.parse(String(form?.get("champs") || "[]")) as unknown[]).filter((c): c is string => typeof c === "string").slice(0, 200); } catch {}
  const nom = String(form?.get("nom") || lu.fichier.nom.replace(/\.docx$/i, "")).slice(0, 120);
  const n = await prisma.trameContrat.count({ where: { entrepriseId: session.entrepriseId! } });
  if (n >= 30) return NextResponse.json({ erreur: "30 modèles maximum : supprimez-en un." }, { status: 400 });
  const t = await prisma.trameContrat.create({ data: { entrepriseId: session.entrepriseId!, nom, champs, fichier: lu.fichier.contenu, taille: lu.fichier.taille }, select: { id: true } });
  return NextResponse.json({ succes: true, id: t.id });
}
