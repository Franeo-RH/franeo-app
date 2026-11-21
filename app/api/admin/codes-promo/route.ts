import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { normaliserCode } from "@/lib/parrainage";

const admin = async () => { const s = await getSession(); return s?.role === "ADMIN" ? s : null; };
const ERREUR_BASE = "La base n'est pas à jour : lancez « npx prisma db push ».";

/** Lecture d'un code promo envoyé par le formulaire admin */
export function lireCodePromo(b: Record<string, unknown>) {
  const type = b.type === "MONTANT" ? "MONTANT" : "POURCENT";
  const valeur = b.valeur === "" || b.valeur == null ? 0 : parseFloat(String(b.valeur).replace(",", "."));
  if (!Number.isFinite(valeur) || valeur < 0 || (type === "POURCENT" && valeur > 100) || valeur > 100000) return { erreur: type === "POURCENT" ? "Pourcentage entre 0 et 100." : "Montant positif." };
  const commissionPct = b.commissionPct === "" || b.commissionPct == null ? null : parseFloat(String(b.commissionPct).replace(",", "."));
  if (commissionPct != null && (!Number.isFinite(commissionPct) || commissionPct < 0 || commissionPct > 100)) return { erreur: "Commission : pourcentage entre 0 et 100." };
  if (!(valeur > 0) && !(commissionPct && commissionPct > 0)) return { erreur: "Indiquez une remise, une commission, ou les deux." };
  const commissionMois = b.commissionMois === "" || b.commissionMois == null ? null : parseInt(String(b.commissionMois), 10);
  if (commissionMois != null && (!Number.isFinite(commissionMois) || commissionMois < 1 || commissionMois > 240)) return { erreur: "Durée de commission invalide." };
  const nbMois = b.nbMois === "" || b.nbMois == null ? null : parseInt(String(b.nbMois), 10);
  if (nbMois != null && (!Number.isFinite(nbMois) || nbMois < 1 || nbMois > 120)) return { erreur: "Durée : 1 à 120 mois (vide = sans fin)." };
  const max = b.maxUtilisations === "" || b.maxUtilisations == null ? null : parseInt(String(b.maxUtilisations), 10);
  if (max != null && (!Number.isFinite(max) || max < 1)) return { erreur: "Nombre d'utilisations invalide." };
  const fin = /^\d{4}-\d{2}-\d{2}$/.test(String(b.finValidite ?? "")) ? new Date(`${b.finValidite}T23:59:59`) : null;
  return { data: { type, valeur, nbMois, maxUtilisations: max, finValidite: fin, portee: b.portee === "TOUT" ? "TOUT" : "ABONNEMENTS", note: typeof b.note === "string" ? b.note.trim().slice(0, 200) || null : null, commissionPct: commissionPct && commissionPct > 0 ? commissionPct : null, commissionMois, beneficiaire: typeof b.beneficiaire === "string" ? b.beneficiaire.trim().slice(0, 120) || null : null } };
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  try {
    return NextResponse.json(await prisma.codePromo.findMany({ orderBy: { createdAt: "desc" } }));
  } catch {
    return NextResponse.json({ erreur: ERREUR_BASE }, { status: 500 });
  }
}

/** POST { code, type, valeur, portee, nbMois?, finValidite?, maxUtilisations?, note? } */
export async function POST(request: NextRequest) {
  if (!(await admin())) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const code = normaliserCode(b.code).replace(/[^A-Z0-9_-]/g, "");
  if (code.length < 3) return NextResponse.json({ erreur: "Code : 3 caractères minimum (lettres, chiffres, - ou _)." }, { status: 400 });
  if (code.startsWith("FRH-")) return NextResponse.json({ erreur: "Les codes FRH-… sont réservés au parrainage." }, { status: 400 });
  const l = lireCodePromo(b);
  if ("erreur" in l) return NextResponse.json({ erreur: l.erreur }, { status: 400 });
  try {
    if (await prisma.codePromo.findUnique({ where: { code } })) return NextResponse.json({ erreur: "Ce code existe déjà." }, { status: 400 });
    if (await prisma.entreprise.findFirst({ where: { codeParrainage: { equals: code, mode: "insensitive" } } })) return NextResponse.json({ erreur: "Ce code est déjà le code de parrainage d'un client." }, { status: 400 });
    return NextResponse.json(await prisma.codePromo.create({ data: { code, ...l.data } }));
  } catch {
    return NextResponse.json({ erreur: ERREUR_BASE }, { status: 500 });
  }
}
