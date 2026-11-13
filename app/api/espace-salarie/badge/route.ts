import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { adresseDe } from "@/lib/geocodage";
import { projetsPourPointage } from "@/lib/projets";
import { actionsPossibles, heuresDuJour, jourParis, majReleveDepuisPointages, purgerPointages, TYPES_POINTAGE } from "@/lib/badge";

async function acces() {
  const s = await getSessionSalarie();
  if (!s.ok) return { s: null, refus: NextResponse.json({ erreur: "Accès refusé" }, { status: 401 }) };
  if (!aDroit(s.utilisateur.entreprise?.permissions, "espace.badge")) return { s: null, refus: NextResponse.json({ erreur: "Le badge n'est pas activé par votre employeur." }, { status: 403 }) };
  return { s, refus: null };
}

/** GET : pointages du jour, actions possibles et réglages de zone */
export async function GET() {
  const { s, refus } = await acces();
  if (!s) return refus!;
  const jour = jourParis();
  const avecProjets = aDroit(s.utilisateur.entreprise?.permissions, "espace.projets");
  const [pointages, choix] = await Promise.all([
    prisma.pointage.findMany({ where: { salarieId: s.salarie.id, jour }, orderBy: { at: "asc" }, select: { id: true, type: true, at: true, adresse: true, projet: { select: { nom: true, couleur: true } } } }),
    avecProjets ? projetsPourPointage(s.utilisateur.entrepriseId!, s.salarie.id) : Promise.resolve(null),
  ]);
  return NextResponse.json({
    jour, pointages,
    actions: actionsPossibles(pointages[pointages.length - 1]?.type ?? null),
    heures: heuresDuJour(pointages),
    controleZone: true,
    projets: choix?.projets ?? [],
    projetsPlanifies: choix?.planifie ?? false,
  });
}

/**
 * POST { type, latitude?, longitude?, precision? } : pointage.
 * La position est obligatoire : l'adresse correspondante est enregistrée avec le pointage.
 */
export async function POST(request: NextRequest) {
  const { s, refus } = await acces();
  if (!s) return refus!;
  const b = await request.json().catch(() => ({}));
  const type = String(b.type || "") as keyof typeof TYPES_POINTAGE;
  if (!TYPES_POINTAGE[type]) return NextResponse.json({ erreur: "Type de pointage invalide" }, { status: 400 });

  const entrepriseId = s.utilisateur.entrepriseId!;
  const jour = jourParis();
  const dernier = await prisma.pointage.findFirst({ where: { salarieId: s.salarie.id, jour }, orderBy: { at: "desc" }, select: { type: true, at: true } });
  if (!actionsPossibles(dernier?.type ?? null).includes(type)) {
    return NextResponse.json({ erreur: `Pointage impossible : « ${TYPES_POINTAGE[type].label} » ne suit pas « ${dernier ? TYPES_POINTAGE[dernier.type as keyof typeof TYPES_POINTAGE]?.label : "aucun pointage"} ».` }, { status: 409 });
  }
  if (dernier && Date.now() - dernier.at.getTime() < 60000) return NextResponse.json({ erreur: "Vous venez de pointer : attendez une minute." }, { status: 429 });

  // Adresse du pointage : la position est obligatoire
  const lat = Number(b.latitude), lon = Number(b.longitude);
  if (b.latitude == null || b.longitude == null || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ erreur: "📍 Votre position est nécessaire pour pointer : autorisez la localisation puis réessayez." }, { status: 400 });
  }
  // Projet choisi (option Projets) : seulement à l'arrivée ou à la reprise
  let projetId: string | null = null;
  if ((type === "ARRIVEE" || type === "REPRISE") && typeof b.projetId === "string" && b.projetId && aDroit(s.utilisateur.entreprise?.permissions, "espace.projets")) {
    const pr = await prisma.projet.findFirst({ where: { id: b.projetId, entrepriseId, statut: { in: ["PREVU", "EN_COURS"] } }, select: { id: true } });
    projetId = pr?.id ?? null;
  }
  const adresse = (await adresseDe(lat, lon)) ?? `Position GPS ${lat.toFixed(5)}, ${lon.toFixed(5)} (adresse introuvable)`;

  await prisma.pointage.create({
    data: {
      salarieId: s.salarie.id, entrepriseId, type, jour, adresse, projetId,
      commentaire: typeof b.commentaire === "string" && b.commentaire.trim() ? b.commentaire.trim().slice(0, 200) : null,
    },
  });
  await majReleveDepuisPointages(s.salarie.id, entrepriseId, jour);
  await purgerPointages(entrepriseId);

  return NextResponse.json({
    succes: true,
    message: `${TYPES_POINTAGE[type].icone} ${TYPES_POINTAGE[type].label} enregistrée à ${new Date().toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })} — ${adresse}.`,
  });
}
