import { NextRequest, NextResponse } from "next/server";
import { getSessionCabinet, creerCollaborateur } from "@/lib/cabinet";

// POST (gérant du cabinet) : inviter un collaborateur
export async function POST(request: NextRequest) {
  const session = await getSessionCabinet();
  if (!session || !session.modeCabinet.gerant) return NextResponse.json({ erreur: "Réservé au gérant du cabinet." }, { status: 403 });
  const r = await creerCollaborateur(request, session.modeCabinet.cabinetId, await request.json().catch(() => ({})));
  if (!r.ok) return NextResponse.json({ erreur: r.erreur }, { status: r.statut });
  return NextResponse.json({ succes: true, mailEnvoye: r.mailEnvoye, lien: r.lien });
}
