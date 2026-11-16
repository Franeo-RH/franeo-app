// app/api/paie/sorties/route.ts
// GET  : sorties déclarées (historique) + salariés présents
// POST : déclarer la sortie d'un salarié. Avec une paie gérée par FRANEO RH, la sortie part en demande
//        de validation ; sinon elle est appliquée tout de suite (date de fin + motif) et FRANEO RH est prévenu.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit, passeParValidation } from "@/lib/droits";
import { etablissementDe, filtreSalaries, salarieVisible } from "@/lib/perimetre";
import { estSessionDemo } from "@/lib/demo";
import { creerDemande } from "@/lib/demandes-salaries";
import { notifierAdmin } from "@/lib/notifications";
import { libelleMotif, MOTIFS_SORTIE, PREAVIS } from "@/lib/sorties";

export const dynamic = "force-dynamic";

async function acces() {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return { ok: false as const, refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  if (!aDroit(session.entreprise?.permissions, "paie.sorties")) return { ok: false as const, refus: NextResponse.json({ erreur: "Fonction non activée pour votre compte." }, { status: 403 }) };
  return { ok: true as const, session, entrepriseId: session.entrepriseId };
}

export async function GET() {
  const a = await acces();
  if (!a.ok) return a.refus;
  const [salaries, demandes] = await Promise.all([
    prisma.salarie.findMany({
      where: { entrepriseId: a.entrepriseId, statut: "Actif", ...filtreSalaries(a.session) },
      select: { id: true, prenom: true, nom: true, poste: true, typeContrat: true, dateDebut: true, dateFin: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
    prisma.demandeSalarie.findMany({ where: { entrepriseId: a.entrepriseId, type: "SORTIE" }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const visibles = new Set(salaries.map((s) => s.id));
  return NextResponse.json({
    salaries,
    validation: passeParValidation(a.session.entreprise),
    sorties: demandes.filter((d) => !d.salarieId || visibles.has(d.salarieId) || !etablissementDe(a.session)).map((d) => ({ id: d.id, statut: d.statut, resume: d.resume, motifRefus: d.motifRefus, createdAt: d.createdAt, auteur: d.auteur })),
  });
}

const jour = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export async function POST(request: NextRequest) {
  const a = await acces();
  if (!a.ok) return a.refus;
  if (estSessionDemo(a.session)) return NextResponse.json({ erreur: "Non disponible dans la démo." }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const s = await prisma.salarie.findUnique({ where: { id: String(b.salarieId ?? "") }, select: { id: true, entrepriseId: true, etablissement: true, prenom: true, nom: true, dateDebut: true } });
  if (!s || s.entrepriseId !== a.entrepriseId || !salarieVisible(a.session, s)) return NextResponse.json({ erreur: "Salarié introuvable" }, { status: 404 });
  if (!MOTIFS_SORTIE.some((m) => m.code === b.motif)) return NextResponse.json({ erreur: "Choisissez le motif de la sortie." }, { status: 400 });
  const dateFin = jour(b.dateFin);
  if (!dateFin) return NextResponse.json({ erreur: "Indiquez la date de fin du contrat." }, { status: 400 });
  if (s.dateDebut && new Date(`${dateFin}T12:00:00Z`) < s.dateDebut) return NextResponse.json({ erreur: "La date de fin est avant la date d'entrée." }, { status: 400 });
  const enCours = await prisma.demandeSalarie.count({ where: { salarieId: s.id, type: "SORTIE", statut: "EN_ATTENTE" } });
  if (enCours) return NextResponse.json({ erreur: "Une sortie est déjà en attente de validation pour ce salarié." }, { status: 409 });

  const donnees = {
    motif: b.motif,
    dateFin,
    dernierJour: jour(b.dernierJour),
    notification: jour(b.notification),
    preavis: PREAVIS[b.preavis] ? b.preavis : null,
    elements: typeof b.elements === "string" ? b.elements.trim().slice(0, 2000) : "",
    commentaire: typeof b.commentaire === "string" ? b.commentaire.trim().slice(0, 2000) : "",
  };
  const auteur = `${a.session.prenom} (${a.session.email})`;

  // Paie gérée par FRANEO RH : validation par l'admin (la date de fin est appliquée à la validation)
  if (passeParValidation(a.session.entreprise)) {
    await creerDemande({ entrepriseId: a.entrepriseId, type: "SORTIE", donnees, salarieId: s.id, auteur });
    return NextResponse.json({ succes: true, validation: true });
  }

  // Sinon : appliquée tout de suite, gardée dans l'historique et signalée à FRANEO RH
  await prisma.salarie.update({ where: { id: s.id }, data: { dateFin: new Date(`${dateFin}T00:00:00Z`), motifSortie: libelleMotif(donnees.motif) } });
  const resume = `Sortie de ${s.prenom} ${s.nom} : ${libelleMotif(donnees.motif)}, fin de contrat le ${new Date(`${dateFin}T12:00:00Z`).toLocaleDateString("fr-FR")}`;
  await prisma.demandeSalarie.create({ data: { entrepriseId: a.entrepriseId, type: "SORTIE", statut: "VALIDEE", traiteAt: new Date(), resume, donnees, salarieId: s.id, auteur } });
  await notifierAdmin({ sujet: `Sortie déclarée — ${s.prenom} ${s.nom}`, titre: "🚪 Sortie de salarié déclarée", lignes: [resume, ...(donnees.elements ? [`Éléments : ${donnees.elements}`] : []), ...(donnees.commentaire ? [donnees.commentaire] : [])], lien: "/admin/salaries/demandes", entrepriseId: a.entrepriseId });
  return NextResponse.json({ succes: true, validation: false });
}
