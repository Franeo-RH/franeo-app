import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesProjets } from "@/lib/projets-serveur";
import { coutHoraire } from "@/lib/projets";

/** GET : coût horaire chargé de chaque salarié (calculé ou standard) */
export async function GET() {
  const a = await accesProjets("projets.couts");
  if (!a.ok) return a.refus;
  const [e, salaries] = await Promise.all([
    prisma.entreprise.findUnique({ where: { id: a.entrepriseId }, select: { tauxCharges: true } }),
    prisma.salarie.findMany({ where: { entrepriseId: a.entrepriseId, statut: "Actif" }, select: { id: true, prenom: true, nom: true, poste: true, salaireMensuel: true, heuresHebdomadaires: true, coutHoraireStandard: true }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
  ]);
  return NextResponse.json({
    tauxCharges: e?.tauxCharges ?? 40,
    salaries: salaries.map((s) => ({
      id: s.id, salarie: `${s.prenom} ${s.nom}`, poste: s.poste, coutStandard: s.coutHoraireStandard,
      coutCalcule: coutHoraire({ salaireMensuel: s.salaireMensuel, heuresHebdomadaires: s.heuresHebdomadaires }, e?.tauxCharges),
    })),
  });
}

/** PUT { salarieId, coutStandard } : fixe (ou efface avec null) le coût horaire standard d'un salarié */
export async function PUT(request: NextRequest) {
  const a = await accesProjets("projets.couts");
  if (!a.ok) return a.refus;
  if (!a.peutGerer) return NextResponse.json({ erreur: "Action non autorisée" }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const v = b.coutStandard === "" || b.coutStandard == null ? null : Number(b.coutStandard);
  if (v != null && (!Number.isFinite(v) || v <= 0 || v > 1000)) return NextResponse.json({ erreur: "Coût horaire invalide" }, { status: 400 });
  const r = await prisma.salarie.updateMany({ where: { id: String(b.salarieId), entrepriseId: a.entrepriseId }, data: { coutHoraireStandard: v } });
  if (!r.count) return NextResponse.json({ erreur: "Salarié introuvable" }, { status: 404 });
  return NextResponse.json({ succes: true });
}
