import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { quotaTickets, ticketsDuMois } from "@/lib/facturation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import BoutonExport from "@/components/BoutonExport";

export default async function ClientTickets() {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");

  if (!session.entreprise?.permissions.includes("tickets")) {
    redirect("/client/dashboard");
  }



  // Requêtes lancées en même temps
  const [entreprise, tickets] = await Promise.all([
    prisma.entreprise.findUnique({
      where: { id: session.entrepriseId! },
      include: { abonnement: true, abonnementPaie: true },
    }),
    prisma.ticket.findMany({
      where: { entrepriseId: session.entrepriseId! },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Tickets inclus = abonnement RH + formule paie ; comptés sur le mois en cours (non reportés)
  const maintenant = new Date();
  const ticketsInclus = entreprise ? quotaTickets(entreprise).inclus : 0;
  const ticketsUtilises = await ticketsDuMois(session.entrepriseId!, maintenant.getMonth() + 1, maintenant.getFullYear());
  const ticketsRestants = Math.max(ticketsInclus - ticketsUtilises, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <h1 className="text-3xl font-bold">🎫 Tickets RH</h1>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <BoutonExport type="client-tickets" label="📊 Exporter Excel" />
                </div>
              </div>
              <p className="text-gray-500 mt-1">
                {ticketsRestants} ticket(s) restant(s) sur {ticketsInclus} ce mois-ci
              </p>
            </div>
            <Link
              href="/client/tickets/nouveau"
              className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition"
            >
              ➕ Nouveau ticket
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow p-8">
            {tickets.length === 0 ? (
              <p className="text-gray-500">Aucun ticket pour le moment.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Titre</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-gray-50 transition">
                      <td className="py-3 font-semibold">{t.titre}</td>
                      <td className="py-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          t.statut === "Ouvert" ? "bg-green-100 text-green-600" :
                          t.statut === "En cours" ? "bg-orange-100 text-orange-600" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {t.statut}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 text-sm">
                        {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3">
                        <Link href={`/client/tickets/${t.id}`} className="text-orange-500 font-semibold hover:underline">
                          Voir →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}