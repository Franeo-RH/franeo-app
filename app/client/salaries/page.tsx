import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import BoutonExport from "@/components/BoutonExport";
import { aDroit, ajoutParValidation } from "@/lib/droits";

export const dynamic = "force-dynamic";

export default async function ClientSalaries({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>;
}) {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");
  if (!session.entreprise?.permissions.includes("salaries")) redirect("/client/dashboard");

  const { onglet = "actifs" } = await searchParams;

  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0);
  const entrepriseId = session.entrepriseId!;



  // Requêtes lancées en même temps
  const [salariesActifs, salariesAVenir, salariesAnciens] = await Promise.all([
    prisma.salarie.findMany({
      where: {
        entrepriseId,
        statut: "Actif",
        dateDebut: { lte: finMois },
        OR: [{ dateFin: null }, { dateFin: { gte: debutMois } }],
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.salarie.findMany({
      where: {
        entrepriseId,
        statut: "Actif",
        dateDebut: { gt: finMois },
      },
      orderBy: { dateDebut: "asc" },
    }),
    prisma.salarie.findMany({
      where: {
        entrepriseId,
        dateFin: { lt: debutMois },
      },
      orderBy: { dateFin: "desc" },
    }),
  ]);

  // Droits réglés par le gestionnaire ; clients « paie » : ajouts et modifications sur demande
  const perms = session.entreprise?.permissions || [];
  const demo = !!session.entreprise?.demo;
  const peutCreer = demo || aDroit(perms, "salaries.creer");
  const peutImporter = aDroit(perms, "salaries.importer");
  const peutModifier = demo || aDroit(perms, "salaries.modifier");
  const peutExporter = aDroit(perms, "global.exports");
  const validation = ajoutParValidation(session.entreprise);

  function classeOnglet(o: string) {
    return `px-5 py-2 rounded-lg font-semibold transition ${
      onglet === o ? "bg-orange-500 text-white" : "bg-white text-gray-500 hover:bg-gray-100"
    }`;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">👥 Salariés</h1>
              <p className="text-gray-500 mt-2">{session.entreprise?.nom}</p>
            </div>
            <div className="flex gap-3">
              {peutCreer && (
                <Link href="/client/salaries/nouveau" className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition">
                  ➕ {validation ? "Demander un ajout" : "Ajouter"}
                </Link>
              )}
              {!peutImporter && !demo ? null : session.entreprise?.demo ? (
                <span className="bg-gray-200 text-gray-400 px-5 py-2 rounded-lg font-semibold cursor-not-allowed select-none" title="Non disponible dans la version démo">
                  📤 Importer Excel (non dispo en démo)
                </span>
              ) : (
                <Link href="/client/salaries/import" className="bg-white border border-orange-500 text-orange-600 px-5 py-2 rounded-lg font-semibold hover:bg-orange-50 transition">
                  📤 Importer Excel
                </Link>
              )}
              {peutExporter && <BoutonExport type="client-salaries" label="📊 Exporter Excel" />}
            </div>
          </div>

          {/* Onglets */}
          <div className="flex gap-2 mb-6">
            <Link href="/client/salaries?onglet=actifs" className={classeOnglet("actifs")}>
              ✅ Actifs ({salariesActifs.length})
            </Link>
            <Link href="/client/salaries?onglet=avenir" className={classeOnglet("avenir")}>
              🔜 À venir ({salariesAVenir.length})
            </Link>
            <Link href="/client/salaries?onglet=anciens" className={classeOnglet("anciens")}>
              🗂️ Sorties ({salariesAnciens.length})
            </Link>
          </div>

          {/* Actifs */}
          {onglet === "actifs" && (
            <div className="bg-white rounded-xl shadow p-8">
              {salariesActifs.length === 0 ? (
                <p className="text-gray-500">Aucun salarié actif ce mois.</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3">Matricule</th>
                      <th className="pb-3">Nom</th>
                      <th className="pb-3">Prénom</th>
                      <th className="pb-3">Poste</th>
                      <th className="pb-3">Contrat</th>
                      <th className="pb-3">Entrée</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {salariesActifs.map((s) => (
                      <tr key={s.id} className="border-b hover:bg-gray-50 transition">
                        <td className="py-3 text-sm text-gray-500">{s.matricule || "—"}</td>
                        <td className="py-3 font-semibold">{s.nom}</td>
                        <td className="py-3">{s.prenom}</td>
                        <td className="py-3">{s.poste}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{s.typeContrat || "—"}</span></td>
                        <td className="py-3 text-sm text-gray-500">{s.dateDebut ? new Date(s.dateDebut).toLocaleDateString("fr-FR") : "—"}</td>
                        <td className="py-3">
                          <div style={{ display: "flex", gap: "8px" }}><Link href={`/client/salaries/${s.id}`} className="bg-orange-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-orange-600 transition">Voir</Link>{peutModifier && <Link href={`/client/salaries/${s.id}/modifier`} style={{ backgroundColor: "#4b5563", color: "#ffffff" }} className="px-3 py-1 rounded-lg text-sm font-semibold hover:opacity-90 transition">Modifier</Link>}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* À venir */}
          {onglet === "avenir" && (
            <div className="bg-white rounded-xl shadow p-8">
              {salariesAVenir.length === 0 ? (
                <p className="text-gray-500">Aucun salarié à venir.</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3">Matricule</th>
                      <th className="pb-3">Nom</th>
                      <th className="pb-3">Prénom</th>
                      <th className="pb-3">Poste</th>
                      <th className="pb-3">Contrat</th>
                      <th className="pb-3">Entrée prévue</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {salariesAVenir.map((s) => (
                      <tr key={s.id} className="border-b hover:bg-blue-50 transition">
                        <td className="py-3 text-sm text-gray-500">{s.matricule || "—"}</td>
                        <td className="py-3 font-semibold">{s.nom}</td>
                        <td className="py-3">{s.prenom}</td>
                        <td className="py-3">{s.poste}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{s.typeContrat || "—"}</span></td>
                        <td className="py-3 text-sm text-blue-600 font-semibold">{s.dateDebut ? new Date(s.dateDebut).toLocaleDateString("fr-FR") : "—"}</td>
                        <td className="py-3">
                          <div style={{ display: "flex", gap: "8px" }}><Link href={`/client/salaries/${s.id}`} className="bg-orange-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-orange-600 transition">Voir</Link>{peutModifier && <Link href={`/client/salaries/${s.id}/modifier`} style={{ backgroundColor: "#4b5563", color: "#ffffff" }} className="px-3 py-1 rounded-lg text-sm font-semibold hover:opacity-90 transition">Modifier</Link>}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Anciens */}
          {onglet === "anciens" && (
            <div className="bg-white rounded-xl shadow p-8">
              {salariesAnciens.length === 0 ? (
                <p className="text-gray-500">Aucun ancien salarié.</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3">Matricule</th>
                      <th className="pb-3">Nom</th>
                      <th className="pb-3">Prénom</th>
                      <th className="pb-3">Poste</th>
                      <th className="pb-3">Contrat</th>
                      <th className="pb-3">Sortie</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {salariesAnciens.map((s) => (
                      <tr key={s.id} className="border-b hover:bg-gray-50 transition opacity-70">
                        <td className="py-3 text-sm text-gray-500">{s.matricule || "—"}</td>
                        <td className="py-3 font-semibold">{s.nom}</td>
                        <td className="py-3">{s.prenom}</td>
                        <td className="py-3">{s.poste}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{s.typeContrat || "—"}</span></td>
                        <td className="py-3 text-sm text-red-500 font-semibold">{s.dateFin ? new Date(s.dateFin).toLocaleDateString("fr-FR") : "—"}</td>
                        <td className="py-3">
                          <div style={{ display: "flex", gap: "8px" }}><Link href={`/client/salaries/${s.id}`} className="bg-gray-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-gray-700 transition">Voir</Link>{peutModifier && <Link href={`/client/salaries/${s.id}/modifier`} style={{ backgroundColor: "#4b5563", color: "#ffffff" }} className="px-3 py-1 rounded-lg text-sm font-semibold hover:opacity-90 transition">Modifier</Link>}</div>
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