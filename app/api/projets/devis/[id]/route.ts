import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesProjets, lire } from "@/lib/projets-serveur";
import { MODELES_METIER, type LigneDevis } from "@/lib/projets-constantes";
import { lireLignes, prochainNumero, totaux } from "@/lib/facturation-projets";
import { coutsSalaries, emetteur } from "@/lib/documents-projets";
import { arrondi } from "@/lib/projets";

type Ctx = { params: Promise<{ id: string }> };

async function charger(id: string, entrepriseId: string) {
  return prisma.devisProjet.findFirst({ where: { id, entrepriseId }, include: { projet: { select: { id: true, nom: true, modeVente: true, prixVente: true, dateDebut: true, dateFin: true } } } });
}

/** GET : devis, coûts horaires des salariés (pour chiffrer) et émetteur (pour imprimer) */
export async function GET(_r: NextRequest, { params }: Ctx) {
  const a = await accesProjets("projets.couts");
  if (!a.ok) return a.refus;
  const { id } = await params;
  const d = await charger(id, a.entrepriseId);
  if (!d) return NextResponse.json({ erreur: "Devis introuvable" }, { status: 404 });
  const [couts, em] = await Promise.all([coutsSalaries(a.entrepriseId), emetteur(a.entrepriseId)]);
  return NextResponse.json({ devis: { ...d, lignes: lireLignes(d.lignes) }, totaux: totaux(lireLignes(d.lignes), d.tauxTva), ...couts, emetteur: em, peutGerer: a.peutGerer });
}

/** PUT : enregistrer le devis (tant qu'il n'est pas accepté ou refusé) */
export async function PUT(request: NextRequest, { params }: Ctx) {
  const a = await accesProjets("projets.couts");
  if (!a.ok) return a.refus;
  if (!a.peutGerer) return NextResponse.json({ erreur: "Action non autorisée" }, { status: 403 });
  const { id } = await params;
  const d = await charger(id, a.entrepriseId);
  if (!d) return NextResponse.json({ erreur: "Devis introuvable" }, { status: 404 });
  if (d.statut === "ACCEPTE" || d.statut === "REFUSE") return NextResponse.json({ erreur: "Ce devis est clos : dupliquez-le pour le modifier." }, { status: 409 });
  const b = await request.json().catch(() => ({}));
  const lignes = lireLignes(b.lignes);
  const tauxTva = [0, 5.5, 10, 20].includes(Number(b.tauxTva)) ? Number(b.tauxTva) : 20;
  const t = totaux(lignes, tauxTva);
  const marge = lire.n(b.margeVisee), acompte = lire.n(b.acomptePct), validite = lire.n(b.validiteJours);
  await prisma.devisProjet.update({
    where: { id },
    data: {
      objet: lire.t(b.objet, 200) ?? d.objet, client: lire.t(b.client, 150), clientAdresse: lire.t(b.clientAdresse, 400), clientEmail: lire.t(b.clientEmail, 150),
      lignes, tauxTva, margeVisee: marge != null && marge >= 0 && marge < 95 ? marge : d.margeVisee,
      acomptePct: acompte != null && acompte > 0 && acompte <= 100 ? acompte : null, validiteJours: validite && validite > 0 ? Math.round(validite) : 30,
      conditions: lire.t(b.conditions, 2000), dateDebut: lire.d(b.dateDebut), dateFin: lire.d(b.dateFin),
      totalHT: t.totalHT, coutTotal: t.coutTotal,
    },
  });
  return NextResponse.json({ succes: true, totaux: t });
}

