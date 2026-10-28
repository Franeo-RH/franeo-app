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
  const { titre, contenu, cible, entrepriseId, importante } = await request.json();
  if (!titre?.trim() || !contenu?.trim()) return NextResponse.json({ erreur: "Titre et message sont obligatoires" }, { status: 400 });
  if (!CIBLES.some((c) => c.value === cible)) return NextResponse.json({ erreur: "Destinataires invalides" }, { status: 400 });
  if (entrepriseId) {
    const ent = await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { id: true } });
    if (!ent) return NextResponse.json({ erreur: "Entreprise introuvable" }, { status: 404 });
  }
  const com = await prisma.communication.create({
    data: { titre: titre.trim(), contenu: contenu.trim(), cible, entrepriseId: entrepriseId || null, importante: !!importante },
  });
  return NextResponse.json({ succes: true, communication: com });
}
