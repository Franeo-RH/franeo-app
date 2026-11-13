import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesProjets, lire } from "@/lib/projets-serveur";
import { STATUTS_FACTURE, TYPES_FACTURE } from "@/lib/projets-constantes";
import { calculRegie, dejaFacture, echeanceDefaut, prochainNumero } from "@/lib/facturation-projets";
import { arrondi, prixVendu } from "@/lib/projets";

type Ligne = { libelle: string; quantite: number; unite: string; prixUnitaire: number };

/** GET : factures (?projetId=&statut=) ; ?format=csv pour l'export comptable */
export async function GET(request: NextRequest) {
  const a = await accesProjets("projets.couts");
  if (!a.ok) return a.refus;
  const q = request.nextUrl.searchParams;
  const factures = await prisma.factureProjet.findMany({
    where: { entrepriseId: a.entrepriseId, ...(q.get("projetId") ? { projetId: q.get("projetId")! } : {}), ...(q.get("statut") ? { statut: q.get("statut")! } : {}) },
    orderBy: [{ date: "desc" }, { numero: "desc" }],
    include: { projet: { select: { id: true, nom: true, client: true, couleur: true } } },
  });
  if (q.get("format") === "csv") {
    const e = (n: number) => String(n).replace(".", ",");
    const lignes = [["Numéro", "Date", "Échéance", "Client", "Projet", "Type", "Total HT", "TVA %", "Total TTC", "Statut", "Payée le"], ...factures.map((f) => [
      f.numero, f.date.toLocaleDateString("fr-FR"), f.echeance.toLocaleDateString("fr-FR"), f.projet.client ?? "", f.projet.nom,
      TYPES_FACTURE[f.type as keyof typeof TYPES_FACTURE] ?? f.type, e(f.totalHT), e(f.tauxTva), e(f.totalTTC),
      STATUTS_FACTURE[f.statut as keyof typeof STATUTS_FACTURE]?.label ?? f.statut, f.payeeLe?.toLocaleDateString("fr-FR") ?? "",
    ])];
    const csv = "﻿" + lignes.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="factures-${new Date().toISOString().slice(0, 10)}.csv"` } });
  }
  return NextResponse.json({ factures, peutGerer: a.peutGerer });
}

/**
 * POST { projetId, type, tauxTva?, echeance?, apercu? } + selon le type :
 * - JALON { jalonId } : facture l'échéance (le jalon passe « Facturé »)
 * - ACOMPTE { pct | montant }
 * - SITUATION { avancement } : prix × avancement % − déjà facturé
 * - REGIE { du, au } : temps passé sur la période × taux journalier
 * - MENSUELLE { mois: "AAAA-MM" } : contrat récurrent
 * - SOLDE : reste à facturer
 * - AVOIR { montant, motif }
 * apercu: true calcule sans enregistrer.
 */
export async function POST(request: NextRequest) {
  const a = await accesProjets("projets.couts");
  if (!a.ok) return a.refus;
  if (!a.peutGerer) return NextResponse.json({ erreur: "Action non autorisée" }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const projet = await prisma.projet.findFirst({ where: { id: String(b.projetId), entrepriseId: a.entrepriseId } });
  if (!projet) return NextResponse.json({ erreur: "Projet introuvable" }, { status: 404 });
  const type = String(b.type);
  if (!(type in TYPES_FACTURE)) return NextResponse.json({ erreur: "Type de facture inconnu" }, { status: 400 });
  const vendu = arrondi(prixVendu(projet));
  const deja = await dejaFacture(projet.id);
  const erreur = (t: string) => NextResponse.json({ erreur: t }, { status: 400 });
  let lignes: Ligne[] = [];
  let jalonId: string | null = null, periodeDu: string | null = null, periodeAu: string | null = null;
  let avertissement: string | null = null;

  switch (type) {
    case "JALON": {
      const j = await prisma.jalonProjet.findFirst({ where: { id: String(b.jalonId), projetId: projet.id } });
      if (!j || !j.montant) return erreur("Échéance introuvable ou sans montant.");
      if (j.facturation === "FACTURE" || j.facturation === "PAYE") return erreur("Cette échéance est déjà facturée.");
      lignes = [{ libelle: j.libelle, quantite: 1, unite: "forfait", prixUnitaire: j.montant }];
      jalonId = j.id;
      break;
    }
    case "ACOMPTE": {
      const pct = lire.n(b.pct), m = lire.n(b.montant);
      const montant = m ?? (pct ? arrondi((vendu * pct) / 100) : 0);
      if (!montant || montant <= 0) return erreur("Indiquez un pourcentage ou un montant.");
      lignes = [{ libelle: pct ? `Acompte de ${pct} % sur ${projet.nom}` : `Acompte sur ${projet.nom}`, quantite: 1, unite: "forfait", prixUnitaire: montant }];
      break;
    }
    case "SITUATION": {
      const av = lire.n(b.avancement);
      if (av == null || av <= 0 || av > 100) return erreur("Avancement entre 1 et 100 %.");
      if (!vendu) return erreur("Le projet n'a pas de prix de vente.");
      const cumul = arrondi((vendu * av) / 100);
      const montant = arrondi(cumul - deja);
      if (montant <= 0) return erreur(`Rien à facturer : ${deja.toLocaleString("fr-FR")} € déjà facturés pour ${cumul.toLocaleString("fr-FR")} € à ${av} % d'avancement.`);
      lignes = [{ libelle: `Situation de travaux — avancement ${av} % (${cumul.toLocaleString("fr-FR")} € cumulés, déjà facturé ${deja.toLocaleString("fr-FR")} €)`, quantite: 1, unite: "forfait", prixUnitaire: montant }];
      break;
    }
    case "REGIE": {
      const ok = (x: unknown) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x);
      if (!ok(b.du) || !ok(b.au) || b.au < b.du) return erreur("Période invalide.");
      if (!projet.tauxJournalier) return erreur("Indiquez le taux journalier du projet (Modifier le projet).");
      const r = await calculRegie(projet.id, b.du, b.au);
      if (!r.parSalarie.length) return erreur("Aucun temps passé sur cette période.");
      lignes = r.parSalarie.map((x) => ({ libelle: `${x.salarie} — ${x.heures.toLocaleString("fr-FR")} h`, quantite: x.jours, unite: "jour", prixUnitaire: r.taux }));
      periodeDu = b.du; periodeAu = b.au;
      if (r.chevauchements.length) avertissement = `Attention : période déjà facturée en partie (${r.chevauchements.map((c) => c.numero).join(", ")}).`;
      break;
    }
    case "MENSUELLE": {
      if (!projet.montantMensuel) return erreur("Indiquez le montant mensuel du contrat (Modifier le projet).");
      const mois = typeof b.mois === "string" && /^\d{4}-\d{2}$/.test(b.mois) ? b.mois : new Date().toISOString().slice(0, 7);
      const [y, m] = mois.split("-").map(Number);
      periodeDu = `${mois}-01`; periodeAu = `${mois}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
      const existe = await prisma.factureProjet.findFirst({ where: { projetId: projet.id, type: "MENSUELLE", periodeDu, statut: { not: "ANNULEE" } }, select: { numero: true } });
      if (existe) return erreur(`Ce mois est déjà facturé (${existe.numero}).`);
      lignes = [{ libelle: `${projet.nom} — ${new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })}`, quantite: 1, unite: "mois", prixUnitaire: projet.montantMensuel }];
      break;
    }
    case "SOLDE": {
      const montant = arrondi(vendu - deja);
      if (montant <= 0) return erreur("Rien à facturer : tout le montant vendu est déjà facturé.");
      lignes = [{ libelle: `Solde — ${projet.nom} (vendu ${vendu.toLocaleString("fr-FR")} €, déjà facturé ${deja.toLocaleString("fr-FR")} €)`, quantite: 1, unite: "forfait", prixUnitaire: montant }];
      break;
    }
    case "AVOIR": {
      const m = lire.n(b.montant);
      if (!m || m <= 0) return erreur("Indiquez le montant de l'avoir.");
      lignes = [{ libelle: `Avoir — ${lire.t(b.motif, 200) ?? projet.nom}`, quantite: 1, unite: "forfait", prixUnitaire: -m }];
      break;
    }
  }

  const tauxTva = [0, 5.5, 10, 20].includes(Number(b.tauxTva)) ? Number(b.tauxTva) : 20;
  const totalHT = arrondi(lignes.reduce((t, l) => t + l.quantite * l.prixUnitaire, 0));
  const totalTTC = arrondi(totalHT * (1 + tauxTva / 100));
  if (b.apercu) return NextResponse.json({ apercu: true, lignes, totalHT, totalTTC, tauxTva, avertissement, dejaFacture: deja, vendu });

  const date = new Date();
  const echeance = lire.d(b.echeance) ?? echeanceDefaut(date);
  const f = await prisma.factureProjet.create({
    data: { entrepriseId: a.entrepriseId, projetId: projet.id, jalonId, numero: await prochainNumero(a.entrepriseId, "F", date), type, date, echeance, lignes, totalHT, tauxTva, totalTTC, periodeDu, periodeAu, note: lire.t(b.note, 500) },
  });
  if (jalonId) await prisma.jalonProjet.update({ where: { id: jalonId }, data: { facturation: "FACTURE" } });
  return NextResponse.json({ succes: true, id: f.id, numero: f.numero, avertissement });
}
