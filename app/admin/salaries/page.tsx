import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonExport from "@/components/BoutonExport";
import BoutonSupprimer from "@/components/BoutonSupprimer";
import Link from "next/link";
import FiltresSalaries from "@/components/FiltresSalaries";

export const dynamic = "force-dynamic";

export default async function AdminSalaries({
  searchParams,
}: {
  searchParams: Promise<{ entreprise?: string; onglet?: string }>;
}) {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const { entreprise: filtreEntreprise, onglet = "actifs" } = await searchParams;

  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0);

  // La démo n'apparaît jamais côté admin
  const filtreBase = { entreprise: { demo: false }, ...(filtreEntreprise ? { entrepriseId: filtreEntreprise } : {}) };

  // Requêtes lancées en même temps
  const [entreprises, salariesActifs, salariesAVenir, salariesAnciens] = await Promise.all([
    prisma.entreprise.findMany({ where: { demo: false }, orderBy: { nom: "asc" } }),
    prisma.salarie.findMany({
      where: {
        ...filtreBase,
        statut: "Actif",
        dateDebut: { lte: finMois },
        OR: [{ dateFin: null }, { dateFin: { gte: debutMois } }],
      },
      include: { entreprise: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.salarie.findMany({
      where: {
        ...filtreBase,
        statut: "Actif",
        dateDebut: { gt: finMois },
      },
      include: { entreprise: true },
      orderBy: { dateDebut: "asc" },
    }),
    prisma.salarie.findMany({
      where: {
        ...filtreBase,
        dateFin: { lt: debutMois },
      },
      include: { entreprise: true },
      orderBy: { dateFin: "desc" },
    }),
  ]);

  function lienOnglet(o: string) {
    return filtreEntreprise
      ? `/admin/salaries?entreprise=${filtreEntreprise}&onglet=${o}`
      : `/admin/salaries?onglet=${o}`;
  }

  function classeOnglet(o: string) {
    return `px-5 py-2 rounded-lg font-semibold transition ${
      onglet === o ? "bg-orange-500 text-white" : "bg-white text-gray-500 hover:bg-gray-100"
    }`;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">👥 Tous les salariés</h1>
              <p className="text-gray-500 mt-2">Vue administrateur — toutes entreprises</p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin/salaries/nouveau" className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition">
                ➕ Ajouter
              </Link>
              <BoutonExport type="salaries-admin" label="Exporter Excel" />
            </div>
          </div>

          <FiltresSalaries entreprises={entreprises.map(e => ({ id: e.id, nom: e.nom }))} filtreActuel={filtreEntreprise || ""} />

          <div className="flex gap-2 mb-6">
            <Link href={lienOnglet("actifs")} className={classeOnglet("actifs")}>
              ✅ Actifs ({salariesActifs.length})
            </Link>
            <Link href={lienOnglet("avenir")} className={classeOnglet("avenir")}>
              🔜 À venir ({salariesAVenir.length})
            </Link>
            <Link href={lienOnglet("anciens")} className={classeOnglet("anciens")}>
              🗂️ Anciens ({salariesAnciens.length})
            </Link>
          </div>

          {onglet === "actifs" && (
            <div className="bg-white rounded-xl shadow p-8">
              {salariesActifs.length === 0 ? (
                <p className="text-gray-500">Aucun salarié actif ce mois.</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3">Nom</th>
                      <th className="pb-3">Prénom</th>
                      <th className="pb-3">Poste</th>
                      <th className="pb-3">Entreprise</th>
                      <th className="pb-3">Contrat</th>
                      <th className="pb-3">Entrée</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {salariesActifs.map((s) => (
                      <tr key={s.id} className="border-b hover:bg-gray-50 transition">
                        <td className="py-3 font-semibold">{s.nom}</td>
                        <td className="py-3">{s.prenom}</td>
                        <td className="py-3">{s.poste}</td>
                        <td className="py-3 text-sm">{s.entreprise.nom}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{s.typeContrat || "—"}</span></td>
                        <td className="py-3 text-sm text-gray-500">{s.dateDebut ? new Date(s.dateDebut).toLocaleDateString("fr-FR") : "—"}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <Link href={`/admin/salaries/${s.id}`} className="bg-orange-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-orange-600 transition">Voir</Link>
                            <Link href={`/admin/salaries/${s.id}/modifier`} className="bg-gray-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-gray-700 transition">Modifier</Link>
                            <BoutonSupprimer id={s.id} redirectUrl="/admin/salaries" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {onglet === "avenir" && (
            <div className="bg-white rounded-xl shadow p-8">
              {salariesAVenir.length === 0 ? (
                <p className="text-gray-500">Aucun salarié à venir.</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3">Nom</th>
                      <th className="pb-3">Prénom</th>
                      <th className="pb-3">Poste</th>
                      <th className="pb-3">Entreprise</th>
                      <th className="pb-3">Contrat</th>
                      <th className="pb-3">Entrée prévue</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {salariesAVenir.map((s) => (
                      <tr key={s.id} className="border-b hover:bg-blue-50 transition">
                        <td className="py-3 font-semibold">{s.nom}</td>
                        <td className="py-3">{s.prenom}</td>
                        <td className="py-3">{s.poste}</td>
                        <td className="py-3 text-sm">{s.entreprise.nom}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{s.typeContrat || "—"}</span></td>
                        <td className="py-3 text-sm text-blue-600 font-semibold">{s.dateDebut ? new Date(s.dateDebut).toLocaleDateString("fr-FR") : "—"}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <Link href={`/admin/salaries/${s.id}`} className="bg-orange-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-orange-600 transition">Voir</Link>
                            <Link href={`/admin/salaries/${s.id}/modifier`} className="bg-gray-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-gray-700 transition">Modifier</Link>
                            <BoutonSupprimer id={s.id} redirectUrl="/admin/salaries" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {onglet === "anciens" && (
            <div className="bg-white rounded-xl shadow p-8">
              {salariesAnciens.length === 0 ? (
                <p className="text-gray-500">Aucun ancien salarié.</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3">Nom</th>
                      <th className="pb-3">Prénom</th>
                      <th className="pb-3">Poste</th>
                      <th className="pb-3">Entreprise</th>
                      <th className="pb-3">Contrat</th>
                      <th className="pb-3">Sortie</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {salariesAnciens.map((s) => (
                      <tr key={s.id} className="border-b hover:bg-gray-50 transition opacity-70">
                        <td className="py-3 font-semibold">{s.nom}</td>
                        <td className="py-3">{s.prenom}</td>
                        <td className="py-3">{s.poste}</td>
                        <td className="py-3 text-sm">{s.entreprise.nom}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{s.typeContrat || "—"}</span></td>
                        <td className="py-3 text-sm text-red-500 font-semibold">{s.dateFin ? new Date(s.dateFin).toLocaleDateString("fr-FR") : "—"}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <Link href={`/admin/salaries/${s.id}/modifier`} className="bg-gray-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-gray-700 transition">Modifier</Link>
                            <BoutonSupprimer id={s.id} redirectUrl="/admin/salaries" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
