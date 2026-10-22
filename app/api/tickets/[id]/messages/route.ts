import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const { contenu, auteur, role } = await request.json();

  const message = await prisma.messageTicket.create({
    data: {
      contenu,
      auteur,
      role,
      ticketId: id,
    },
  });

  return NextResponse.json({ succes: true, message });
}