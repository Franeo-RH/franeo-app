import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionBrute } from "@/lib/session";

/** POST : la présentation guidée a été vue (ou passée) : elle ne s'affichera plus à la connexion */
export async function POST() {
  const s = await getSessionBrute();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("fr_visite", "", { path: "/", maxAge: 0 });
  if (!s || s.entreprise?.demo || s.cabinet?.demo) return res;
  await prisma.utilisateur.update({ where: { id: s.id }, data: { visiteVueLe: new Date() } }).catch(() => undefined);
  return res;
}
