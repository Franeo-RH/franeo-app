import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { notifierAdmin } from "@/lib/notifications";
import { appFraneo, estAbonne, REMISE_APPS, REMISE_AUDIT, TYPES_DEMANDE } from "@/lib/apps-franeo";

/** GET : demandes du client (ou toutes pour l'admin, ?statut=) */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const statut = request.nextUrl.searchParams.get("statut");
  const l = await prisma.demandeService.findMany({
    where: {
      ...(session.role === "ADMIN" ? { entreprise: { demo: false } } : { entrepriseId: session.entrepriseId ?? "-" }),
      ...(statut ? { statut } : {}),
    },
    include: { entreprise: { select: { nom: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return NextResponse.json(l);
}

/** POST (client) { type: APP|AUDIT|FORMATION|AUTRE, app?, options?: string[], message? } */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (!aDroit(session.entreprise?.permissions, "entreprise.devis") && !aDroit(session.entreprise?.permissions, "tickets.creer")) return NextResponse.json({ erreur: "Action non autorisée pour votre compte." }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const type = String(b.type ?? "");
  if (!TYPES_DEMANDE[type]) return NextResponse.json({ erreur: "Type de demande invalide" }, { status: 400 });
  const app = type === "APP" ? appFraneo(String(b.app ?? "")) : null;
  if (type === "APP" && !app) return NextResponse.json({ erreur: "Choisissez une application." }, { status: 400 });
  const message = typeof b.message === "string" ? b.message.trim().slice(0, 4000) : "";
  if (type === "AUTRE" && !message) return NextResponse.json({ erreur: "Décrivez votre besoin." }, { status: 400 });
  const options = Array.isArray(b.options) ? b.options.filter((o: unknown) => typeof o === "string").slice(0, 20).map((o: string) => o.slice(0, 200)) : [];
  const abonne = estAbonne(session.entreprise);
  const remise = !abonne ? 0 : type === "APP" ? REMISE_APPS : type === "AUDIT" ? REMISE_AUDIT : 0;

  const d = await prisma.demandeService.create({
    data: { entrepriseId: session.entrepriseId, type, app: app?.code ?? null, options, message: message || null, remise, auteur: session.prenom },
  });
  await notifierAdmin({
    sujet: `${TYPES_DEMANDE[type].label}${app ? ` (${app.nom})` : ""} — ${session.entreprise?.nom ?? ""}`,
    titre: `${TYPES_DEMANDE[type].icone} Nouvelle demande : ${TYPES_DEMANDE[type].label}`,
    lignes: [
      `${session.entreprise?.nom ?? ""} (${session.prenom})${app ? ` — ${app.nom}` : ""}`,
      ...(options.length ? [`Choix : ${options.join(", ")}`] : []),
      ...(remise ? [`Remise abonné : ${Math.round(remise * 100)} %`] : []),
      ...(message ? [message.slice(0, 500)] : []),
    ],
    lien: "/admin/entreprises/demandes-services",
    entrepriseId: session.entrepriseId,
  });
  return NextResponse.json({ succes: true, demande: d });
}
