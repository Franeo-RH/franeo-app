import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

/** Vérifie que l'utilisateur (client de l'entreprise ou admin) peut gérer l'espace de ce salarié */
async function controler(id: string) {
  const session = await getSession();
  if (!session) return { erreur: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  const salarie = await prisma.salarie.findUnique({
    where: { id },
    include: { entreprise: true, compte: true },
  });
  if (!salarie) return { erreur: NextResponse.json({ erreur: "Salarié introuvable" }, { status: 404 }) };
  if (session.role === "CLIENT" && salarie.entrepriseId !== session.entrepriseId) {
    return { erreur: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  }
  if (salarie.entreprise.demo) {
    return { erreur: NextResponse.json({ erreur: "L'espace salarié n'est pas disponible dans la démo." }, { status: 403 }) };
  }
  if (!salarie.entreprise.permissions.includes("espace-salaries")) {
    return { erreur: NextResponse.json({ erreur: "L'option « Espace salarié » n'est pas activée. Contactez votre gestionnaire." }, { status: 403 }) };
  }
  return { session, salarie };
}

// Inviter (ou générer un nouveau lien) : renvoie un lien de création du mot de passe à transmettre au salarié
export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const r = await controler(id);
  if (r.erreur) return r.erreur;
  const { salarie } = r;

  const email = (salarie.compte?.email || salarie.email || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ erreur: "Renseignez d'abord l'email du salarié dans sa fiche." }, { status: 400 });
  }
  if (salarie.dateFin && new Date(salarie.dateFin) < new Date()) {
    return NextResponse.json({ erreur: "Ce salarié a quitté l'entreprise." }, { status: 400 });
  }

  if (salarie.compte) {
    await prisma.utilisateur.update({ where: { id: salarie.compte.id }, data: { actif: true } });
  } else {
    const existant = await prisma.utilisateur.findUnique({ where: { email } });
    if (existant) {
      return NextResponse.json({ erreur: "Cet email est déjà utilisé par un autre compte Franeo." }, { status: 409 });
    }
    await prisma.utilisateur.create({
      data: {
        email,
        prenom: salarie.prenom,
        role: "SALARIE",
        entrepriseId: salarie.entrepriseId,
        salarieId: salarie.id,
        // mot de passe aléatoire inutilisable : le salarié choisit le sien via le lien
        motDePasse: await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10),
      },
    });
  }

  // Lien de création du mot de passe, valable 7 jours
  await prisma.tokenReset.deleteMany({ where: { email } });
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.tokenReset.create({ data: { token, email, expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) } });
  const base = (process.env.NEXT_PUBLIC_URL || process.env.APP_URL || request.nextUrl.origin).replace(/\/$/, "");
  const lien = `${base}/reinitialiser-mot-de-passe?token=${token}`;

  // Pas de mail : l'employeur transmet lui-même ce lien au salarié (SMS, WhatsApp, mail…)
  return NextResponse.json({ succes: true, email, lien });
}

// Couper l'accès (le compte est gardé, l'historique aussi)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const r = await controler(id);
  if (r.erreur) return r.erreur;
  if (!r.salarie.compte) return NextResponse.json({ succes: true });
  await prisma.utilisateur.update({ where: { id: r.salarie.compte.id }, data: { actif: false } });
  return NextResponse.json({ succes: true });
}
