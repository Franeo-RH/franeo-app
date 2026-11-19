import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { lignesFacturesMois, texteLigne, totalLignes } from "@/lib/facturation";

/**
 * Génère d'un coup les factures du mois pour tous les clients actifs (hors démo) qui n'en ont pas encore.
 * Même calcul que la facture d'un client (lib/facturation : abonnements, suppléments, remises), en quelques requêtes.
 * Corps facultatif : { mois, annee } (par défaut le mois en cours).
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }
  const corps = await req.json().catch(() => ({}));
  const maintenant = new Date();
  const mois = Number(corps?.mois) || maintenant.getMonth() + 1;
  const annee = Number(corps?.annee) || maintenant.getFullYear();
  if (mois < 1 || mois > 12 || annee < 2020 || annee > 2100) {
    return NextResponse.json({ erreur: "Mois invalide" }, { status: 400 });
  }

  const [entreprises, existantes] = await Promise.all([
    prisma.entreprise.findMany({ where: { demo: false, actif: true }, select: { id: true, nom: true } }),
    prisma.facturation.findMany({ where: { mois, annee }, select: { entrepriseId: true } }),
  ]);
  const dejaFacturees = new Set(existantes.map((f) => f.entrepriseId));
  const cibles = entreprises.filter((e) => !dejaFacturees.has(e.id));
  const lignesParId = await lignesFacturesMois(mois, annee, cibles.map((e) => e.id));

  const resultats: { entreprise: string; montant: number }[] = [];
  for (const e of cibles) {
    const lignes = lignesParId.get(e.id) ?? [];
    const montant = totalLignes(lignes);
    if (montant <= 0) continue;
    await prisma.facturation.create({
      data: {
        entrepriseId: e.id,
        mois,
        annee,
        montant,
        dateLimitePaie: new Date(annee, mois, 0),
        commentaire: lignes.map(texteLigne).join(" | "),
      },
    });
    resultats.push({ entreprise: e.nom, montant });
  }

  return NextResponse.json({ succes: true, mois, annee, facturations: resultats, ignorees: dejaFacturees.size });
}
