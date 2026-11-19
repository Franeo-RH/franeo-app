import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ReglageParrainage from "@/components/ReglageParrainage";
import { lignesFacturesMois, rangRemise } from "@/lib/facturation";
import { reglageParrainage, texteRecompense } from "@/lib/parrainage";

export const dynamic = "force-dynamic";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

/** Admin › Remises & parrainage : récompense automatique, remises du mois et liens de parrainage */
export default async function AdminRemises() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const maintenant = new Date();
  const mois = maintenant.getMonth() + 1, annee = maintenant.getFullYear();
  const [reglage, entreprises] = await Promise.all([
    reglageParrainage(),
    prisma.entreprise.findMany({
      where: { demo: false },
      select: { id: true, nom: true, actif: true, remisePct: true, codeParrainage: true, parrainId: true, remises: true },
      orderBy: { nom: "asc" },
    }),
  ]);
  const noms = new Map(entreprises.map((e) => [e.id, e.nom]));
  const concernees = entreprises.filter((e) => e.actif !== false && ((e.remisePct ?? 0) > 0 || e.remises.some((r) => rangRemise(r, mois, annee) != null)));
  const lignes = await lignesFacturesMois(mois, annee, concernees.map((e) => e.id));
  const remisesMois = concernees.flatMap((e) => (lignes.get(e.id) ?? []).filter((l) => l.categorie === "REMISE").map((l) => ({ ...l, entrepriseId: e.id, entreprise: e.nom })));
  const totalRemises = remisesMois.reduce((a, l) => a + l.total, 0);
  const parrainages = entreprises.filter((e) => e.parrainId);
  const avecCode = entreprises.filter((e) => e.codeParrainage).length;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-6 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">🎁 Remises & parrainage</h1>
            <p className="text-gray-500 mt-1">Les remises sont déduites automatiquement des estimations et des factures. Elles se gèrent client par client dans l&apos;onglet « 🎁 Remises & parrainage » de la fiche.</p>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            <div className="bg-white rounded-xl shadow p-4"><p className="text-xs font-semibold text-gray-500">Remises de {MOIS[mois - 1]}</p><p className="text-2xl font-bold text-green-700">{eur(totalRemises)}</p></div>
            <div className="bg-white rounded-xl shadow p-4"><p className="text-xs font-semibold text-gray-500">Clients remisés</p><p className="text-2xl font-bold">{new Set(remisesMois.map((r) => r.entrepriseId)).size}</p></div>
            <div className="bg-white rounded-xl shadow p-4"><p className="text-xs font-semibold text-gray-500">Parrainages</p><p className="text-2xl font-bold">{parrainages.length}</p></div>
            <div className="bg-white rounded-xl shadow p-4"><p className="text-xs font-semibold text-gray-500">Clients avec un code</p><p className="text-2xl font-bold">{avecCode}</p></div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold">🤝 Récompense de parrainage</h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">Actuellement : <b>{texteRecompense(reglage)}</b>. Créée automatiquement quand un nouveau client arrive avec un code (formulaire d&apos;inscription ou rattachement manuel), à partir de la facture du mois suivant.</p>
            <ReglageParrainage initial={reglage} />
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold mb-4">💸 Remises appliquées en {MOIS[mois - 1]} {annee}</h2>
            {remisesMois.length === 0 ? <p className="text-sm text-gray-500">Aucune remise ce mois-ci.</p> : (
              <table className="w-full text-sm text-left">
                <thead><tr className="text-gray-500 border-b"><th className="pb-2">Client</th><th className="pb-2">Remise</th><th className="pb-2 text-right">Montant</th></tr></thead>
                <tbody>
                  {remisesMois.map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td data-label="Client" className="py-2 font-semibold"><Link href={`/admin/entreprises/${r.entrepriseId}?onglet=remises`} className="hover:text-orange-600">{r.entreprise}</Link></td>
                      <td data-label="Remise" className="py-2">{r.libelle}</td>
                      <td data-label="Montant" className="py-2 text-right font-semibold text-green-700">{eur(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold mb-4">🌱 Parrainages ({parrainages.length})</h2>
            {parrainages.length === 0 ? <p className="text-sm text-gray-500">Aucun parrainage pour l&apos;instant.</p> : (
              <table className="w-full text-sm text-left">
                <thead><tr className="text-gray-500 border-b"><th className="pb-2">Marraine</th><th className="pb-2">Filleule</th></tr></thead>
                <tbody>
                  {parrainages.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td data-label="Marraine" className="py-2"><Link href={`/admin/entreprises/${e.parrainId}?onglet=remises`} className="font-semibold hover:text-orange-600">{noms.get(e.parrainId!) ?? "—"}</Link></td>
                      <td data-label="Filleule" className="py-2"><Link href={`/admin/entreprises/${e.id}?onglet=remises`} className="font-semibold hover:text-orange-600">{e.nom}</Link></td>
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
