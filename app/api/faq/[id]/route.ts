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
  const { module, question, reponse, ordre, entrepriseId } = await request.json();

  const faq = await prisma.fAQ.update({
    where: { id },
    data: { module, question, reponse, ordre: Number(ordre) || 0, entrepriseId: entrepriseId || null },
  });

  return NextResponse.json({ succes: true, faq });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.fAQ.delete({ where: { id } });

  return NextResponse.json({ succes: true });
}