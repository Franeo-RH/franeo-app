import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { TYPES_ENTRETIEN } from "@/lib/entretiens";
import { nettoyerRubriques, trameEntretien, trameParDefaut } from "@/lib/trames-entretien";

const ERREUR_BASE = "La base n'est pas à jour : lancez « npx prisma db push ».";

/** Cible : l'admin règle le modèle FRANEO (entrepriseId vide) ou celui d'un client ; le client, le sien */
async function cible(request: NextRequest, ecriture: boolean): Promise<{ entrepriseId: string | null } | NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (session.role === "ADMIN") return { entrepriseId: request.nextUrl.searchParams.get("entrepriseId") || null };
  if (session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (ecriture && (!aDroit(session.entreprise?.permissions, "salaries.modifier") || session.etablissementId)) return NextResponse.json({ erreur: "Réservé au dirigeant." }, { status: 403 });
  return { entrepriseId: session.entrepriseId };
}

/** GET ?type=&entrepriseId= : trame applicable et son origine (CLIENT, FRANEO ou DEFAUT) */
export async function GET(request: NextRequest) {
  const c = await cible(request, false);
  if (c instanceof NextResponse) return c;
  const type = request.nextUrl.searchParams.get("type") || "";
  if (!TYPES_ENTRETIEN[type]) return NextResponse.json({ erreur: "Type inconnu" }, { status: 400 });
  try {
    const t = await trameEntretien(c.entrepriseId, type);
    // Pour l'admin sur le modèle FRANEO, une trame « client » n'a pas de sens
    return NextResponse.json({ ...t, defaut: trameParDefaut(type) });
  } catch {
    return NextResponse.json({ rubriques: trameParDefaut(type), origine: "DEFAUT", defaut: trameParDefaut(type), avertissement: ERREUR_BASE });
  }
}

/** PUT { type, rubriques: [{ cle?, label }] } : enregistre la trame (modèle FRANEO ou client) */
export async function PUT(request: NextRequest) {
  const c = await cible(request, true);
  if (c instanceof NextResponse) return c;
  const b = await request.json().catch(() => ({}));
  const type = String(b.type || "");
  if (!TYPES_ENTRETIEN[type]) return NextResponse.json({ erreur: "Type inconnu" }, { status: 400 });
  const rubriques = nettoyerRubriques(b.rubriques);
  if (!rubriques.length) return NextResponse.json({ erreur: "Ajoutez au moins une rubrique." }, { status: 400 });
  try {
    const exist = await prisma.trameEntretien.findFirst({ where: { entrepriseId: c.entrepriseId, type } });
    if (exist) await prisma.trameEntretien.update({ where: { id: exist.id }, data: { rubriques } });
    else await prisma.trameEntretien.create({ data: { entrepriseId: c.entrepriseId, type, rubriques } });
    return NextResponse.json({ succes: true, rubriques });
  } catch {
    return NextResponse.json({ erreur: ERREUR_BASE }, { status: 500 });
  }
}

/** DELETE ?type= : revient à la trame du dessus (client → modèle FRANEO → trame par défaut) */
export async function DELETE(request: NextRequest) {
  const c = await cible(request, true);
  if (c instanceof NextResponse) return c;
  const type = request.nextUrl.searchParams.get("type") || "";
  await prisma.trameEntretien.deleteMany({ where: { entrepriseId: c.entrepriseId, type } }).catch(() => null);
  return NextResponse.json({ succes: true });
}
