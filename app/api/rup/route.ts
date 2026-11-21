import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { salarieVisible } from "@/lib/perimetre";

/** PATCH { salarieId, sexe: F|M|"" } : complète le sexe d'un salarié depuis le registre */
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const s = await prisma.salarie.findUnique({ where: { id: String(b.salarieId || "") }, select: { id: true, entrepriseId: true, etablissement: true } });
  const ok = s && (session.role === "ADMIN" || (session.role === "CLIENT" && s.entrepriseId === session.entrepriseId && salarieVisible(session, s) && aDroit(session.entreprise?.permissions, "salaries.modifier")));
  if (!ok) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const sexe = b.sexe === "F" || b.sexe === "M" ? b.sexe : null;
  try {
    await prisma.salarie.update({ where: { id: s.id }, data: { sexe } });
  } catch {
    return NextResponse.json({ erreur: "La base n'est pas à jour : lancez « npx prisma db push »." }, { status: 500 });
  }
  return NextResponse.json({ succes: true });
}
