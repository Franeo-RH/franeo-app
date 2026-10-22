import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const abonnements = await prisma.abonnement.findMany({
    orderBy: { prixMensuel: "asc" },
  });

  return NextResponse.json(abonnements);
}