// app/api/etablissements/acces/route.ts
// Accès « dirigeant d'établissement », gérés par le dirigeant général (ou l'admin FRANEO RH) :
// un compte client limité à un établissement (ses salariés, leurs absences, paie, relevés… et les projets de l'établissement).
// GET    : comptes + établissements
// POST   { prenom, email, etablissementId, voitSalaires } : crée l'accès et renvoie le lien de création du mot de passe
// PATCH  { id, actif?, etablissementId?, voitSalaires?, nouveauLien? }
// DELETE ?id= : supprime l'accès

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession, oublierSessions } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { estSessionDemo } from "@/lib/demo";
import { creerJetonLien, journaliser } from "@/lib/securite";

async function controle(request: NextRequest, entrepriseIdCorps?: unknown) {
  const session = await getSession();
  if (!session) return { ok: false as const, refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  if (session.role === "ADMIN") {
    const id = String(entrepriseIdCorps || request.nextUrl.searchParams.get("entrepriseId") || "");
    return id ? { ok: true as const, session, entrepriseId: id } : { ok: false as const, refus: NextResponse.json({ erreur: "Entreprise manquante" }, { status: 400 }) };
  }
  // Réservé au dirigeant général (un dirigeant d'établissement n'a pas « entreprise.modifier »)
  if (session.role !== "CLIENT" || !session.entrepriseId || session.etablissementId || !aDroit(session.entreprise?.permissions, "entreprise.modifier")) {
    return { ok: false as const, refus: NextResponse.json({ erreur: "Réservé au dirigeant de l'entreprise." }, { status: 403 }) };
  }
  return { ok: true as const, session, entrepriseId: session.entrepriseId };
}

const lienPour = async (request: NextRequest, email: string) => {
  const token = await creerJetonLien(email, 7 * 24 * 3600 * 1000);
  const base = (process.env.NEXT_PUBLIC_URL || process.env.APP_URL || request.nextUrl.origin).replace(/\/$/, "");
  return `${base}/reinitialiser-mot-de-passe?token=${token}`;
};

export async function GET(request: NextRequest) {
  const c = await controle(request);
  if (!c.ok) return c.refus;
  const [comptes, etablissements] = await Promise.all([
    prisma.utilisateur.findMany({
      where: { entrepriseId: c.entrepriseId, role: "CLIENT", etablissementId: { not: null } },
      select: { id: true, prenom: true, email: true, actif: true, createdAt: true, etablissementId: true, permissionsRetirees: true, etablissement: { select: { nom: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.etablissement.findMany({ where: { entrepriseId: c.entrepriseId }, select: { id: true, nom: true, siret: true }, orderBy: { nom: "asc" } }),
  ]);
  return NextResponse.json({
    comptes: comptes.map(({ permissionsRetirees, ...u }) => ({ ...u, voitSalaires: !permissionsRetirees.includes("salaries.salaires") })),
    etablissements,
  });
}

export async function POST(request: NextRequest) {
  const b = await request.json().catch(() => ({}));
  const c = await controle(request, b.entrepriseId);
  if (!c.ok) return c.refus;
  if (estSessionDemo(c.session)) return NextResponse.json({ erreur: "Non disponible dans la démo." }, { status: 403 });
  const prenom = typeof b.prenom === "string" ? b.prenom.trim().slice(0, 80) : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase().slice(0, 200) : "";
  if (!prenom || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ erreur: "Prénom et e-mail valides obligatoires." }, { status: 400 });
  const etab = await prisma.etablissement.findFirst({ where: { id: String(b.etablissementId || ""), entrepriseId: c.entrepriseId }, select: { id: true, nom: true } });
  if (!etab) return NextResponse.json({ erreur: "Choisissez l'établissement." }, { status: 400 });
  if (await prisma.utilisateur.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } })) {
    return NextResponse.json({ erreur: "Cet e-mail est déjà utilisé par un autre compte Franeo." }, { status: 409 });
  }
  await prisma.utilisateur.create({
    data: {
      email, prenom, role: "CLIENT", entrepriseId: c.entrepriseId, etablissementId: etab.id,
      permissionsRetirees: b.voitSalaires ? [] : ["salaries.salaires"],
      // mot de passe aléatoire inutilisable : la personne choisit le sien via le lien
      motDePasse: await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12),
    },
  });
  await journaliser({ action: "DROITS", utilisateur: c.session, entrepriseId: c.entrepriseId, cible: `${prenom} (${email})`, details: `accès dirigeant d'établissement « ${etab.nom} » créé`, request });
  return NextResponse.json({ succes: true, email, lien: await lienPour(request, email) });
}

export async function PATCH(request: NextRequest) {
  const b = await request.json().catch(() => ({}));
  const c = await controle(request, b.entrepriseId);
  if (!c.ok) return c.refus;
  const u = await prisma.utilisateur.findFirst({ where: { id: String(b.id || ""), entrepriseId: c.entrepriseId, role: "CLIENT", etablissementId: { not: null } } });
  if (!u) return NextResponse.json({ erreur: "Accès introuvable" }, { status: 404 });
  const data: { actif?: boolean; etablissementId?: string; permissionsRetirees?: string[] } = {};
  if (typeof b.actif === "boolean") data.actif = b.actif;
  if (typeof b.voitSalaires === "boolean") data.permissionsRetirees = b.voitSalaires ? u.permissionsRetirees.filter((p) => p !== "salaries.salaires") : [...new Set([...u.permissionsRetirees, "salaries.salaires"])];
  if (b.etablissementId) {
    const etab = await prisma.etablissement.findFirst({ where: { id: String(b.etablissementId), entrepriseId: c.entrepriseId }, select: { id: true } });
    if (!etab) return NextResponse.json({ erreur: "Établissement introuvable" }, { status: 400 });
    data.etablissementId = etab.id;
  }
  if (Object.keys(data).length) await prisma.utilisateur.update({ where: { id: u.id }, data });
  oublierSessions(u.id);
  if (b.nouveauLien) return NextResponse.json({ succes: true, email: u.email, lien: await lienPour(request, u.email) });
  return NextResponse.json({ succes: true });
}

export async function DELETE(request: NextRequest) {
  const c = await controle(request);
  if (!c.ok) return c.refus;
  const id = request.nextUrl.searchParams.get("id") || "";
  const r = await prisma.utilisateur.deleteMany({ where: { id, entrepriseId: c.entrepriseId, role: "CLIENT", etablissementId: { not: null } } });
  if (!r.count) return NextResponse.json({ erreur: "Accès introuvable" }, { status: 404 });
  oublierSessions(id);
  await journaliser({ action: "COMPTE_SUPPR", utilisateur: c.session, entrepriseId: c.entrepriseId, cible: id, details: "accès dirigeant d'établissement supprimé", request });
  return NextResponse.json({ succes: true });
}
