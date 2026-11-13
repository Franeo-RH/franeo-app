import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { actionsPossibles, distanceM, heuresDuJour, jourParis, majReleveDepuisPointages, purgerPointages, TYPES_POINTAGE } from "@/lib/badge";

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
  const [pointages, salarie, zones] = await Promise.all([
    prisma.pointage.findMany({ where: { salarieId: s.salarie.id, jour }, orderBy: { at: "asc" }, select: { id: true, type: true, at: true, dansZone: true, motif: true, etablissement: true } }),
    prisma.salarie.findUnique({ where: { id: s.salarie.id }, select: { badgeSansZone: true } }),
    prisma.etablissement.count({ where: { entrepriseId: s.utilisateur.entrepriseId!, latitude: { not: null } } }),
  ]);
  return NextResponse.json({
    jour, pointages,
    actions: actionsPossibles(pointages[pointages.length - 1]?.type ?? null),
    heures: heuresDuJour(pointages),
    controleZone: !salarie?.badgeSansZone && zones > 0,
  });
}

/**
 * POST { type, latitude?, longitude?, precision? } : pointage.
 * La position ne sert qu'à vérifier la zone : elle n'est pas enregistrée.
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

  // Contrôle de zone
  const salarie = await prisma.salarie.findUnique({ where: { id: s.salarie.id }, select: { badgeSansZone: true, etablissement: true } });
  let dansZone: boolean | null = null;
  let motif: string | null = null;
  let etablissement: string | null = null;
  if (salarie?.badgeSansZone) {
    motif = "Salarié itinérant (sans contrôle de zone)";
  } else {
    const zones = await prisma.etablissement.findMany({ where: { entrepriseId, latitude: { not: null }, longitude: { not: null } }, select: { nom: true, latitude: true, longitude: true, rayon: true } });
    const lat = Number(b.latitude), lon = Number(b.longitude), precision = Math.min(Math.max(Number(b.precision) || 0, 0), 1000);
    if (zones.length === 0) motif = "Aucune zone configurée par l'employeur";
    else if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) motif = "Position non partagée";
    else {
      // L'établissement du salarié en priorité, sinon le plus proche
      const mesures = zones.map((z) => ({ nom: z.nom, ecart: distanceM({ lat, lon }, { lat: z.latitude!, lon: z.longitude! }) - Math.min(precision, 150) - z.rayon }));
      const sienne = mesures.find((m) => m.nom === salarie?.etablissement && m.ecart <= 0);
      const meilleure = sienne ?? mesures.sort((a, c) => a.ecart - c.ecart)[0];
      dansZone = meilleure.ecart <= 0;
      etablissement = meilleure.nom;
      if (!dansZone) motif = `Hors zone (environ ${Math.round(meilleure.ecart)} m au-delà de « ${meilleure.nom} »)`;
    }
  }

  await prisma.pointage.create({
    data: {
      salarieId: s.salarie.id, entrepriseId, type, jour, dansZone, motif, etablissement,
      commentaire: typeof b.commentaire === "string" && b.commentaire.trim() ? b.commentaire.trim().slice(0, 200) : null,
    },
  });
  await majReleveDepuisPointages(s.salarie.id, entrepriseId, jour);
  await purgerPointages(entrepriseId);

  return NextResponse.json({
    succes: true,
    message: `${TYPES_POINTAGE[type].icone} ${TYPES_POINTAGE[type].label} enregistrée à ${new Date().toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })}${dansZone === false ? " — hors zone, votre manager en sera informé" : ""}.`,
  });
}
