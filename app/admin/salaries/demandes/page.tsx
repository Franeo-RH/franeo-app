import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonsDemandeSalarie from "@/components/BoutonsDemandeSalarie";
import StatutDemande from "@/components/StatutDemande";
import { LIBELLES_TYPE } from "@/lib/demandes-salaries";
import { BoutonExportComplet } from "@/components/OutilsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminDemandesSalaries() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const [enAttente, traitees] = await Promise.all([
    prisma.demandeSalarie.findMany({
      where: { statut: "EN_ATTENTE", entreprise: { demo: false } },
      include: { entreprise: { select: { nom: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.demandeSalarie.findMany({
      where: { statut: { not: "EN_ATTENTE" }, entreprise: { demo: false } },
      include: { entreprise: { select: { nom: true } } },
      orderBy: { traiteAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">
          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">📝 Demandes sur les salariés</h1>
            <div className="flex gap-2 flex-wrap mt-3"><BoutonExportComplet jeu="demandes" /></div>
            <p className="text-gray-500 mt-1">Ajouts, modifications et suppressions demandés par les clients en paie. Valider applique la modification.</p>
          </div>

          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h2 className="text-xl font-bold mb-4">⏳ À traiter ({enAttente.length})</h2>
            {enAttente.length === 0 ? (
              <p className="text-gray-500">Aucune demande en attente. 🎉</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Entreprise</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Détail</th>
                    <th className="pb-3">Demandé par</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {enAttente.map((d) => (
                    <tr key={d.id} className="border-b align-top">
                      <td className="py-3 text-sm text-gray-500">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3 font-semibold">{d.entreprise.nom}</td>
                      <td className="py-3">{LIBELLES_TYPE[d.type] || d.type}</td>
                      <td className="py-3 text-sm" style={{ maxWidth: "420px" }}>
                        {d.resume}
                        {d.salarieId && d.type !== "SUPPRESSION" && (
                          <> · <Link href={`/admin/salaries/${d.salarieId}`} className="text-orange-600 hover:underline">fiche</Link></>
                        )}
                      </td>
                      <td className="py-3 text-sm text-gray-500">{d.auteur || "—"}</td>
                      <td className="py-3"><BoutonsDemandeSalarie id={d.id} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-8">
            <h2 className="text-xl font-bold mb-4">🗂️ Dernières demandes traitées</h2>
            {traitees.length === 0 ? (
              <p className="text-gray-500">Aucune pour le moment.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Traitée le</th>
                    <th className="pb-3">Entreprise</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Détail</th>
                    <th className="pb-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {traitees.map((d) => (
                    <tr key={d.id} className="border-b align-top">
                      <td className="py-3 text-sm text-gray-500">{d.traiteAt ? new Date(d.traiteAt).toLocaleDateString("fr-FR") : "—"}</td>
                      <td className="py-3">{d.entreprise.nom}</td>
                      <td className="py-3">{LIBELLES_TYPE[d.type] || d.type}</td>
                      <td className="py-3 text-sm" style={{ maxWidth: "420px" }}>
                        {d.resume}
                        {d.motifRefus && <span className="text-red-600"> — Motif : {d.motifRefus}</span>}
                      </td>
                      <td className="py-3"><StatutDemande statut={d.statut} /></td>
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
