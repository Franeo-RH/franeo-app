import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { periodeDepuis, VIEW_HR_INDICATORS } from "@/lib/indicateurs-calculs";
import type { FiltresRH } from "@/lib/indicateurs-rh";

/** Vérifie le droit VIEW_HR_INDICATORS et lit les filtres de l'adresse. L'admin a toujours accès. */
export async function lireFiltres(request: NextRequest): Promise<{ erreur: NextResponse } | { filtres: FiltresRH; admin: boolean }> {
  const session = await getSession();
  if (!session) return { erreur: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  const admin = session.role === "ADMIN";
  if (!admin && !(session.entreprise?.permissions || []).includes(VIEW_HR_INDICATORS)) {
    return { erreur: NextResponse.json({ erreur: "Les indicateurs RH ne sont pas activés pour votre compte." }, { status: 403 }) };
  }
  const p = request.nextUrl.searchParams;
  let entreprises: string[];
  if (admin) {
    const companyId = p.get("companyId");
    entreprises = companyId
      ? [companyId]
      : (await prisma.entreprise.findMany({ where: { demo: false }, select: { id: true } })).map((e) => e.id);
  } else {
    entreprises = [session.entrepriseId!];
  }
  const statut = p.get("status");
  return {
    admin,
    filtres: {
      periode: periodeDepuis(p.get("period"), p.get("startDate"), p.get("endDate")),
      entreprises,
      etablissement: p.get("establishmentId") || null,
      service: p.get("departmentId") || null,
      salarieId: p.get("employeeId") || null,
      contrat: p.get("contractType") || null,
      statut: statut === "Actif" || statut === "Sorti" ? statut : null,
    },
  };
}
