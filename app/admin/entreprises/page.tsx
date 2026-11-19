import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import ListeEntreprisesAdmin, { type CarteEntreprise } from "@/components/ListeEntreprisesAdmin";
import BoutonExport from "@/components/BoutonExport";
import { BoutonExportComplet, BoutonImportAdmin } from "@/components/OutilsAdmin";

export default async function AdminEntreprises() {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");



  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

  // Requêtes lancées en même temps
  const [entreprises, demandesEnAttente, factures, tickets, absences, demandesSal, evolutions, devis, services] = await Promise.all([
    prisma.entreprise.findMany({
      where: { demo: false },
      include: {
        abonnement: { select: { nom: true } },
        abonnementPaie: { select: { nom: true } },
        cabinet: { select: { nom: true } },
        _count: { select: { utilisateurs: true, salaries: { where: { statut: "Actif", OR: [{ dateFin: null }, { dateFin: { gte: maintenant } }] } } } },
      },
      orderBy: { nom: "asc" },
    }),
    prisma.demandeEvolution.count({ where: { statut: "En attente", entreprise: { demo: false } } }),
    prisma.facturation.findMany({ where: { entreprise: { demo: false } }, select: { entrepriseId: true, mois: true, annee: true, montant: true, statut: true } }),
    prisma.ticket.groupBy({ by: ["entrepriseId"], where: { statut: { not: "Clôturé" }, entreprise: { demo: false } }, _count: { _all: true } }),
    prisma.absence.groupBy({ by: ["entrepriseId"], where: { statut: "En attente", entreprise: { demo: false } }, _count: { _all: true } }),
    prisma.demandeSalarie.groupBy({ by: ["entrepriseId"], where: { statut: "EN_ATTENTE", entreprise: { demo: false } }, _count: { _all: true } }),
    prisma.demandeEvolution.groupBy({ by: ["entrepriseId"], where: { statut: "En attente", entreprise: { demo: false } }, _count: { _all: true } }),
    prisma.devis.groupBy({ by: ["entrepriseId"], where: { statut: "EN_ATTENTE", entreprise: { demo: false } }, _count: { _all: true } }),
    prisma.demandeService.groupBy({ by: ["entrepriseId"], where: { statut: { in: ["EN_ATTENTE", "EN_COURS"] }, entreprise: { demo: false } }, _count: { _all: true } }),
  ]);
  const compte = (g: { entrepriseId: string; _count: { _all: number } }[]) => new Map(g.map((x) => [x.entrepriseId, x._count._all]));
  const [mT, mA, mD, mE, mV, mS] = [compte(tickets), compte(absences), compte(demandesSal), compte(evolutions), compte(devis), compte(services)];

  const cartes: CarteEntreprise[] = entreprises.map((e) => {
    const f = factures.filter((x) => x.entrepriseId === e.id);
    const derniere = [...f].sort((x, y) => y.annee - x.annee || y.mois - x.mois)[0];
    const enCours = [
      { n: mE.get(e.id) ?? 0, label: ["changement d'abonnement", "changements d'abonnement"], href: "/admin/entreprises/demandes" },
      { n: mV.get(e.id) ?? 0, label: ["devis à chiffrer", "devis à chiffrer"], href: "/admin/entreprises/devis" },
      { n: mS.get(e.id) ?? 0, label: ["demande d'app ou d'option", "demandes d'apps ou d'options"], href: "/admin/entreprises/demandes-services" },
      { n: mD.get(e.id) ?? 0, label: ["demande salarié à valider", "demandes salariés à valider"], href: "/admin/paie/demandes" },
    ].filter((x) => x.n > 0).map((x) => ({ label: `${x.n} ${x.label[x.n > 1 ? 1 : 0]}`, href: x.href }));
    return {
      id: e.id, nom: e.nom, ville: e.ville, actif: e.actif,
      formuleRH: e.abonnement?.nom ?? null, formulePaie: e.abonnementPaie?.nom ?? null, cabinet: e.cabinet?.nom ?? null,
      remisePct: e.remisePct, codeParrainage: e.codeParrainage, debutContrat: (e.dateDebutContrat ?? e.createdAt).toISOString(),
      salaries: e._count.salaries, comptes: e._count.utilisateurs, tickets: mT.get(e.id) ?? 0, absences: mA.get(e.id) ?? 0, demandesSalaries: mD.get(e.id) ?? 0,
      caAnnee: f.filter((x) => x.annee === annee).reduce((t, x) => t + x.montant, 0),
      caTotal: f.reduce((t, x) => t + x.montant, 0),
      impaye: f.filter((x) => x.statut !== "Payé").reduce((t, x) => t + x.montant, 0),
      dernierMois: derniere ? `${MOIS[derniere.mois - 1]} ${derniere.annee} · ${derniere.statut}` : null,
      enCours,
    };
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} demandesEnAttente={demandesEnAttente} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">🏢 Entreprises</h1>
              <p className="text-gray-500 mt-1">{entreprises.filter((e) => e.actif).length} active(s) · {entreprises.filter((e) => !e.actif).length} suspendue(s)</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <a href="/api/admin/import?jeu=client" className="border border-green-600 text-green-700 px-4 py-2 rounded-lg font-semibold">📄 Fichier nouveau client (Excel)</a>
              <BoutonImportAdmin jeu="client" label="📤 Créer un client depuis le fichier" />
              <BoutonExportComplet jeu="entreprises" label="📥 Export complet (entreprises + comptes)" />
              <BoutonExportComplet jeu="comptes" label="📥 Comptes utilisateurs" />
              <Link
                href="/admin/entreprises/nouveau"
                className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition"
              >
                + Ajouter une entreprise
              </Link>
            </div>
          </div>

          {entreprises.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-gray-500">Aucune entreprise pour le moment.</div>
          ) : (
            <ListeEntreprisesAdmin entreprises={cartes} annee={annee} />
          )}

        </main>
      </div>
    </div>
  );
}