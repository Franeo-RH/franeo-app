import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonsPrestation from "@/components/BoutonsPrestation";
import { STATUTS_PRESTATION } from "@/lib/prestations";

export const dynamic = "force-dynamic";

export default async function AdminPrestations() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const commandes = await prisma.commandePrestation.findMany({
    where: { entreprise: { demo: false } },
    include: { entreprise: { select: { nom: true } } },
    orderBy: [{ statut: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  const aFaire = commandes.filter((c) => c.statut === "A_FAIRE");
  const autres = commandes.filter((c) => c.statut !== "A_FAIRE");

  const tableau = (liste: typeof commandes) => (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b">
          <th className="pb-3">Date</th>
          <th className="pb-3">Entreprise</th>
          <th className="pb-3">Prestation</th>
          <th className="pb-3">Salarié</th>
          <th className="pb-3">Montant</th>
          <th className="pb-3">Précisions</th>
          <th className="pb-3">Statut</th>
          <th className="pb-3"></th>
        </tr>
      </thead>
      <tbody>
        {liste.map((c) => (
          <tr key={c.id} className="border-b align-top">
            <td className="py-3 text-sm text-gray-500">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</td>
            <td className="py-3 font-semibold">{c.entreprise.nom}</td>
            <td className="py-3">{c.libelle}{c.quantite > 1 ? ` × ${c.quantite}` : ""}</td>
            <td className="py-3 text-sm">{c.salarie || "—"}</td>
            <td className="py-3 font-semibold">{c.total > 0 ? `${c.total} €` : "Inclus"}</td>
            <td className="py-3 text-sm text-gray-500" style={{ maxWidth: "260px" }}>{c.commentaire || "—"}</td>
            <td className="py-3 text-sm">{STATUTS_PRESTATION[c.statut] || c.statut}</td>
            <td className="py-3"><BoutonsPrestation id={c.id} statut={c.statut} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">
          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">🛒 Prestations commandées</h1>
            <p className="text-gray-500 mt-1">Les prestations payantes sont ajoutées automatiquement à la facture du mois de la commande (sauf si annulées).</p>
          </div>
          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h2 className="text-xl font-bold mb-4">⏳ À traiter ({aFaire.length})</h2>
            {aFaire.length === 0 ? <p className="text-gray-500">Rien à traiter. 🎉</p> : tableau(aFaire)}
          </div>
          {autres.length > 0 && (
            <div className="bg-white rounded-xl shadow p-8">
              <h2 className="text-xl font-bold mb-4">🗂️ Historique</h2>
              {tableau(autres)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
