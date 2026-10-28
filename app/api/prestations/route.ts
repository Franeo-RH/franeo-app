import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { PRESTATIONS, prixPrestation } from "@/lib/prestations";
import { notifierAdmin } from "@/lib/notifications";

// Commande d'une prestation par un client (le prix est toujours recalculé ici, jamais pris du navigateur)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { code, quantite, salarie, commentaire, accepte } = await request.json();
  const prestation = PRESTATIONS.find((p) => p.code === code);
  if (!prestation) return NextResponse.json({ erreur: "Prestation inconnue." }, { status: 400 });

  const entreprise = await prisma.entreprise.findUnique({
    where: { id: session.entrepriseId },
    include: { abonnementPaie: { select: { code: true, nom: true } } },
  });
  if (!entreprise?.abonnementPaie) {
    return NextResponse.json({ erreur: "Les prestations sont réservées aux clients ayant une formule paie." }, { status: 403 });
  }

  const prix = prixPrestation(code, entreprise.abonnementPaie.code);
  if (prix === null) {
    return NextResponse.json({ erreur: "Cette prestation n'est pas proposée avec votre formule." }, { status: 400 });
  }
  const qte = Math.min(Math.max(parseInt(String(quantite || 1), 10) || 1, 1), 500);
  const total = Math.round(prix * qte * 100) / 100;

  // Prestation payante : accord explicite du client
  if (total > 0 && accepte !== true) {
    return NextResponse.json({ erreur: "Merci de confirmer votre accord sur le prix." }, { status: 400 });
  }

  // Démo : on montre le parcours complet, mais rien n'est enregistré ni facturé
  if (entreprise.demo) {
    return NextResponse.json({ succes: true, simule: true });
  }

  const maintenant = new Date();
  const commande = await prisma.commandePrestation.create({
    data: {
      entrepriseId: entreprise.id,
      code,
      libelle: prestation.libelle,
      quantite: qte,
      prixUnitaire: prix,
      total,
      salarie: typeof salarie === "string" && salarie.trim() ? salarie.trim().slice(0, 120) : null,
      commentaire: typeof commentaire === "string" && commentaire.trim() ? commentaire.trim().slice(0, 1000) : null,
      auteur: `${session.prenom} (${session.email})`,
      mois: maintenant.getMonth() + 1,
      annee: maintenant.getFullYear(),
    },
  });

  await notifierAdmin({
    sujet: `Prestation commandée — ${entreprise.nom}`,
    titre: "🛒 Nouvelle prestation commandée",
    lignes: [
      `Entreprise : ${entreprise.nom} (formule ${entreprise.abonnementPaie.nom})`,
      `Prestation : ${prestation.libelle}${qte > 1 ? ` × ${qte}` : ""}`,
      ...(commande.salarie ? [`Salarié : ${commande.salarie}`] : []),
      total > 0 ? `Montant : ${total} € (accord du client donné)` : "Incluse dans la formule",
      ...(commande.commentaire ? [`Précisions : ${commande.commentaire}`] : []),
      `Demandé par : ${commande.auteur}`,
    ],
    lien: "/admin/entreprises/prestations",
    entrepriseId: entreprise.id,
  });

  return NextResponse.json({ succes: true, commande });
}
