// app/api/admin/formules/route.ts
// Admin › Abonnements : modifier, créer et supprimer les formules RH et paie.
// PUT    { type: "rh" | "paie", id, nom, prixMensuel, inclus, prixSupp, tickets?, prixTicket }
// POST   { type: "rh", nom, prixMensuel, inclus, prixSupp, tickets, prixTicket } : nouvelle formule RH
// DELETE ?type=&id= : uniquement si aucun client ne l'utilise

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { cleRH } from "@/lib/textes-formules";

const nombre = (v: unknown, min = 0, max = 100000) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 100) / 100 : null;
};

function lire(b: Record<string, unknown>) {
  const nom = typeof b.nom === "string" ? b.nom.trim().slice(0, 60) : "";
  const v = { prixMensuel: nombre(b.prixMensuel), inclus: nombre(b.inclus, 0, 100000), prixSupp: nombre(b.prixSupp), tickets: nombre(b.tickets ?? 0, 0, 1000), prixTicket: nombre(b.prixTicket) };
  const erreur = !nom ? "Le nom est obligatoire." : Object.values(v).some((x) => x === null) ? "Vérifiez les montants (nombres positifs)." : null;
  return { nom, v: v as Record<keyof typeof v, number>, erreur };
}

async function admin() {
  const s = await getSession();
  return !!s && s.role === "ADMIN";
}

export async function PUT(request: NextRequest) {
  if (!(await admin())) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const { nom, v, erreur } = lire(b);
  if (erreur) return NextResponse.json({ erreur }, { status: 400 });
  const id = String(b.id || "");
  if (b.type === "rh") {
    // Formule renommée : ses textes personnalisés la suivent
    const avant = await prisma.abonnement.findUnique({ where: { id }, select: { nom: true } });
    if (avant && avant.nom !== nom) {
      const t = await prisma.texteFormule.findUnique({ where: { cle: cleRH(avant.nom) } });
      if (t) await prisma.$transaction([prisma.texteFormule.deleteMany({ where: { cle: cleRH(nom) } }), prisma.texteFormule.update({ where: { cle: t.cle }, data: { cle: cleRH(nom) } })]);
    }
    await prisma.abonnement.update({ where: { id }, data: { nom, prixMensuel: v.prixMensuel, salariesInclus: Math.round(v.inclus), prixSalarieSupp: v.prixSupp, ticketsRH: Math.round(v.tickets), prixTicketSupp: v.prixTicket } });
  } else if (b.type === "paie") {
    await prisma.abonnementPaie.update({ where: { id }, data: { nom: nom.replace(/^Paie\s+/i, ""), prixMensuel: v.prixMensuel, bulletinsInclus: Math.round(v.inclus), prixBulletinSupp: v.prixSupp, prixTicketSupp: v.prixTicket } });
  } else return NextResponse.json({ erreur: "Type inconnu" }, { status: 400 });
  return NextResponse.json({ succes: true });
}

export async function POST(request: NextRequest) {
  if (!(await admin())) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  if (b.type !== "rh") return NextResponse.json({ erreur: "Seules les formules RH peuvent être créées." }, { status: 400 });
  const { nom, v, erreur } = lire(b);
  if (erreur) return NextResponse.json({ erreur }, { status: 400 });
  if (await prisma.abonnement.findFirst({ where: { nom: { equals: nom, mode: "insensitive" } } })) return NextResponse.json({ erreur: "Une formule porte déjà ce nom." }, { status: 400 });
  const a = await prisma.abonnement.create({
    data: { nom, prixMensuel: v.prixMensuel, salariesInclus: Math.round(v.inclus), prixSalarieSupp: v.prixSupp, ticketsRH: Math.round(v.tickets), prixTicketSupp: v.prixTicket, features: [`Jusqu'à ${Math.round(v.inclus)} salariés inclus`, `${v.prixSupp} € / salarié supplémentaire`] },
  });
  return NextResponse.json({ succes: true, id: a.id });
}

export async function DELETE(request: NextRequest) {
  if (!(await admin())) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const p = request.nextUrl.searchParams;
  const id = p.get("id") || "";
  if (p.get("type") === "rh") {
    const n = await prisma.entreprise.count({ where: { abonnementId: id } });
    if (n) return NextResponse.json({ erreur: `${n} client(s) ont cette formule : changez-les de formule avant de la supprimer.` }, { status: 400 });
    await prisma.demandeEvolution.deleteMany({ where: { abonnementId: id } });
    await prisma.abonnement.delete({ where: { id } });
  } else if (p.get("type") === "paie") {
    const n = await prisma.entreprise.count({ where: { abonnementPaieId: id } });
    if (n) return NextResponse.json({ erreur: `${n} client(s) ont cette formule : changez-les de formule avant de la supprimer.` }, { status: 400 });
    await prisma.demandeEvolutionPaie.deleteMany({ where: { OR: [{ nouvelleFormuleId: id }, { ancienneFormuleId: id }] } });
    await prisma.abonnementPaie.delete({ where: { id } });
  } else return NextResponse.json({ erreur: "Type inconnu" }, { status: 400 });
  return NextResponse.json({ succes: true });
}
