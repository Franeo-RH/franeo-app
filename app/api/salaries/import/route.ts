// app/api/salaries/import/route.ts
// POST : reçoit un fichier Excel, crée les salariés valides, renvoie le détail + un Excel des erreurs.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { evaluerSurcout, STATUT_ACCORD_REQUIS } from "@/lib/surcout";
import { aDroit, ajoutParValidation } from "@/lib/droits";
import { creerDemande } from "@/lib/demandes-salaries";
import { analyserTableau, type LigneErreur } from "@/lib/import-salaries";
import { fabriquerFichierErreurs, lireFichierExcel } from "@/lib/import-salaries-xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TAILLE_MAX = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getSession();
  const admin = session?.role === "ADMIN";
  if (!session || (!admin && (session.role !== "CLIENT" || !session.entrepriseId))) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const form = await req.formData();
  // L'admin importe pour l'entreprise choisie, sans demande de validation
  const entrepriseId = admin ? String(form.get("entrepriseId") || "") : session.entrepriseId!;
  if (!entrepriseId) return NextResponse.json({ erreur: "Choisissez l'entreprise." }, { status: 400 });

  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { permissions: true, demo: true, abonnementPaieId: true } });
  if (!entreprise) return NextResponse.json({ erreur: "Entreprise introuvable." }, { status: 404 });
  if (!admin) {
    if (!entreprise.permissions.includes("salaries")) {
      return NextResponse.json({ erreur: "Le module Salariés n'est pas activé sur votre espace." }, { status: 403 });
    }
    if (!aDroit(entreprise.permissions, "salaries.importer")) {
      return NextResponse.json({ erreur: "Vous n'avez pas le droit d'importer des salariés. Contactez votre gestionnaire." }, { status: 403 });
    }
  }

  if (entreprise.demo) {
    return NextResponse.json({ erreur: "L'import Excel n'est pas disponible dans la version démo." }, { status: 403 });
  }

  const fichier = form.get("fichier");
  if (!fichier || typeof fichier === "string") {
    return NextResponse.json({ erreur: "Aucun fichier reçu." }, { status: 400 });
  }
  if (fichier.size > TAILLE_MAX) {
    return NextResponse.json({ erreur: "Fichier trop volumineux (5 Mo maximum)." }, { status: 400 });
  }
  if (!/\.xlsx$/i.test(fichier.name)) {
    return NextResponse.json({ erreur: "Format non pris en charge : envoyez un fichier .xlsx (le modèle à télécharger)." }, { status: 400 });
  }

  let tableau: unknown[][];
  try {
    tableau = await lireFichierExcel(await fichier.arrayBuffer());
  } catch {
    return NextResponse.json({ erreur: "Impossible de lire ce fichier. Vérifiez qu'il s'agit bien d'un Excel (.xlsx)." }, { status: 400 });
  }

  const existants = await prisma.salarie.findMany({ where: { entrepriseId }, select: { matricule: true } });
  const analyse = analyserTableau(
    tableau,
    existants.map((s) => s.matricule ?? "")
  );
  if (analyse.erreurGlobale) {
    return NextResponse.json({ erreur: analyse.erreurGlobale }, { status: 400 });
  }

  const erreurs: LigneErreur[] = [...analyse.erreurs];
  const valeursDe = (d: (typeof analyse.valides)[number]["donnees"]): string[] => [
    d.matricule ?? "", d.prenom, d.nom, d.poste, d.typeContrat ?? "",
    d.dateDebut ? d.dateDebut.toISOString().slice(0, 10).split("-").reverse().join("/") : "",
    d.dateFin ? d.dateFin.toISOString().slice(0, 10).split("-").reverse().join("/") : "",
    d.heuresHebdomadaires?.toString() ?? "", d.salaireMensuel?.toString() ?? "", d.salaireAnnuel?.toString() ?? "",
    d.email ?? "", d.telephone ?? "",
  ];

  // Supplément (salariés / bulletins au-delà de la formule) : accord du client requis
  if (!admin && analyse.valides.length > 0 && form.get("accepteSurcout") !== "1") {
    const surcout = await evaluerSurcout(entrepriseId, { salaries: analyse.valides.length });
    if (surcout) {
      return NextResponse.json({ surcoutRequis: true, surcout }, { status: STATUT_ACCORD_REQUIS });
    }
  }

  // Client « paie » : chaque ligne valide devient une demande d'ajout, validée par le gestionnaire
  if (!admin && ajoutParValidation(entreprise)) {
    for (const v of analyse.valides) {
      await creerDemande({ entrepriseId, type: "AJOUT", donnees: v.donnees as unknown as Record<string, unknown>, auteur: `${session.prenom} (${session.email}) — import Excel` });
    }
    let fichierErreursD: string | null = null;
    if (erreurs.length > 0) fichierErreursD = (await fabriquerFichierErreurs(erreurs)).toString("base64");
    return NextResponse.json({
      crees: 0,
      demandes: analyse.valides.length,
      erreurs: erreurs.map((e) => ({ ligne: e.ligne, raisons: e.raisons })),
      fichierErreurs: fichierErreursD,
    });
  }

  let crees = 0;
  for (const v of analyse.valides) {
    try {
      await prisma.salarie.create({ data: { ...v.donnees, entrepriseId, statut: "Actif" } });
      crees++;
    } catch {
      // ex. matricule pris entre-temps (contrainte d'unicité)
      erreurs.push({ ligne: v.ligne, raisons: ["Enregistrement impossible (matricule déjà attribué ?)"], valeurs: valeursDe(v.donnees) });
    }
  }
  erreurs.sort((a, b) => a.ligne - b.ligne);

  let fichierErreurs: string | null = null;
  if (erreurs.length > 0) {
    fichierErreurs = (await fabriquerFichierErreurs(erreurs)).toString("base64");
  }

  return NextResponse.json({
    crees,
    erreurs: erreurs.map((e) => ({ ligne: e.ligne, raisons: e.raisons })),
    fichierErreurs,
  });
}
