import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { oublierMaintenance } from "@/lib/maintenance";

// PUT (admin) : bloquer / rouvrir l'application, programmer et annoncer une maintenance
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
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
