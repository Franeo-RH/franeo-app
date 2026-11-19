import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCabinet, droitsCollaborateur } from "@/lib/cabinet";
import { envoyerActivation } from "@/lib/invitation";
import { oublierSessions } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

async function controler(id: string) {
  const session = await getSessionCabinet();
  if (!session || !session.modeCabinet.gerant) return { erreur: NextResponse.json({ erreur: "Réservé au gérant du cabinet." }, { status: 403 }) };
  if (session.modeCabinet.demo) return { erreur: NextResponse.json({ erreur: "Indisponible dans la démo." }, { status: 403 }) };
  const u = await prisma.utilisateur.findFirst({ where: { id, role: "CABINET", cabinetId: session.modeCabinet.cabinetId } });
  if (!u) return { erreur: NextResponse.json({ erreur: "Collaborateur introuvable" }, { status: 404 }) };
  return { session, u };
}

// PATCH : profil de droits, clients autorisés, gérant, accès actif/coupé, ou renvoi de l'invitation
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const r = await controler(id);
  if (r.erreur) return r.erreur;
  const b = await request.json().catch(() => ({}));
  const soiMeme = r.u.id === r.session.id;
  if (b.relancer) {
    const cabinet = r.session.modeCabinet.nom;
    const a = await envoyerActivation(request, { email: r.u.email, prenom: r.u.prenom, cabinet, relance: true });
    return NextResponse.json({ succes: true, ...a });
  }
  if (soiMeme && (b.gerant === false || b.actif === false)) {
    return NextResponse.json({ erreur: "Vous ne pouvez pas retirer vos propres droits de gérant ni couper votre accès." }, { status: 400 });
  }
  const droits = await droitsCollaborateur(r.session.modeCabinet.cabinetId, { profil: b.profil ?? r.u.profilCabinet, clients: b.clients ?? r.u.clientsCabinet, gerant: b.gerant ?? r.u.cabinetGerant });
  await prisma.utilisateur.update({ where: { id }, data: { ...droits, ...(typeof b.actif === "boolean" ? { actif: b.actif } : {}) } });
  oublierSessions(id);
  return NextResponse.json({ succes: true });
}
