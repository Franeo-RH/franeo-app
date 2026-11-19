import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { CIBLES } from "@/lib/communications-cibles";

// GET (admin) : toutes les communications avec le nombre de lectures
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const coms = await prisma.communication.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      entreprise: { select: { nom: true } },
      lectures: { select: { luAt: true, utilisateur: { select: { prenom: true, email: true, role: true, entreprise: { select: { nom: true } } } } }, orderBy: { luAt: "desc" } },
    },
  });
  return NextResponse.json(coms);
}

// POST (admin) : publier une communication
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { titre, contenu, cible, entrepriseId, importante, publieLe, expireLe } = await request.json();
  const dateOuNull = (v: unknown) => { if (typeof v !== "string" || !v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };
  const debut = dateOuNull(publieLe), fin = dateOuNull(expireLe);
  if (debut && fin && fin <= debut) return NextResponse.json({ erreur: "La date de retrait doit être après la date de publication." }, { status: 400 });
  if (!titre?.trim() || !contenu?.trim()) return NextResponse.json({ erreur: "Titre et message sont obligatoires" }, { status: 400 });
  if (!CIBLES.some((c) => c.value === cible)) return NextResponse.json({ erreur: "Destinataires invalides" }, { status: 400 });
  if (entrepriseId) {
    const ent = await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { id: true } });
    if (!ent) return NextResponse.json({ erreur: "Entreprise introuvable" }, { status: 404 });
  }
  const com = await prisma.communication.create({
    data: { titre: titre.trim(), contenu: contenu.trim(), cible, entrepriseId: entrepriseId || null, importante: !!importante, publieLe: debut, expireLe: fin },
  });
  return NextResponse.json({ succes: true, communication: com });
}
