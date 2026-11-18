import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { creerAccesSalarie } from "@/lib/acces-salarie";
import { getSession } from "@/lib/session";
import { refuserSansDroit } from "@/lib/droits-serveur";
import { salarieVisible } from "@/lib/perimetre";

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
  if (session.role === "CLIENT" && (salarie.entrepriseId !== session.entrepriseId || !salarieVisible(session, salarie))) {
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

// Inviter (ou renvoyer l'invitation) : le salarié reçoit un e-mail pour choisir son mot de passe.
// Le lien n'est renvoyé que si l'e-mail n'a pas pu partir (pour le transmettre autrement).
export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const refusPOST = await refuserSansDroit("espace.gerer");
  if (refusPOST) return refusPOST;
  const r = await controler(id);
  if (r.erreur) return r.erreur;
  const res = await creerAccesSalarie(id, request, !!r.salarie.compte);
  if (!res.ok) return NextResponse.json({ erreur: res.erreur }, { status: res.statut });
  return NextResponse.json({ succes: true, email: res.email, mailEnvoye: res.mailEnvoye, lien: res.lien });
}

// Couper l'accès (le compte est gardé, l'historique aussi)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const refusDELETE = await refuserSansDroit("espace.gerer");
  if (refusDELETE) return refusDELETE;
  const r = await controler(id);
  if (r.erreur) return r.erreur;
  if (!r.salarie.compte) return NextResponse.json({ succes: true });
  await prisma.utilisateur.update({ where: { id: r.salarie.compte.id }, data: { actif: false } });
  return NextResponse.json({ succes: true });
}
