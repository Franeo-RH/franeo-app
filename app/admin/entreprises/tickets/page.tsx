import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonExportTickets from "@/components/BoutonExportTickets";

export default async function AdminTicketsFacturation() {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const entreprises = await prisma.entreprise.findMany({
    where: { demo: false },
    include: {
      abonnement: true,
    },
    orderBy: { nom: "asc" },
  });

  const lignes = entreprises.map((e) => {
    const ticketsInclus = e.abonnement?.ticketsRH || 0;
    const ticketsUtilises = e.ticketsUtilises || 0;
    const ticketsSupp = Math.max(ticketsUtilises - ticketsInclus, 0);
    const prixTicketSupp = e.abonnement?.prixTicketSupp || 0;
    const montantAFacturer = ticketsSupp * prixTicketSupp;

    return {
      id: e.id,
      nom: e.nom,
      abonnement: e.abonnement?.nom || "—",
      ticketsInclus,
      ticketsUtilises,
      ticketsRestants: Math.max(ticketsInclus - ticketsUtilises, 0),
      ticketsSupp,
      prixTicketSupp,
      montantAFacturer,
    };
  });

  const totalAFacturer = lignes.reduce((acc, l) => acc + l.montantAFacturer, 0);
  const totalTicketsSupp = lignes.reduce((acc, l) => acc + l.ticketsSupp, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">🎫 Tickets RH — Facturation</h1>
              <p className="text-gray-500 mt-1">Suivi des tickets utilisés et supplémentaires</p>
            </div>
            <BoutonExportTickets />
          </div>

          {/* Résumé global */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Tickets supp. total</p>
              <p className="text-4xl font-bold text-orange-500">{totalTicketsSupp}</p>
              <p className="text-gray-500 text-sm mt-1">sur toutes les entreprises</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Montant à facturer</p>
              <p className="text-4xl font-bold text-red-500">{totalAFacturer} €</p>
              <p className="text-gray-500 text-sm mt-1">tickets supplémentaires</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Entreprises concernées</p>
              <p className="text-4xl font-bold">{lignes.filter(l => l.ticketsSupp > 0).length}</p>
              <p className="text-gray-500 text-sm mt-1">avec tickets supplémentaires</p>
            </div>
          </div>

          {/* Tableau */}
          <div className="bg-white rounded-xl shadow p-8">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="pb-3">Entreprise</th>
                  <th className="pb-3">Abonnement</th>
                  <th className="pb-3">Inclus</th>
                  <th className="pb-3">Utilisés</th>
                  <th className="pb-3">Restants</th>
                  <th className="pb-3">Supplémentaires</th>
                  <th className="pb-3">Prix/ticket supp.</th>
                  <th className="pb-3 text-red-500">À facturer</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.id} className={`border-b hover:bg-gray-50 transition ${l.ticketsSupp > 0 ? "bg-red-50" : ""}`}>
                    <td className="py-3 font-semibold">{l.nom}</td>
                    <td className="py-3 text-sm">{l.abonnement}</td>
                    <td className="py-3">{l.ticketsInclus}</td>
                    <td className="py-3">{l.ticketsUtilises}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-sm font-semibold ${
                        l.ticketsRestants === 0 ? "bg-red-100 text-red-600" :
                        l.ticketsRestants <= 2 ? "bg-orange-100 text-orange-600" :
                        "bg-green-100 text-green-600"
                      }`}>
                        {l.ticketsRestants}
                      </span>
                    </td>
                    <td className="py-3">
                      {l.ticketsSupp > 0 ? (
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-sm font-semibold">
                          +{l.ticketsSupp}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 text-sm">{l.prixTicketSupp} €</td>
                    <td className="py-3 font-bold text-red-500">
                      {l.montantAFacturer > 0 ? `${l.montantAFacturer} €` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={7} className="pt-4 font-bold">Total à facturer</td>
                  <td className="pt-4 font-bold text-red-500 text-xl">{totalAFacturer} €</td>
                </tr>
              </tfoot>
            </table>
          </div>

        </main>
      </div>
    </div>
  );
}