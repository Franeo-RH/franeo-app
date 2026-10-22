import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export default async function AdminTickets() {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const tickets = await prisma.ticket.findMany({
    where: { entreprise: { demo: false } },
    include: {
      entreprise: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const ticketsOuverts = tickets.filter(t => t.statut === "Ouvert").length;
  const ticketsEnCours = tickets.filter(t => t.statut === "En cours").length;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} ticketsOuverts={ticketsOuverts} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">🎫 Tous les tickets RH</h1>
            <div className="flex gap-4 mt-3">
              <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm font-semibold">
                {ticketsOuverts} ouvert(s)
              </span>
              <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-semibold">
                {ticketsEnCours} en cours
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-8">
            {tickets.length === 0 ? (
              <p className="text-gray-500">Aucun ticket pour le moment.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Titre</th>
                    <th className="pb-3">Entreprise</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3">Dernier message</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-gray-50 transition">
                      <td className="py-3 font-semibold">{t.titre}</td>
                      <td className="py-3">{t.entreprise.nom}</td>
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
                        {t.messages[0]
                          ? `${t.messages[0].auteur} : ${t.messages[0].contenu.slice(0, 30)}...`
                          : "Aucun message"}
                      </td>
                      <td className="py-3 text-gray-500 text-sm">
                        {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/admin/tickets/${t.id}`}
                          className="text-orange-500 font-semibold hover:underline"
                        >
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