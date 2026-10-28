import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { BoutonExportComplet, BoutonImportAdmin, BoutonModifierAdmin, BoutonSupprimerAdmin } from "@/components/OutilsAdmin";

const CATEGORIES: Record<string, string> = {
  BUG: "🐛 Bug",
  QUESTION: "❓ Question",
  SUGGESTION: "💡 Suggestion",
  PROBLEME_TECHNIQUE: "⚙️ Problème technique",
};

export default async function AdminHelpdesk() {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const tickets = await prisma.ticketSupport.findMany({
    // la démo n'apparaît que par ses suggestions
    where: { OR: [{ entreprise: { demo: false } }, { categorie: "SUGGESTION" }] },
    include: { entreprise: true, messages: true },
    orderBy: { updatedAt: "desc" },
  });

  const ouverts = tickets.filter(t => t.statut !== "Clôturé").length;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">🆘 Helpdesk</h1>
            <div className="flex gap-4 mt-3">
              <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-semibold">
                {ouverts} ouvert(s)
              </span>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-semibold">
                {tickets.length} au total
              </span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap mb-4"><BoutonExportComplet jeu="helpdesk" /></div>

          <div className="bg-white rounded-xl shadow p-8">
            {tickets.length === 0 ? (
              <p className="text-gray-500">Aucun ticket support.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Entreprise</th>
                    <th className="pb-3">Titre</th>
                    <th className="pb-3">Catégorie</th>
                    <th className="pb-3">Messages</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-gray-50 transition">
                      <td className="py-3 text-sm">
                        {t.entreprise.nom}
                        {t.entreprise.demo && (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-600">Démo</span>
                        )}
                      </td>
                      <td className="py-3 font-semibold">{t.titre}</td>
                      <td className="py-3 text-sm">{CATEGORIES[t.categorie] || t.categorie}</td>
                      <td className="py-3 text-sm text-gray-500">{t.messages.length}</td>
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
                        <div className="flex gap-1 flex-wrap items-center">
                          <Link href={`/admin/helpdesk/${t.id}`} className="text-orange-500 font-semibold hover:underline">
                            Voir →
                          </Link>
                          <BoutonModifierAdmin modele="ticketSupport" id={t.id} valeurs={{ titre: t.titre, statut: t.statut }} />
                          <BoutonSupprimerAdmin modele="ticketSupport" id={t.id} quoi="ce ticket support" />
                        </div>
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