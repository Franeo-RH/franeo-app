import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesProjets, lire, lireProjet } from "@/lib/projets-serveur";
import { retirerJoursAbsence } from "@/lib/projets-planning";
import { CATEGORIES_DEPENSE, coutHoraire, heuresDatees, masquerCouts, projetsAvecSynthese } from "@/lib/projets";

type Ctx = { params: Promise<{ id: string }> };

async function charger(id: string, entrepriseId: string) {
  return prisma.projet.findFirst({ where: { id, entrepriseId }, select: { id: true } });
}

/** GET : fiche complète du projet (planning, temps, dépenses, synthèse) + listes pour les formulaires */
export async function GET(request: NextRequest, { params }: Ctx) {
  const a = await accesProjets();
  if (!a.ok) return a.refus;
  const { id } = await params;
  const [p] = await projetsAvecSynthese(a.entrepriseId, { id });
  if (!p) return NextResponse.json({ erreur: "Projet introuvable" }, { status: 404 });

  // ?format=csv : export de tous les temps du projet (badge + saisies)
  if (request.nextUrl.searchParams.get("format") === "csv") {
    const noms = new Map(p.synthese.parSalarie.map((l) => [l.salarieId, { nom: l.salarie, cout: l.coutHoraire }]));
    const lignes = (await heuresDatees([id])).sort((x, y) => x.jour.localeCompare(y.jour));
    const entete = ["Date", "Salarié", "Heures", "Source", "Commentaire", ...(a.voitCouts ? ["Coût (€)"] : [])];
    const csv = "\uFEFF" + [entete, ...lignes.map((l) => {
      const n = noms.get(l.salarieId);
      return [l.jour.split("-").reverse().join("/"), n?.nom ?? "", String(l.heures).replace(".", ","), l.source, l.commentaire ?? "",
        ...(a.voitCouts ? [n?.cout ? String(Math.round(l.heures * n.cout * 100) / 100).replace(".", ",") : ""] : [])];
    })].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const nomFichier = (p.code || p.nom).replace(/[^a-z0-9-]+/gi, "-").slice(0, 40);
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="temps-${nomFichier}.csv"` } });
  }

  const [salaries, entreprise, fraisLibres] = await Promise.all([
    prisma.salarie.findMany({
      where: { entrepriseId: a.entrepriseId, statut: "Actif" },
      select: { id: true, prenom: true, nom: true, poste: true, coutHoraireStandard: true, salaireMensuel: true, heuresHebdomadaires: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
    prisma.entreprise.findUnique({ where: { id: a.entrepriseId }, select: { tauxCharges: true } }),
    a.voitCouts
      ? prisma.noteFrais.findMany({ where: { entrepriseId: a.entrepriseId, projetId: null, statut: { not: "Refusé" } }, select: { id: true, date: true, montant: true, motif: true, salarie: { select: { prenom: true, nom: true } } }, orderBy: { date: "desc" }, take: 50 })
      : Promise.resolve([]),
  ]);
  // Absences validées ou en attente des salariés planifiés, pendant le projet (conflits de planning)
  const ids = [...new Set(p.affectations.map((x) => x.salarieId))];
  const absences = ids.length
    ? await prisma.absence.findMany({
        where: { salarieId: { in: ids }, statut: { not: "Refusé" }, dateFin: { gte: p.dateDebut }, ...(p.dateFin ? { dateDebut: { lte: p.dateFin } } : {}) },
        select: { salarieId: true, type: true, dateDebut: true, dateFin: true, statut: true },
      })
    : [];
  const conflits = p.affectations.flatMap((af) =>
    absences.filter((ab) => ab.salarieId === af.salarieId && ab.dateDebut <= af.au && ab.dateFin >= af.du)
      .map((ab) => ({ affectationId: af.id, salarie: `${af.salarie.prenom} ${af.salarie.nom}`, du: ab.dateDebut, au: ab.dateFin, type: ab.type, statut: ab.statut })),
  );

  return NextResponse.json({
    projet: a.voitCouts ? p : masquerCouts(p),
    salaries: salaries.map(({ coutHoraireStandard, salaireMensuel, heuresHebdomadaires, ...s }) => ({
      ...s, coutHoraire: a.voitCouts ? coutHoraire({ coutHoraireStandard, salaireMensuel, heuresHebdomadaires }, entreprise?.tauxCharges) : null,
    })),
    conflits, fraisLibres, voitCouts: a.voitCouts, peutGerer: a.peutGerer,
  });
}

/** PATCH : modifier le projet (mêmes champs que la création) */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const a = await accesProjets("projets.gerer");
  if (!a.ok) return a.refus;
  const { id } = await params;
  if (!(await charger(id, a.entrepriseId))) return NextResponse.json({ erreur: "Projet introuvable" }, { status: 404 });
  const b = await request.json().catch(() => ({}));
  // Changement de statut seul (boutons rapides)
  if (Object.keys(b).length === 1 && typeof b.statut === "string") {
    if (!["PREVU", "EN_COURS", "TERMINE", "ANNULE"].includes(b.statut)) return NextResponse.json({ erreur: "Statut invalide" }, { status: 400 });
    await prisma.projet.update({ where: { id }, data: { statut: b.statut } });
    return NextResponse.json({ succes: true });
  }
  const { erreurs, data } = lireProjet(b);
  if (erreurs.length) return NextResponse.json({ erreur: erreurs.join(" ") }, { status: 400 });
  if (!a.voitCouts) { delete (data as Partial<typeof data>).prixVente; delete (data as Partial<typeof data>).tauxJournalier; delete (data as Partial<typeof data>).montantMensuel; }
  if (data.responsableId && !(await prisma.salarie.findFirst({ where: { id: data.responsableId, entrepriseId: a.entrepriseId } }))) data.responsableId = null;
  await prisma.projet.update({ where: { id }, data });
  return NextResponse.json({ succes: true });
}

/**
 * POST { action, ... } :
 * - affectation { salarieId, du, au, heuresSemaine, role? } : planifier un salarié
 * - temps { salarieId, jour, heures, commentaire? } : saisir du temps passé
 * - depense { libelle, categorie, montant, date, prevu } : frais prévus ou réels
 * - rattacherFrais { noteFraisId } : imputer une note de frais au projet
 * - dupliquer : copie du projet (planning et frais prévus décalés à aujourd'hui)
 * - jalon { libelle, date, montant?, facturation } : nouveau jalon / échéance de facturation
 * - jalonMaj { jalonId, etat?, facturation? } : jalon fait, facturé, payé
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  const a = await accesProjets("projets.gerer");
  if (!a.ok) return a.refus;
  const { id } = await params;
  const projet = await prisma.projet.findFirst({ where: { id, entrepriseId: a.entrepriseId }, include: { affectations: true, depenses: { where: { prevu: true } }, jalons: true } });
  if (!projet) return NextResponse.json({ erreur: "Projet introuvable" }, { status: 404 });
  const b = await request.json().catch(() => ({}));
  const salarieOk = async (sid: unknown) => typeof sid === "string" && !!(await prisma.salarie.findFirst({ where: { id: sid, entrepriseId: a.entrepriseId }, select: { id: true } }));

  switch (b.action) {
    case "affectation": {
      const du = lire.d(b.du), au = lire.d(b.au), h = lire.n(b.heuresSemaine);
      if (!(await salarieOk(b.salarieId))) return NextResponse.json({ erreur: "Choisissez un salarié." }, { status: 400 });
      if (!du || !au || au < du) return NextResponse.json({ erreur: "Période invalide." }, { status: 400 });
      if (!h || h <= 0 || h > 60) return NextResponse.json({ erreur: "Indiquez entre 0,5 et 60 heures par semaine." }, { status: 400 });
      await prisma.affectationProjet.create({ data: { projetId: id, salarieId: b.salarieId, du, au: new Date(au.getTime() + 86399000), heuresSemaine: h, role: lire.t(b.role, 80) } });
      break;
    }
    case "temps": {
      const h = lire.n(b.heures);
      if (!(await salarieOk(b.salarieId))) return NextResponse.json({ erreur: "Choisissez un salarié." }, { status: 400 });
      if (typeof b.jour !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.jour)) return NextResponse.json({ erreur: "Date invalide." }, { status: 400 });
      if (!h || h <= 0 || h > 24) return NextResponse.json({ erreur: "Indiquez un nombre d'heures entre 0,25 et 24." }, { status: 400 });
      await prisma.tempsProjet.create({ data: { projetId: id, salarieId: b.salarieId, jour: b.jour, heures: h, commentaire: lire.t(b.commentaire) } });
      break;
    }
    case "depense": {
      if (!a.voitCouts) return NextResponse.json({ erreur: "Vous ne voyez pas les coûts de ce projet." }, { status: 403 });
      const m = lire.n(b.montant), date = lire.d(b.date), libelle = lire.t(b.libelle, 150);
      if (!libelle || m == null || m <= 0 || !date) return NextResponse.json({ erreur: "Libellé, montant et date sont obligatoires." }, { status: 400 });
      await prisma.depenseProjet.create({ data: { projetId: id, libelle, montant: Math.round(m * 100) / 100, date, prevu: !!b.prevu, categorie: b.categorie in CATEGORIES_DEPENSE ? b.categorie : "AUTRE" } });
      break;
    }
    case "rattacherFrais": {
      if (!a.voitCouts) return NextResponse.json({ erreur: "Vous ne voyez pas les coûts de ce projet." }, { status: 403 });
      const r = await prisma.noteFrais.updateMany({ where: { id: String(b.noteFraisId), entrepriseId: a.entrepriseId }, data: { projetId: id } });
      if (!r.count) return NextResponse.json({ erreur: "Note de frais introuvable." }, { status: 404 });
      break;
    }
    case "jalon": {
      const date = lire.d(b.date), libelle = lire.t(b.libelle, 150), montant = lire.n(b.montant);
      if (!libelle || !date) return NextResponse.json({ erreur: "Libellé et date sont obligatoires." }, { status: 400 });
      const facturation = ["AUCUNE", "A_FACTURER", "FACTURE", "PAYE"].includes(b.facturation) ? b.facturation : montant ? "A_FACTURER" : "AUCUNE";
      if (facturation !== "AUCUNE" && !a.voitCouts) return NextResponse.json({ erreur: "Vous ne voyez pas les montants de ce projet." }, { status: 403 });
      await prisma.jalonProjet.create({ data: { projetId: id, libelle, date, montant: a.voitCouts ? montant : null, facturation } });
      break;
    }
    case "jalonMaj": {
      const data: { etat?: string; faitLe?: Date | null; facturation?: string } = {};
      if (b.etat === "FAIT" || b.etat === "A_FAIRE") { data.etat = b.etat; data.faitLe = b.etat === "FAIT" ? new Date() : null; }
      if (["AUCUNE", "A_FACTURER", "FACTURE", "PAYE"].includes(b.facturation)) {
        if (!a.voitCouts) return NextResponse.json({ erreur: "Vous ne voyez pas les montants de ce projet." }, { status: 403 });
        data.facturation = b.facturation;
      }
      const r = await prisma.jalonProjet.updateMany({ where: { id: String(b.jalonId), projetId: id }, data });
      if (!r.count) return NextResponse.json({ erreur: "Jalon introuvable." }, { status: 404 });
      break;
    }
    case "retirerAbsence": {
      // Retire du planning les jours d'absence (une absence précise, ou toutes) ; option : remplaçant sur ces jours
      const ok = (x: unknown) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x);
      const periode = ok(b.du) && ok(b.au) ? { du: b.du as string, au: b.au as string } : undefined;
      let remplacantId: string | null = null;
      if (typeof b.remplacantId === "string" && b.remplacantId) {
        if (!(await salarieOk(b.remplacantId))) return NextResponse.json({ erreur: "Remplaçant introuvable." }, { status: 400 });
        remplacantId = b.remplacantId;
      }
      if (b.affectationId && !projet.affectations.some((x) => x.id === b.affectationId)) return NextResponse.json({ erreur: "Affectation introuvable." }, { status: 404 });
      const jours = await retirerJoursAbsence(id, { affectationId: typeof b.affectationId === "string" ? b.affectationId : undefined, periode, remplacantId });
      return NextResponse.json({ succes: true, jours, message: jours ? `${jours} jour(s) retiré(s) du planning${remplacantId ? " et confié(s) au remplaçant" : ""}.` : "Aucun jour à retirer." });
    }
    case "dupliquer": {
      const decalage = Date.now() - projet.dateDebut.getTime();
      const decale = (x: Date) => new Date(x.getTime() + decalage);
      const { id: _i, createdAt: _c, updatedAt: _u, affectations, depenses, jalons, ...base } = projet;
      const copie = await prisma.projet.create({
        data: {
          ...base, nom: `${projet.nom} (copie)`, statut: "PREVU", dateDebut: decale(projet.dateDebut), dateFin: projet.dateFin ? decale(projet.dateFin) : null,
          affectations: { create: affectations.map((x) => ({ salarieId: x.salarieId, du: decale(x.du), au: decale(x.au), heuresSemaine: x.heuresSemaine, role: x.role })) },
          depenses: { create: depenses.map((x) => ({ libelle: x.libelle, categorie: x.categorie, montant: x.montant, date: decale(x.date), prevu: true })) },
          jalons: { create: jalons.map((x) => ({ libelle: x.libelle, date: decale(x.date), montant: x.montant, facturation: x.facturation === "AUCUNE" ? "AUCUNE" : "A_FACTURER" })) },
        },
      });
      return NextResponse.json({ succes: true, id: copie.id });
    }
    default:
      return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
  }
  return NextResponse.json({ succes: true });
}

/** DELETE : le projet entier, ou ?quoi=affectation|temps|depense|frais&cle=ID pour une ligne */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const a = await accesProjets("projets.gerer");
  if (!a.ok) return a.refus;
  const { id } = await params;
  if (!(await charger(id, a.entrepriseId))) return NextResponse.json({ erreur: "Projet introuvable" }, { status: 404 });
  const quoi = request.nextUrl.searchParams.get("quoi");
  const cle = request.nextUrl.searchParams.get("cle") || "";
  if (quoi === "affectation") await prisma.affectationProjet.deleteMany({ where: { id: cle, projetId: id } });
  else if (quoi === "temps") await prisma.tempsProjet.deleteMany({ where: { id: cle, projetId: id } });
  else if (quoi === "depense") await prisma.depenseProjet.deleteMany({ where: { id: cle, projetId: id } });
  else if (quoi === "jalon") await prisma.jalonProjet.deleteMany({ where: { id: cle, projetId: id } });
  else if (quoi === "frais") await prisma.noteFrais.updateMany({ where: { id: cle, projetId: id }, data: { projetId: null } });
  else await prisma.projet.delete({ where: { id } });
  return NextResponse.json({ succes: true });
}
