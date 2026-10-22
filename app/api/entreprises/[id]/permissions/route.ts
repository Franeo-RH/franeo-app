import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const { moduleId, actif } = await request.json();

  const entreprise = await prisma.entreprise.findUnique({ where: { id } });
  if (!entreprise) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });

  let permissions = [...entreprise.permissions];

  if (actif && !permissions.includes(moduleId)) {
    permissions.push(moduleId);
  } else if (!actif) {
    permissions = permissions.filter(p => p !== moduleId);
  }

  await prisma.entreprise.update({
    where: { id },
    data: { permissions },
  });

  return NextResponse.json({ succes: true, permissions });
}