import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { chargerEcheances } from "@/lib/rappels-serveur";
import { STYLES_STATUT, formaterDateFR, texteDelai } from "@/lib/rappels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PageEcheances({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string; entrepriseId?: string }>;
}) {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");
  const { filtre = "tous", entrepriseId = "" } = await searchParams;
  const entreprises = await prisma.entreprise.findMany({ where: { demo: false }, orderBy: { nom: "asc" }, select: { id: true, nom: true } });

  const toutes = await chargerEcheances({ sansDemo: true, ...(entrepriseId ? { entrepriseId } : {}) });
  const retards = toutes.filter((e) => e.jours < 0);
  const bientot = toutes.filter((e) => e.jours >= 0 && e.jours <= 30);
  const plusTard = toutes.filter((e) => e.jours > 30);
  const liste = filtre === "retard" ? retards : filtre === "30" ? bientot : filtre === "plus" ? plusTard : toutes;
  const base = "/admin/salaries";
  const qs = (f: string) => `${base}/echeances?filtre=${f}${entrepriseId ? `&entrepriseId=${entrepriseId}` : ""}`;

  const onglet = (f: string, label: string, n: number, actif: string) => (
    <Link key={f} href={qs(f)} className={`px-5 py-2 rounded-lg font-semibold transition ${filtre === f ? actif : "bg-white text-gray-500 hover:bg-gray-100"}`}>
      {label} ({n})
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">
          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">⏰ Échéances</h1>
            <p className="text-gray-500 mt-1">Visites médicales, titres de séjour, avenants, fins de contrat… (retards et 60 prochains jours)</p>
          </div>

          <div className="flex gap-2 mb-6">
            {onglet("tous", "Toutes", toutes.length, "bg-orange-500 text-white")}
            {onglet("retard", "🔴 En retard", retards.length, "bg-red-500 text-white")}
            {onglet("30", "🟠 Sous 30 jours", bientot.length, "bg-orange-400 text-white")}
            {onglet("plus", "🟢 Plus tard", plusTard.length, "bg-green-500 text-white")}
          </div>
          <form method="get" className="bg-white rounded-xl shadow p-4 mb-6 flex gap-3 items-end">
            <input type="hidden" name="filtre" value={filtre} />
            <div>
              <label className="block text-sm font-semibold mb-1">Entreprise</label>
              <select name="entrepriseId" defaultValue={entrepriseId} className="border rounded-lg px-3 py-2 text-black">
                <option value="">Toutes</option>
                {entreprises.map((en) => (<option key={en.id} value={en.id}>{en.nom}</option>))}
              </select>
            </div>
            <button type="submit" className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition">Filtrer</button>
          </form>

          <div className="bg-white rounded-xl shadow p-8">
            {liste.length === 0 ? (
              <p className="text-gray-500">Aucune échéance. 🎉</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Échéance</th>
                    <th className="pb-3">Salarié</th>
                    <th className="pb-3">Entreprise</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Délai</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((e) => (
                    <tr key={e.cle} className="border-b hover:bg-gray-50 transition">
                      <td className="py-3">{e.icone} <strong>{e.label}</strong></td>
                      <td className="py-3">{e.salarie}</td>
                      <td className="py-3 text-sm text-gray-500">{e.entreprise}</td>
                      <td className="py-3 text-sm text-gray-500">{formaterDateFR(e.date)}</td>
                      <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STYLES_STATUT[e.statut]}`}>{texteDelai(e.jours)}</span></td>
                      <td className="py-3">
                        <Link href={`${base}/${e.salarieId}`} className="bg-orange-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-orange-600 transition">Voir</Link>
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
