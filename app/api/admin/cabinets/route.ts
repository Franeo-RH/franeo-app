import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { creerCollaborateur } from "@/lib/cabinet";

const texte = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

// POST (admin) : nouveau cabinet, avec son gérant (invité par e-mail)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const nom = texte(b.nom);
  if (!nom) return NextResponse.json({ erreur: "Le nom du cabinet est obligatoire." }, { status: 400 });
  const cabinet = await prisma.cabinet.create({
    data: { nom, siret: texte(b.siret, 20), email: texte(b.email, 200), telephone: texte(b.telephone, 30), ville: texte(b.ville, 100) },
  });
  let invitation: { mailEnvoye: boolean; lien: string | null } | null = null;
  let avertissement: string | null = null;
  if (texte(b.emailGerant)) {
    const r = await creerCollaborateur(request, cabinet.id, { prenom: b.prenomGerant, email: b.emailGerant, profil: "complet", gerant: true });
    if (r.ok) invitation = { mailEnvoye: r.mailEnvoye, lien: r.lien };
    else avertissement = `Cabinet créé, mais le gérant n'a pas pu être invité : ${r.erreur}`;
  }
  return NextResponse.json({ succes: true, id: cabinet.id, invitation, avertissement });
}
