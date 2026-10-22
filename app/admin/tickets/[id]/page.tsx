import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import BoutonMessageTicket from "@/components/BoutonMessageTicket";
import BoutonCloturerTicket from "@/components/BoutonCloturerTicket";

export default async function DetailTicketAdmin({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      entreprise: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket) redirect("/admin/tickets");

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">{ticket.titre}</h1>
              <p className="text-gray-500 mt-1">{ticket.entreprise.nom}</p>
              <span className={`mt-2 inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                ticket.statut === "Ouvert" ? "bg-green-100 text-green-600" :
                ticket.statut === "En cours" ? "bg-orange-100 text-orange-600" :
                "bg-gray-100 text-gray-600"
              }`}>
                {ticket.statut}
              </span>
            </div>
            <div className="flex gap-3">
              <BoutonCloturerTicket ticketId={ticket.id} statut={ticket.statut} />
              <Link
                href="/admin/tickets"
                className="bg-white border px-5 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                ← Retour
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="font-bold mb-2">📋 Description</h2>
            <p className="text-gray-600">{ticket.description}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="font-bold mb-4">💬 Discussion</h2>
            {ticket.messages.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucun message pour le moment.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {ticket.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-4 rounded-xl max-w-2xl ${
                      m.role === "ADMIN"
                        ? "bg-orange-50 border border-orange-200 ml-auto"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-400 mb-1">
                      {m.role === "ADMIN" ? "Franeo" : m.auteur} — {new Date(m.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                    <p className="text-gray-700">{m.contenu}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {ticket.statut !== "Clôturé" && (
            <BoutonMessageTicket ticketId={ticket.id} role="ADMIN" auteur="Franeo" />
          )}

        </main>
      </div>
    </div>
  );
}