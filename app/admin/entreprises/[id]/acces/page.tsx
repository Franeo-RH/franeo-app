import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import BoutonSupprimerAcces from "@/components/BoutonSupprimerAcces";
import FormulaireNouvelAcces from "@/components/FormulaireNouvelAcces";
import FormulaireModifierAcces from "@/components/FormulaireModifierAcces";

export default async function AccesEntreprise({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const entreprise = await prisma.entreprise.findUnique({
    where: { id },
    include: { utilisateurs: true },
  });

  if (!entreprise) redirect("/admin/entreprises");

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">👤 Gestion des accès</h1>
              <p className="text-gray-500 mt-1">{entreprise.nom}</p>
            </div>
            <Link
              href={`/admin/entreprises/${id}`}
              className="bg-white border px-5 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              ← Retour
            </Link>
          </div>

          {/* Liste des accès */}
          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h2 className="text-xl font-bold mb-6">Accès existants</h2>
            {entreprise.utilisateurs.length === 0 ? (
              <p className="text-gray-500">Aucun accès pour le moment.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Prénom</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entreprise.utilisateurs.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="py-3 font-semibold">{u.prenom}</td>
                      <td className="py-3">{u.email}</td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          <FormulaireModifierAcces
                            userId={u.id}
                            prenomActuel={u.prenom}
                            emailActuel={u.email}
                          />
                          <BoutonSupprimerAcces userId={u.id} entrepriseId={id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Ajouter un accès */}
          <div className="bg-white rounded-xl shadow p-8">
            <h2 className="text-xl font-bold mb-6">➕ Ajouter un accès</h2>
            <FormulaireNouvelAcces entrepriseId={id} />
          </div>

        </main>
      </div>
    </div>
  );
}