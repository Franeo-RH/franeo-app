import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, oublierSessions } from "@/lib/session";
import { creerCollaborateur, droitsCollaborateur } from "@/lib/cabinet";
import { envoyerActivation } from "@/lib/invitation";

type Ctx = { params: Promise<{ id: string }> };
const texte = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const nombre = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

/**
 * PATCH (admin), selon `action` :
 *  - "infos"         : nom, coordonnées, actif
 *  - "tarif"         : tarif sur mesure (forfait, prix par client, remise %, note)
 *  - "clients"       : entreprises suivies par le cabinet (liste complète)
 *  - "collaborateur" : inviter (sans id) ou modifier un collaborateur (id), renvoyer l'invitation (relancer)
 */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const cabinet = await prisma.cabinet.findUnique({ where: { id }, select: { id: true, nom: true } });
  if (!cabinet) return NextResponse.json({ erreur: "Cabinet introuvable" }, { status: 404 });
  const b = await request.json().catch(() => ({}));

  if (b.action === "infos") {
    const nom = texte(b.nom);
    if (!nom) return NextResponse.json({ erreur: "Le nom est obligatoire." }, { status: 400 });
    await prisma.cabinet.update({
      where: { id },
      data: { nom, siret: texte(b.siret, 20), email: texte(b.email), telephone: texte(b.telephone, 30), ville: texte(b.ville, 100), ...(typeof b.actif === "boolean" ? { actif: b.actif } : {}) },
    });
    oublierSessions();
    return NextResponse.json({ succes: true });
  }

  if (b.action === "tarif") {
    const remise = nombre(b.tarifRemise);
    if (remise !== null && remise > 100) return NextResponse.json({ erreur: "La remise ne peut pas dépasser 100 %." }, { status: 400 });
    await prisma.cabinet.update({
      where: { id },
      data: { tarifForfait: nombre(b.tarifForfait), tarifParClient: nombre(b.tarifParClient), tarifRemise: remise, tarifNote: texte(b.tarifNote, 1000) },
    });
    return NextResponse.json({ succes: true });
  }

  if (b.action === "clients") {
    const ids = Array.isArray(b.entreprises) ? b.entreprises.filter((x: unknown): x is string => typeof x === "string") : [];
    await prisma.$transaction([
      prisma.entreprise.updateMany({ where: { cabinetId: id, id: { notIn: ids } }, data: { cabinetId: null } }),
      prisma.entreprise.updateMany({ where: { id: { in: ids }, demo: false }, data: { cabinetId: id } }),
    ]);
    oublierSessions();
    return NextResponse.json({ succes: true });
  }

  if (b.action === "collaborateur") {
    if (!b.id) {
      const r = await creerCollaborateur(request, id, b);
      if (!r.ok) return NextResponse.json({ erreur: r.erreur }, { status: r.statut });
      return NextResponse.json({ succes: true, mailEnvoye: r.mailEnvoye, lien: r.lien });
    }
    const u = await prisma.utilisateur.findFirst({ where: { id: String(b.id), role: "CABINET", cabinetId: id } });
    if (!u) return NextResponse.json({ erreur: "Collaborateur introuvable" }, { status: 404 });
    if (b.relancer) {
      const a = await envoyerActivation(request, { email: u.email, prenom: u.prenom, cabinet: cabinet.nom, relance: true });
      return NextResponse.json({ succes: true, ...a });
    }
    const droits = await droitsCollaborateur(id, { profil: b.profil ?? u.profilCabinet, clients: b.clients ?? u.clientsCabinet, gerant: b.gerant ?? u.cabinetGerant });
    await prisma.utilisateur.update({ where: { id: u.id }, data: { ...droits, ...(typeof b.actif === "boolean" ? { actif: b.actif } : {}) } });
    oublierSessions(u.id);
    return NextResponse.json({ succes: true });
  }

  return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
}

// DELETE (admin) : supprime le cabinet (ses clients restent, sans cabinet ; ses comptes sont supprimés)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const c = await prisma.cabinet.findUnique({ where: { id }, select: { demo: true } });
  if (!c) return NextResponse.json({ erreur: "Cabinet introuvable" }, { status: 404 });
  if (c.demo) return NextResponse.json({ erreur: "Le cabinet de démonstration ne peut pas être supprimé." }, { status: 400 });
  await prisma.$transaction([
    prisma.entreprise.updateMany({ where: { cabinetId: id }, data: { cabinetId: null } }),
    prisma.utilisateur.deleteMany({ where: { cabinetId: id, role: "CABINET" } }),
    prisma.cabinet.delete({ where: { id } }),
  ]);
  oublierSessions();
  return NextResponse.json({ succes: true });
}
