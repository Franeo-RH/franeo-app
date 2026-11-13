import { NextRequest, NextResponse } from "next/server";
import { excelDepuisLignes, reponseExcel } from "@/lib/excel-marque";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

/** GET ?annee= : récapitulatif des factures du client (fichier CSV lisible par Excel), avec total */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (!aDroit(session.entreprise?.permissions, "entreprise.factures")) return NextResponse.json({ erreur: "Action non autorisée" }, { status: 403 });
  const annee = Number(request.nextUrl.searchParams.get("annee")) || null;
  const f = await prisma.facturation.findMany({
    where: { entrepriseId: session.entrepriseId, ...(annee ? { annee } : {}) },
    orderBy: [{ annee: "asc" }, { mois: "asc" }],
  });
  const lignes: (string | number)[][] = [["Mois", "Année", "Montant (€)", "Statut", "Date limite de paiement", "Détail"]];
  for (const x of f) {
    lignes.push([MOIS[x.mois - 1], x.annee, x.montant.toFixed(2).replace(".", ","), x.statut, x.dateLimitePaie ? new Date(x.dateLimitePaie).toLocaleDateString("fr-FR") : "", (x.commentaire || "").replace(/\n/g, " | ")]);
  }
  const total = f.reduce((a, x) => a + x.montant, 0);
  const paye = f.filter((x) => x.statut === "Payé").reduce((a, x) => a + x.montant, 0);
  lignes.push([], ["Total facturé", "", total.toFixed(2).replace(".", ",")], ["Dont payé", "", paye.toFixed(2).replace(".", ",")], ["Reste à payer", "", (total - paye).toFixed(2).replace(".", ",")]);
  lignes.push([], [`${session.entreprise?.nom ?? ""} — récapitulatif édité le ${new Date().toLocaleDateString("fr-FR")} — TVA non applicable, art. 293 B du CGI`]);
  return reponseExcel(await excelDepuisLignes("Factures", lignes, { entrepriseId: session.entrepriseId }), `recapitulatif-factures${annee ? `-${annee}` : ""}`);
}
