import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ACTIONS, MODULES } from "@/lib/droits";

const AUTORISES = new Set<string>([...MODULES.map((m) => m.id), ...ACTIONS.map((a) => `-${a.id}`)]);

// Accès & droits d'un client (modules visibles + actions retirées)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const corps = await request.json();

  const entreprise = await prisma.entreprise.findUnique({ where: { id } });
  if (!entreprise) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });

  let permissions: string[];
  if (Array.isArray(corps.permissions)) {
    // Liste complète envoyée par le bloc « Accès & droits »
    permissions = Array.from(new Set((corps.permissions as unknown[]).filter((p): p is string => typeof p === "string" && AUTORISES.has(p))));
  } else {
    // Ancien format : un module activé / désactivé
    permissions = [...entreprise.permissions];
    if (corps.actif && !permissions.includes(corps.moduleId)) permissions.push(corps.moduleId);
    else if (!corps.actif) permissions = permissions.filter((p) => p !== corps.moduleId);
  }

  await prisma.entreprise.update({ where: { id }, data: { permissions } });
  return NextResponse.json({ succes: true, permissions });
}
