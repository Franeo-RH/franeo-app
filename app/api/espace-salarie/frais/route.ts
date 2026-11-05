import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";

/** GET : mes notes de frais ; POST { date, montant, motif } : nouvelle note (sans justificatif stocké) */
export async function GET() {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  const frais = await prisma.noteFrais.findMany({ where: { salarieId: s.salarie.id }, orderBy: { date: "desc" }, take: 50 });
  return NextResponse.json(frais);
}

export async function POST(request: NextRequest) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  const { date, montant, motif } = await request.json().catch(() => ({}));
  const m = parseFloat(String(montant ?? "").replace(",", "."));
  const d = typeof date === "string" ? new Date(`${date}T12:00:00`) : null;
  if (!d || isNaN(d.getTime())) return NextResponse.json({ erreur: "Date invalide" }, { status: 400 });
  if (!Number.isFinite(m) || m <= 0 || m > 10000) return NextResponse.json({ erreur: "Montant invalide" }, { status: 400 });
  if (typeof motif !== "string" || !motif.trim()) return NextResponse.json({ erreur: "Indiquez le motif de la dépense." }, { status: 400 });
  const f = await prisma.noteFrais.create({
    data: { salarieId: s.salarie.id, entrepriseId: s.utilisateur.entrepriseId!, date: d, montant: Math.round(m * 100) / 100, motif: motif.trim().slice(0, 200) },
  });
  return NextResponse.json({ succes: true, frais: f });
}

/** DELETE ?id= : le salarié retire une note encore en attente */
export async function DELETE(request: NextRequest) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id") || "";
  const f = await prisma.noteFrais.findUnique({ where: { id } });
  if (!f || f.salarieId !== s.salarie.id) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  if (f.statut !== "En attente") return NextResponse.json({ erreur: "Note déjà traitée." }, { status: 400 });
  await prisma.noteFrais.delete({ where: { id } });
  return NextResponse.json({ succes: true });
}
