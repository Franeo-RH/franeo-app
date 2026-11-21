import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { journaliser } from "@/lib/journal";

/**
 * POST (admin) : ajoute une remise datée { libelle, type: POURCENT|MONTANT, valeur, portee: ABONNEMENTS|TOUT, debut: "AAAA-MM", nbMois? }
 * DELETE (admin) ?remiseId=… : supprime une remise
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const b = await request.json().catch(() => ({}));

  const type = b.type === "MONTANT" ? "MONTANT" : "POURCENT";
  const valeur = parseFloat(String(b.valeur ?? "").replace(",", "."));
  if (!Number.isFinite(valeur) || valeur <= 0 || (type === "POURCENT" && valeur > 100) || valeur > 100000) {
    return NextResponse.json({ erreur: type === "POURCENT" ? "Indiquez un pourcentage entre 0 et 100." : "Indiquez un montant positif." }, { status: 400 });
  }
  const m = /^(\d{4})-(\d{2})$/.exec(String(b.debut || ""));
  if (!m || +m[2] < 1 || +m[2] > 12) return NextResponse.json({ erreur: "Mois de début invalide." }, { status: 400 });
  const nbMois = b.nbMois === "" || b.nbMois == null ? null : parseInt(String(b.nbMois), 10);
  if (nbMois != null && (!Number.isFinite(nbMois) || nbMois < 1 || nbMois > 120)) return NextResponse.json({ erreur: "Durée invalide (1 à 120 mois, ou vide pour sans fin)." }, { status: 400 });
  const libelle = (typeof b.libelle === "string" && b.libelle.trim() ? b.libelle.trim() : "Remise commerciale").slice(0, 120);
  const motif = ["COMMERCIALE", "PARRAINAGE", "FILLEUL"].includes(b.motif) ? b.motif : "COMMERCIALE";

  const entreprise = await prisma.entreprise.findUnique({ where: { id }, select: { id: true } });
  if (!entreprise) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });

  let remise;
  try {
    remise = await prisma.remise.create({
      data: { entrepriseId: id, libelle, motif, type, valeur, portee: b.portee === "TOUT" ? "TOUT" : "ABONNEMENTS", moisDebut: +m[2], anneeDebut: +m[1], nbMois, creePar: session.email },
    });
  } catch (e) {
    return NextResponse.json({ erreur: `Enregistrement impossible : la base n'est pas à jour (lancez « npx prisma db push »). ${String((e as Error)?.message || "").slice(0, 120)}` }, { status: 500 });
  }
  await journaliser(id, session.email, "Remise", `${libelle} : ${valeur}${type === "MONTANT" ? " €/mois" : " %"} dès ${m[2]}/${m[1]}${nbMois ? ` pendant ${nbMois} mois` : " (sans fin)"}`);
  return NextResponse.json({ succes: true, remise });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const remiseId = request.nextUrl.searchParams.get("remiseId") || "";
  const r = await prisma.remise.findFirst({ where: { id: remiseId, entrepriseId: id } });
  if (!r) return NextResponse.json({ erreur: "Remise introuvable" }, { status: 404 });
  await prisma.remise.delete({ where: { id: r.id } });
  await journaliser(id, session.email, "Remise", `Remise supprimée : ${r.libelle}`);
  return NextResponse.json({ succes: true });
}