/**
 * POST { action } :
 * - envoyer / refuser / rouvrir
 * - accepter : crée le projet (budget, planning, frais prévus, échéancier) ou, pour des travaux supplémentaires,
 *   ajoute le montant au projet et une échéance à facturer
 * - dupliquer
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  const a = await accesProjets("projets.couts");
  if (!a.ok) return a.refus;
  if (!a.peutGerer) return NextResponse.json({ erreur: "Action non autorisée" }, { status: 403 });
  const { id } = await params;
  const d = await charger(id, a.entrepriseId);
  if (!d) return NextResponse.json({ erreur: "Devis introuvable" }, { status: 404 });
  const b = await request.json().catch(() => ({}));
  const lignes = lireLignes(d.lignes);
  const t = totaux(lignes, d.tauxTva);

  switch (b.action) {
    case "envoyer":
      if (!lignes.length) return NextResponse.json({ erreur: "Ajoutez au moins une ligne." }, { status: 400 });
      await prisma.devisProjet.update({ where: { id }, data: { statut: "ENVOYE", envoyeLe: new Date() } });
      return NextResponse.json({ succes: true });
    case "refuser":
      await prisma.devisProjet.update({ where: { id }, data: { statut: "REFUSE" } });
      return NextResponse.json({ succes: true });
    case "rouvrir":
      if (d.statut === "ACCEPTE") return NextResponse.json({ erreur: "Un devis accepté ne peut pas être rouvert." }, { status: 409 });
      await prisma.devisProjet.update({ where: { id }, data: { statut: "BROUILLON" } });
      return NextResponse.json({ succes: true });
    case "dupliquer": {
      const { id: _i, createdAt: _c, updatedAt: _u, projet: _p, numero: _n, statut: _s, envoyeLe: _e, accepteLe: _a, lignes: l, ...base } = d;
      const copie = await prisma.devisProjet.create({ data: { ...base, lignes: lireLignes(l), numero: await prochainNumero(a.entrepriseId, "D"), objet: `${d.objet} (copie)` } });
      return NextResponse.json({ succes: true, id: copie.id });
    }
    case "accepter": {
      if (d.statut === "ACCEPTE") return NextResponse.json({ erreur: "Devis déjà accepté." }, { status: 409 });
      if (!lignes.length || t.totalHT <= 0) return NextResponse.json({ erreur: "Le devis est vide." }, { status: 400 });
      const frais = lignes.filter((l) => l.type !== "MO" && l.coutUnitaire > 0).map((l) => ({ libelle: l.libelle, categorie: l.type === "DEPLACEMENT" ? "DEPLACEMENT" : l.type === "SOUS_TRAITANCE" ? "SOUS_TRAITANCE" : "MATERIEL", montant: arrondi(l.quantite * l.coutUnitaire), date: new Date(), prevu: true }));

      // Travaux supplémentaires sur un projet existant
      if (d.supplementaire && d.projet) {
        const p = d.projet;
        await prisma.projet.update({
          where: { id: p.id },
          data: {
            ...(p.modeVente === "FORFAIT" ? { prixVente: arrondi((p.prixVente ?? 0) + t.totalHT) } : {}),
            depenses: { create: frais },
            jalons: { create: [{ libelle: `Travaux supplémentaires ${d.numero} — ${d.objet}`, date: new Date(), montant: t.totalHT, facturation: "A_FACTURER" }] },
          },
        });
        await prisma.devisProjet.update({ where: { id }, data: { statut: "ACCEPTE", accepteLe: new Date() } });
        return NextResponse.json({ succes: true, projetId: p.id });
      }

      // Nouveau projet
      const debut = d.dateDebut ?? new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
      const m = d.modele ? MODELES_METIER[d.modele] : null;
      const fin = d.dateFin ?? new Date(debut.getTime() + Math.max(14, ...(m?.jalons.map((j) => j.jours) ?? [0]), ...(m?.echeancier.map((e) => e.jours) ?? [0])) * 86400000);
      const semaines = Math.max(1, (fin.getTime() - debut.getTime()) / (7 * 86400000));
      const parSalarie = new Map<string, number>();
      for (const l of lignes.filter((x) => x.type === "MO" && x.salarieId)) parSalarie.set(l.salarieId!, (parSalarie.get(l.salarieId!) ?? 0) + (/^j/.test(l.unite) ? l.quantite * 7 : l.quantite));
      const salariesOk = await prisma.salarie.findMany({ where: { id: { in: [...parSalarie.keys()] }, entrepriseId: a.entrepriseId }, select: { id: true } });
      const jour = (n: number) => new Date(debut.getTime() + n * 86400000);
      const echeancier: { libelle: string; date: Date; montant: number; facturation: string }[] = [];
      if (d.acomptePct) echeancier.push({ libelle: `Acompte ${d.acomptePct} % (devis ${d.numero})`, date: debut, montant: arrondi((t.totalHT * d.acomptePct) / 100), facturation: "A_FACTURER" });
      const reste = arrondi(t.totalHT - (echeancier[0]?.montant ?? 0));
      if (reste > 0) echeancier.push({ libelle: d.acomptePct ? "Solde" : `Facturation (devis ${d.numero})`, date: fin, montant: reste, facturation: "A_FACTURER" });

      const projet = await prisma.projet.create({
        data: {
          entrepriseId: a.entrepriseId, nom: d.objet, client: d.client, statut: "PREVU", dateDebut: debut, dateFin: fin, modeVente: "FORFAIT",
          prixVente: t.totalHT, budgetHeures: t.heuresMO || null, modele: d.modele, seuilAlerte: m?.seuilAlerte ?? 80,
          description: `Créé depuis le devis ${d.numero}.`,
          affectations: { create: salariesOk.map((s) => ({ salarieId: s.id, du: debut, au: new Date(fin.getTime() + 86399000), heuresSemaine: Math.min(60, Math.max(0.5, arrondi((parSalarie.get(s.id) ?? 0) / semaines, 1))) })) },
          depenses: { create: frais },
          jalons: { create: [...(m?.jalons ?? []).map((j) => ({ libelle: j.libelle, date: jour(j.jours) })), ...echeancier] },
        },
      });
      await prisma.devisProjet.update({ where: { id }, data: { statut: "ACCEPTE", accepteLe: new Date(), projetId: projet.id } });
      return NextResponse.json({ succes: true, projetId: projet.id });
    }
    default:
      return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
  }
}

/** DELETE : supprimer un devis non accepté */
export async function DELETE(_r: NextRequest, { params }: Ctx) {
  const a = await accesProjets("projets.couts");
  if (!a.ok) return a.refus;
  if (!a.peutGerer) return NextResponse.json({ erreur: "Action non autorisée" }, { status: 403 });
  const { id } = await params;
  const d = await charger(id, a.entrepriseId);
  if (!d) return NextResponse.json({ erreur: "Devis introuvable" }, { status: 404 });
  if (d.statut === "ACCEPTE") return NextResponse.json({ erreur: "Un devis accepté ne peut pas être supprimé." }, { status: 409 });
  await prisma.devisProjet.delete({ where: { id } });
  return NextResponse.json({ succes: true });
}
