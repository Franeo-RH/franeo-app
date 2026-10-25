import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import DashboardOnglets from "@/components/DashboardOnglets";
import BlocEcheances from "@/components/BlocEcheances";
import { chargerEcheances } from "@/lib/rappels-serveur";
import BoutonResetDemo from "@/components/BoutonResetDemo";

export const dynamic = "force-dynamic";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default async function AdminDashboard() {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const maintenant = new Date();
  const moisActuel = maintenant.getMonth() + 1;
  const anneeActuelle = maintenant.getFullYear();

  const filtreClients = { demo: false, actif: true };

  // Toutes les requêtes partent en même temps (au lieu de 13 à la suite)
  const [
    entreprises,
    abonnements,
    abonnementsPaie,
    entreprisesPaie,
    nbTicketsRH,
    nbTicketsSupport,
    nbAbsences,
    nbVariables,
    nbDemandes,
    echeances,
    facturationsAnnee,
  ] = await Promise.all([
    prisma.entreprise.findMany({
      where: filtreClients,
      select: { abonnement: { select: { prixMensuel: true } }, _count: { select: { salaries: true } } },
    }),
    prisma.abonnement.findMany({
      include: { _count: { select: { entreprises: { where: filtreClients } } } },
      orderBy: { prixMensuel: "asc" },
    }),
    prisma.abonnementPaie.findMany({ orderBy: { prixMensuel: "asc" } }),
    prisma.entreprise.findMany({
      where: { ...filtreClients, abonnementPaieId: { not: null } },
      select: { abonnementPaieId: true },
    }),
    prisma.ticket.count({ where: { statut: { not: "Clôturé" }, entreprise: filtreClients } }),
    prisma.ticketSupport.count({
      where: { statut: { not: "Clôturé" }, OR: [{ entreprise: filtreClients }, { categorie: "SUGGESTION" }] }, // la démo ne remonte que par ses suggestions
    }),
    prisma.absence.count({ where: { statut: "En attente", entreprise: filtreClients } }),
    prisma.variablePaie.count({ where: { statut: "En attente", mois: moisActuel, annee: anneeActuelle, entreprise: filtreClients } }),
    prisma.demandeEvolution.count({ where: { statut: "En attente", entreprise: filtreClients } }),
    // Échéances des salariés (tous clients) : retards + 60 prochains jours
    chargerEcheances({ sansDemo: true }),
    // Facturation de l'année (le mois en cours en est extrait)
    prisma.facturation.findMany({
      where: { annee: anneeActuelle, entreprise: { demo: false } },
      select: { mois: true, montant: true, statut: true },
    }),
  ]);

  const totalEntreprises = entreprises.length;
  const totalSalaries = entreprises.reduce((acc, e) => acc + e._count.salaries, 0);
  const facturationsMois = facturationsAnnee.filter((f) => f.mois === moisActuel);

  // CA mensuel réel (factures générées ce mois)
  const caMensuelReel = facturationsMois.reduce((acc, f) => acc + f.montant, 0);
  // CA mensuel prévisionnel (abonnements de base)
  const caMensuelPrev = entreprises.reduce((acc, e) => acc + (e.abonnement?.prixMensuel || 0), 0);

  // CA annuel réel (somme des factures générées cette année)
  const caAnnuelReel = facturationsAnnee.reduce((acc, f) => acc + f.montant, 0);

  // CA annuel prévisionnel = réel passé + abonnements de base pour mois restants
  const moisRestants = 12 - moisActuel;
  const caAnnuelPrev = caAnnuelReel + (caMensuelPrev * moisRestants);

  // Grille 12 mois pour onglets
  const grilleMois = MOIS.map((nomMois, i) => {
    const moisNum = i + 1;
    const facts = facturationsAnnee.filter(f => f.mois === moisNum);
    const montantReel = facts.reduce((acc, f) => acc + f.montant, 0);
    const montantPrev = entreprises.reduce((acc, e) => acc + (e.abonnement?.prixMensuel || 0), 0);
    const genere = facts.length > 0;
    return { moisNum, nomMois, montantReel, montantPrev, genere, facts };
  });

  const tuiles = [
    { href: "/admin/entreprises", icone: "🏢", label: "Entreprises", n: totalEntreprises, couleur: "text-gray-800" },
    { href: "/admin/salaries", icone: "👥", label: "Salariés", n: totalSalaries, couleur: "text-gray-800" },
    { href: "/admin/tickets", icone: "🎫", label: "Tickets RH", n: nbTicketsRH, couleur: "text-orange-500" },
    { href: "/admin/helpdesk", icone: "🆘", label: "Helpdesk", n: nbTicketsSupport, couleur: "text-red-500" },
    { href: "/admin/paie/absences", icone: "📅", label: "Absences", n: nbAbsences, couleur: "text-orange-500" },
    { href: "/admin/paie/variables", icone: "💰", label: "Variables", n: nbVariables, couleur: "text-orange-500" },
    { href: "/admin/entreprises/demandes", icone: "📩", label: "Évolutions", n: nbDemandes, couleur: "text-orange-500" },
    { href: "/admin/salaries", icone: "⏰", label: "Échéances", n: echeances.length, couleur: "text-red-500" },
  ];
  const caMois = Math.round(facturationsMois.length > 0 ? caMensuelReel : caMensuelPrev);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <main className="px-6 py-4 flex flex-col gap-4">

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <h1 className="text-xl font-bold" style={{ margin: 0 }}>📊 Dashboard</h1>
          <BoutonResetDemo />
        </div>

        <div className="fr-grille-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl shadow px-6 py-4 text-white">
            <p className="text-orange-100 text-xs font-semibold uppercase">💰 CA {MOIS[moisActuel - 1]}</p>
            <p className="text-4xl font-bold">{caMois.toLocaleString("fr-FR")} €</p>
          </div>
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl shadow px-6 py-4 text-white">
            <p className="text-gray-300 text-xs font-semibold uppercase">📅 CA annuel {anneeActuelle}</p>
            <p className="text-4xl font-bold">{Math.round(caAnnuelPrev).toLocaleString("fr-FR")} €</p>
          </div>
        </div>

        <div className="fr-grille-tuiles" style={{ display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: "0.75rem" }}>
          {tuiles.map((t) => (
            <Link key={t.label} href={t.href} className="bg-white rounded-2xl shadow p-3 text-center hover:shadow-md transition">
              <p className="text-2xl">{t.icone}</p>
              <p className={`text-3xl font-bold leading-tight ${t.couleur}`}>{t.n}</p>
              <p className="text-gray-400 text-[11px] font-semibold uppercase">{t.label}</p>
            </Link>
          ))}
        </div>

        <div className="fr-grille-2" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
          <DashboardOnglets grilleMois={grilleMois} annee={anneeActuelle} moisActuel={moisActuel} />
          <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-bold mb-2">📋 Abonnements RH</h2>
              <div className="flex flex-col gap-2">
                {abonnements.map((a) => {
                  const max = Math.max(...abonnements.map((x) => x._count.entreprises), 1);
                  return (
                    <div key={a.id}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="font-semibold">{a.nom}</span>
                        <span className="text-gray-500">{a._count.entreprises} · {Math.round(a._count.entreprises * a.prixMensuel).toLocaleString("fr-FR")} €</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-1.5 bg-orange-500 rounded-full" style={{ width: `${(a._count.entreprises / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold mb-2">💼 Abonnements Paie</h2>
              <div className="flex flex-col gap-2">
                {abonnementsPaie.map((a) => {
                  const nb = entreprisesPaie.filter((e) => e.abonnementPaieId === a.id).length;
                  const max = Math.max(...abonnementsPaie.map((x) => entreprisesPaie.filter((e) => e.abonnementPaieId === x.id).length), 1);
                  return (
                    <div key={a.id}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="font-semibold">{a.nom}</span>
                        <span className="text-gray-500">{nb} · {Math.round(nb * a.prixMensuel).toLocaleString("fr-FR")} €</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-1.5 bg-gray-800 rounded-full" style={{ width: `${(nb / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="max-h-[120px] flex flex-col">
          <BlocEcheances echeances={echeances} role="ADMIN" max={4} />
        </div>

      </main>
    </div>
  );
}
