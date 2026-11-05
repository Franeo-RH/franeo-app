import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BlocEcheances from "@/components/BlocEcheances";
import { chargerEcheances } from "@/lib/rappels-serveur";
import { aDroit } from "@/lib/droits";

export const dynamic = "force-dynamic";

/** Gestion RH › Tableau de bord : l'essentiel sur les salariés et tout ce qui attend une action */
export default async function TableauDeBordRH() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");
  const perms = session.entreprise?.permissions || [];
  if (!perms.includes("salaries") && !perms.includes("absences")) redirect("/client/dashboard");
  const entrepriseId = session.entrepriseId!;
  const espace = perms.includes("espace-salaries");

  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
  const finMois = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const actif = { entrepriseId, statut: "Actif", OR: [{ dateFin: null }, { dateFin: { gte: now } }] };

  const [salaries, absAttente, absMois, relevesAValider, fraisAttente, questionsOuvertes, entrees, sorties, demandes, echeances, nbEtab] = await Promise.all([
    prisma.salarie.findMany({ where: actif, select: { id: true, service: true, etablissement: true, roleRH: true, managerId: true, typeContrat: true, dateFin: true } }),
    prisma.absence.count({ where: { entrepriseId, statut: "En attente" } }),
    prisma.absence.count({ where: { entrepriseId, statut: { not: "Refusé" }, dateDebut: { lte: finMois }, dateFin: { gte: debutMois } } }),
    prisma.releveMois.count({ where: { entrepriseId, statut: "Envoyé" } }),
    prisma.noteFrais.count({ where: { entrepriseId, statut: "En attente" } }),
    prisma.questionInterne.count({ where: { entrepriseId, statut: "OUVERTE", versFraneo: false } }),
    prisma.salarie.count({ where: { entrepriseId, dateDebut: { gte: debutMois, lte: finMois } } }),
    prisma.salarie.count({ where: { entrepriseId, dateFin: { gte: debutMois, lte: finMois } } }),
    prisma.demandeSalarie.count({ where: { entrepriseId, statut: "EN_ATTENTE" } }),
    chargerEcheances({ entrepriseId }),
    prisma.etablissement.count({ where: { entrepriseId } }),
  ]);

  const compter = (cle: (s: (typeof salaries)[number]) => string) => {
    const m = new Map<string, number>();
    for (const s of salaries) m.set(cle(s), (m.get(cle(s)) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const parService = compter((s) => s.service || "Sans service");
  const parEtab = compter((s) => s.etablissement || "Non renseigné");
  const parContrat = compter((s) => s.typeContrat || "Non renseigné");
  const managers = salaries.filter((s) => s.roleRH === "MANAGER").length;
  const dirigeants = salaries.filter((s) => s.roleRH === "DIRIGEANT").length;
  const sansManager = salaries.filter((s) => !s.managerId && s.roleRH === "SALARIE").length;
  const max = Math.max(...parService.map((x) => x[1]), 1);

  const tuiles = [
    { n: salaries.length, l: "Salariés actifs", href: "/client/salaries", c: "text-gray-800" },
    { n: absMois, l: "Absences ce mois", href: "/client/salaries/absences", c: "text-orange-500" },
    { n: absAttente, l: "Absences à valider", href: "/client/salaries/absences", c: absAttente ? "text-red-500" : "text-gray-800" },
    ...(espace ? [
      { n: relevesAValider, l: "Relevés à valider", href: "/client/salaries/releves", c: relevesAValider ? "text-red-500" : "text-gray-800" },
      { n: fraisAttente, l: "Frais à valider", href: "/client/salaries/frais", c: fraisAttente ? "text-red-500" : "text-gray-800" },
      { n: questionsOuvertes, l: "Questions en attente", href: "/client/salaries/questions", c: questionsOuvertes ? "text-orange-500" : "text-gray-800" },
    ] : []),
    { n: `${entrees} / ${sorties}`, l: "Entrées / sorties du mois", href: "/client/salaries/mouvements", c: "text-gray-800" },
    { n: demandes, l: "Demandes en validation", href: "/client/salaries/demandes", c: "text-gray-800" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom={session.prenom} permissions={perms} />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-4 md:p-8 flex flex-col gap-5" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6 flex justify-between items-center gap-3 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">📊 Gestion RH</h1>
              <p className="text-gray-500 mt-1">Vos équipes en un coup d&apos;œil et tout ce qui attend une action de votre part.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {aDroit(perms, "salaries.creer") && <Link href="/client/salaries/nouveau" className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold">➕ Ajouter un salarié</Link>}
              <Link href="/client/salaries/services" className="bg-black text-white px-4 py-2 rounded-lg font-semibold">🧩 Organigramme</Link>
            </div>
          </div>

          {nbEtab === 0 && (
            <Link href="/client/entreprise" className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-orange-700 font-semibold">⚠️ Ajoutez au moins un établissement (avec son adresse) dans Mon entreprise →</Link>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" }}>
            {tuiles.map((t) => (
              <Link key={t.l} href={t.href} className="bg-white rounded-2xl shadow p-4 text-center hover:shadow-md transition">
                <p className={`text-3xl font-bold ${t.c}`}>{t.n}</p>
                <p className="text-gray-400 text-[11px] font-semibold uppercase">{t.l}</p>
              </Link>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="font-bold mb-3">🧩 Effectif par service</h2>
              {parService.map(([nom, n]) => (
                <div key={nom} className="mb-2">
                  <div className="flex justify-between text-sm"><span>{nom}</span><strong>{n}</strong></div>
                  <div className="h-2 bg-gray-100 rounded"><div className="h-2 bg-orange-500 rounded" style={{ width: `${(n / max) * 100}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-2 text-sm">
              <h2 className="font-bold mb-1">🏢 Organisation</h2>
              <p>👑 Dirigeants : <strong>{dirigeants}</strong></p>
              <p>🧑‍💼 Managers : <strong>{managers}</strong></p>
              <p>👤 Salariés sans manager : <strong>{sansManager}</strong>{sansManager > 0 && <Link href="/client/salaries/services" className="text-orange-500 ml-2">attribuer →</Link>}</p>
              <h3 className="font-bold mt-3">📍 Par établissement</h3>
              {parEtab.map(([nom, n]) => <p key={nom}>{nom} : <strong>{n}</strong></p>)}
              <h3 className="font-bold mt-3">📄 Par contrat</h3>
              {parContrat.map(([nom, n]) => <p key={nom}>{nom} : <strong>{n}</strong></p>)}
            </div>
          </div>

          {aDroit(perms, "salaries.echeances") && <BlocEcheances echeances={echeances} role="CLIENT" max={8} />}
        </main>
      </div>
    </div>
  );
}
