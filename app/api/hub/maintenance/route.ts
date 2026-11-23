import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";
import { etatMaintenance, oublierMaintenance } from "@/lib/maintenance";

export const dynamic = "force-dynamic";
const refus = () => NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

/** GET (portail) : état de la maintenance de l'app */
export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  return NextResponse.json(await etatMaintenance());
}

/** PUT (portail) { active, message?, debut?, fin? } : bloquer / rouvrir, ou annoncer une maintenance programmée */
export async function PUT(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const b = await request.json().catch(() => ({}));
  const date = (v: unknown) => { if (typeof v !== "string" || !v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };
  const debut = date(b.debut), fin = date(b.fin);
  if (debut && fin && fin <= debut) return NextResponse.json({ erreur: "La fin doit être après le début." }, { status: 400 });
  const data = {
    maintenanceActive: b.active === true,
    maintenanceMessage: typeof b.message === "string" && b.message.trim() ? b.message.trim().slice(0, 1000) : null,
    maintenanceDebut: b.active === true ? null : debut,
    maintenanceFin: fin,
  };
  await prisma.reglageApp.upsert({ where: { id: "global" }, create: { id: "global", ...data }, update: data });
  oublierMaintenance();
  return NextResponse.json({ succes: true });
}
