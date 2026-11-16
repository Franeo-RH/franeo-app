// app/api/options/route.ts
// POST { option: "projets" | "documents" | "medical", action: "activer" | "arreter" }
// Le dirigeant active ou arrête une option à tout moment. Elle est ajoutée au calcul de la facture du mois
// (si la formule ne l'inclut pas) et FRANEO RH est prévenu ; une trace reste dans les demandes.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, oublierSessions } from "@/lib/session";
import { aDroit, documentsInclus, medicalInclus, PERMISSION_DOCUMENTS, PERMISSION_MEDICAL, projetsInclus } from "@/lib/droits";
import { estSessionDemo } from "@/lib/demo";
import { notifierAdmin } from "@/lib/notifications";
import { PRIX_OPTION_DOCUMENTS, PRIX_OPTION_MEDICAL, PRIX_OPTION_PROJETS } from "@/lib/projets-constantes";

const OPTIONS = {
  projets: { permission: "projets", type: "OPTION_PROJETS", nom: "Option Projets, planning & rentabilité", prix: PRIX_OPTION_PROJETS, inclus: projetsInclus },
  documents: { permission: PERMISSION_DOCUMENTS, type: "OPTION_DOCUMENTS", nom: "Option Documents & contrats", prix: PRIX_OPTION_DOCUMENTS, inclus: documentsInclus },
  medical: { permission: PERMISSION_MEDICAL, type: "OPTION_MEDICAL", nom: "Option Suivi médical complet", prix: PRIX_OPTION_MEDICAL, inclus: medicalInclus },
} as const;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (session.etablissementId || !aDroit(session.entreprise?.permissions, "entreprise.abonnements")) {
    return NextResponse.json({ erreur: "Réservé au dirigeant de l'entreprise." }, { status: 403 });
  }
  if (estSessionDemo(session)) return NextResponse.json({ erreur: "Non disponible dans la démo." }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const o = OPTIONS[b.option as keyof typeof OPTIONS];
  if (!o || (b.action !== "activer" && b.action !== "arreter")) return NextResponse.json({ erreur: "Demande invalide" }, { status: 400 });

  const e = await prisma.entreprise.findUnique({ where: { id: session.entrepriseId }, select: { nom: true, permissions: true, abonnement: { select: { nom: true } }, abonnementPaie: { select: { nom: true } } } });
  if (!e) return NextResponse.json({ erreur: "Entreprise introuvable" }, { status: 404 });
  const active = e.permissions.includes(o.permission);
  const inclus = o.inclus(e);

  if (b.action === "activer") {
    if (active) return NextResponse.json({ succes: true });
    // Documents : on rend aussi les contrats et courriers s'ils avaient été retirés
    const perms = o.permission === PERMISSION_DOCUMENTS ? e.permissions.filter((p) => p !== "-rh.contrats" && p !== "-rh.courriers") : e.permissions;
    await prisma.entreprise.update({ where: { id: session.entrepriseId }, data: { permissions: [...perms, o.permission] } });
  } else {
    if (!active) return NextResponse.json({ succes: true });
    await prisma.entreprise.update({ where: { id: session.entrepriseId }, data: { permissions: e.permissions.filter((p) => p !== o.permission) } });
  }
  oublierSessions();

  const texte = b.action === "activer"
    ? `${o.nom} activée${inclus ? " (incluse dans la formule)" : ` : ${o.prix} € HT/mois ajoutés à la facture`}`
    : `${o.nom} arrêtée${inclus ? "" : " : elle n'est plus facturée"}`;
  // Trace dans Admin › Demandes des clients
  await prisma.demandeService.create({
    data: { entrepriseId: session.entrepriseId, type: o.type, options: [texte], message: "Fait par le client depuis Mon entreprise.", auteur: session.prenom, statut: "TRAITEE", traiteeAt: new Date() },
  });
  await notifierAdmin({ sujet: `${texte} — ${e.nom}`, titre: b.action === "activer" ? "🧩 Option activée par un client" : "🧩 Option arrêtée par un client", lignes: [`${e.nom} (${session.prenom})`, texte], lien: "/admin/entreprises/demandes-services", entrepriseId: session.entrepriseId });
  return NextResponse.json({ succes: true });
}
