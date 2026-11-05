import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";
import { contexteHierarchie } from "@/lib/hierarchie";
import { deciderAbsence, deciderFrais, deciderReleve } from "@/lib/decisions";

/** PUT { type: "releve" | "absence" | "frais", id, statut: "Validé" | "Refusé", motif? } : décision d'un manager ou dirigeant */
export async function PUT(request: NextRequest) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  const ctx = await contexteHierarchie(s.salarie.id);
  if (!ctx || ctx.role === "SALARIE") return NextResponse.json({ erreur: "Réservé aux managers et dirigeants." }, { status: 403 });
  const { type, id, statut, motif } = await request.json().catch(() => ({}));
  if (typeof id !== "string" || (statut !== "Validé" && statut !== "Refusé")) return NextResponse.json({ erreur: "Demande invalide" }, { status: 400 });

  const cible =
    type === "releve" ? await prisma.releveMois.findUnique({ where: { id }, select: { salarieId: true } })
    : type === "absence" ? await prisma.absence.findUnique({ where: { id }, select: { salarieId: true } })
    : type === "frais" ? await prisma.noteFrais.findUnique({ where: { id }, select: { salarieId: true } })
    : null;
  if (!cible) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  if (!ctx.equipeIds.has(cible.salarieId)) return NextResponse.json({ erreur: "Ce salarié ne fait pas partie de votre équipe." }, { status: 403 });

  const auteur = `${s.salarie.prenom} ${s.salarie.nom}`;
  const res = type === "releve" ? await deciderReleve(id, statut, motif, auteur)
    : type === "absence" ? await deciderAbsence(id, statut, motif)
    : await deciderFrais(id, statut, motif, auteur);
  return res.ok ? NextResponse.json({ succes: true }) : NextResponse.json({ erreur: res.erreur }, { status: res.status });
}
