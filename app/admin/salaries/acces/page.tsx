import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import EspaceSalarieFiche from "@/components/EspaceSalarieFiche";
import ExportCSV from "@/components/ExportCSV";

export const dynamic = "force-dynamic";

const ETATS = { aucun: "Pas d'accès", actif: "✅ Actif", coupe: "⏸️ Coupé" } as const;

export default async function GestionAcces({ searchParams }: { searchParams: Promise<{ entreprise?: string; etat?: string; q?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const entreprises = await prisma.entreprise.findMany({
    where: { demo: false, permissions: { has: "espace-salaries" } },
    select: { id: true, nom: true },
    orderBy: { nom: "asc" },
  });
  const ids = entreprises.map((e) => e.id);
  const aujourdhui = new Date();

  const salaries = await prisma.salarie.findMany({
    where: {
      entrepriseId: sp.entreprise && ids.includes(sp.entreprise) ? sp.entreprise : { in: ids },
      OR: [{ dateFin: null }, { dateFin: { gte: aujourdhui } }],
      ...(q ? { AND: [{ OR: [{ nom: { contains: q, mode: "insensitive" } }, { prenom: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }] } : {}),
    },
    select: { id: true, prenom: true, nom: true, email: true, poste: true, entreprise: { select: { nom: true } }, compte: { select: { actif: true, email: true } } },
    orderBy: [{ entreprise: { nom: "asc" } }, { nom: "asc" }],
    take: 500,
  });
  const etatDe = (s: (typeof salaries)[number]) => (!s.compte ? "aucun" : s.compte.actif ? "actif" : "coupe") as keyof typeof ETATS;
  const liste = sp.etat ? salaries.filter((s) => etatDe(s) === sp.etat) : salaries;
  const nb = (e: string) => salaries.filter((s) => etatDe(s) === e).length;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom={session.prenom} />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-10" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">📱 Gestion des accès</h1>
            <p className="text-gray-500 mt-1">Accès des salariés à leur espace, pour toutes les entreprises qui ont l&apos;option. Créez un lien d&apos;accès, coupez ou rétablissez un accès.</p>
            <div className="flex gap-3 flex-wrap mt-3 text-sm font-semibold">
              <span>✅ {nb("actif")} actif(s)</span><span>⏸️ {nb("coupe")} coupé(s)</span><span>➖ {nb("aucun")} sans accès</span>
            </div>
            <form method="get" className="flex gap-2 flex-wrap mt-4">
              <input name="q" defaultValue={q} placeholder="Nom, prénom ou email" className="border rounded-lg px-3 py-2" aria-label="Recherche" />
              <select name="entreprise" defaultValue={sp.entreprise || ""} className="border rounded-lg px-3 py-2" aria-label="Entreprise">
                <option value="">Toutes les entreprises ({entreprises.length})</option>
                {entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
              <select name="etat" defaultValue={sp.etat || ""} className="border rounded-lg px-3 py-2" aria-label="État">
                <option value="">Tous les états</option>
                {Object.entries(ETATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold">Filtrer</button>
              <ExportCSV nom="acces-espace-salarie" entetes={["Entreprise", "Nom", "Prénom", "Email", "État"]} lignes={liste.map((s) => [s.entreprise.nom, s.nom, s.prenom, s.compte?.email || s.email || "", ETATS[etatDe(s)]])} />
            </form>
          </div>

          {entreprises.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Aucune entreprise n&apos;a l&apos;option Espace salarié. Activez-la dans la fiche entreprise › Accès & droits.</div>
          ) : liste.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Aucun salarié avec ces filtres.</div>
          ) : (
            <div className="bg-white rounded-xl shadow p-4">
              {liste.map((s) => (
                <details key={s.id} className="border-b py-3">
                  <summary className="cursor-pointer flex justify-between gap-3 flex-wrap" style={{ listStyle: "none" }}>
                    <span><strong>{s.prenom} {s.nom}</strong> <span className="text-gray-500">· {s.entreprise.nom} · {s.poste}</span></span>
                    <span className="text-sm font-semibold">{ETATS[etatDe(s)]} <span className="text-gray-400 font-normal">{s.compte?.email || s.email || "pas d'email"}</span></span>
                  </summary>
                  <div className="mt-3 flex justify-between gap-3 flex-wrap">
                    <div style={{ flex: "1 1 360px" }}>
                      <EspaceSalarieFiche salarieId={s.id} email={s.email} statut={etatDe(s)} />
                    </div>
                    <Link href={`/admin/salaries/${s.id}`} className="text-sm text-orange-600 font-semibold">Ouvrir la fiche →</Link>
                  </div>
                </details>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
