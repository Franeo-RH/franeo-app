// app/api/suivi-medical/route.ts
// Option « Suivi médical complet »
// GET : salariés présents, type de suivi, dernière visite, prochaine visite calculée et visites particulières
// PUT { salarieId, suiviMedical?, derniereVisite? } : enregistre et met à jour l'échéance « visite médicale » du salarié

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aAccesMedical, aDroit } from "@/lib/droits";
import { filtreSalaries, salarieVisible } from "@/lib/perimetre";
import { alertes, prochaineVisite, TYPES_SUIVI } from "@/lib/suivi-medical";

export const dynamic = "force-dynamic";

async function acces() {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return { ok: false as const, refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  if (!aDroit(session.entreprise?.permissions, "rh.medical") || !aAccesMedical(session.entreprise)) {
    return { ok: false as const, refus: NextResponse.json({ erreur: "L'option Suivi médical complet n'est pas activée." }, { status: 403 }) };
  }
  return { ok: true as const, session, entrepriseId: session.entrepriseId };
}

export async function GET() {
  const a = await acces();
  if (!a.ok) return a.refus;
  const depuis = new Date(); depuis.setMonth(depuis.getMonth() - 12);
  const salaries = await prisma.salarie.findMany({
    where: { entrepriseId: a.entrepriseId, statut: "Actif", ...filtreSalaries(a.session) },
    select: {
      id: true, prenom: true, nom: true, poste: true, dateDebut: true, dateNaissance: true, suiviMedical: true, derniereVisite: true,
      absences: { where: { statut: { not: "Refusé" }, type: { in: ["MALADIE", "MATERNITE_PATERNITE"] }, dateFin: { gte: depuis } }, select: { type: true, dateDebut: true, dateFin: true } },
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });
  return NextResponse.json(salaries.map((s) => ({
    id: s.id, prenom: s.prenom, nom: s.nom, poste: s.poste, dateDebut: s.dateDebut, suiviMedical: s.suiviMedical ?? "SIG", derniereVisite: s.derniereVisite,
    prochaine: prochaineVisite(s), alertes: alertes(s, s.absences),
  })));
}

export async function PUT(request: NextRequest) {
  const a = await acces();
  if (!a.ok) return a.refus;
  const b = await request.json().catch(() => ({}));
  const s = await prisma.salarie.findUnique({ where: { id: String(b.salarieId ?? "") }, select: { id: true, entrepriseId: true, etablissement: true, dateDebut: true, dateNaissance: true, suiviMedical: true, derniereVisite: true } });
  if (!s || s.entrepriseId !== a.entrepriseId || !salarieVisible(a.session, s)) return NextResponse.json({ erreur: "Salarié introuvable" }, { status: 404 });

  const data: { suiviMedical?: string; derniereVisite?: Date | null } = {};
  if (b.suiviMedical !== undefined) {
    if (!TYPES_SUIVI[b.suiviMedical]) return NextResponse.json({ erreur: "Type de suivi invalide" }, { status: 400 });
    data.suiviMedical = b.suiviMedical;
  }
  if (b.derniereVisite !== undefined) {
    if (b.derniereVisite === null || b.derniereVisite === "") data.derniereVisite = null;
    else {
      const dt = new Date(`${String(b.derniereVisite).slice(0, 10)}T12:00:00Z`);
      if (Number.isNaN(dt.getTime()) || dt.getTime() > Date.now() + 86400000) return NextResponse.json({ erreur: "Date de visite invalide" }, { status: 400 });
      data.derniereVisite = dt;
    }
  }
  const maj = await prisma.salarie.update({ where: { id: s.id }, data, select: { suiviMedical: true, derniereVisite: true, dateDebut: true, dateNaissance: true } });

  // Échéance « visite médicale » tenue à jour : elle apparaît dans Échéances, sur les tableaux de bord et chez Buddy
  const prochaine = prochaineVisite(maj);
  const existante = await prisma.rappelSalarie.findFirst({ where: { salarieId: s.id, traite: false, type: { in: ["VISITE_EMBAUCHE", "VISITE_PERIODIQUE"] } }, orderBy: { dateEcheance: "asc" } });
  if (prochaine) {
    const donnees = { type: prochaine.type, dateEcheance: prochaine.date, libelle: `Suivi médical : ${TYPES_SUIVI[maj.suiviMedical ?? "SIG"].court.toLowerCase()}` };
    if (existante) await prisma.rappelSalarie.update({ where: { id: existante.id }, data: donnees });
    else await prisma.rappelSalarie.create({ data: { ...donnees, salarieId: s.id } });
  }
  return NextResponse.json({ succes: true });
}
