import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export const dynamic = "force-dynamic";

/** Admin › Documentaire : suivi transversal (mouvements, échéances, journaux, accès, modèles) */
export default async function AdminDocumentaire() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0, 23, 59, 59);
  const dans30 = new Date(maintenant.getTime() + 30 * 86400000);
  const debutJour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  const client = { demo: false };
  const [entrees, sorties, retard, bientot, pointages, logs24, echecs24, comptesSalaries, modeles, courriers, contrats, accidents] = await Promise.all([
    prisma.salarie.count({ where: { entreprise: client, dateDebut: { gte: debutMois, lte: finMois } } }),
    prisma.salarie.count({ where: { entreprise: client, dateFin: { gte: debutMois, lte: finMois } } }),
    prisma.rappelSalarie.count({ where: { traite: false, dateEcheance: { lt: debutJour }, salarie: { entreprise: client } } }),
    prisma.rappelSalarie.count({ where: { traite: false, dateEcheance: { gte: debutJour, lte: dans30 }, salarie: { entreprise: client } } }),
    prisma.pointage.count({ where: { entreprise: client, at: { gte: debutJour } } }),
    prisma.journalAudit.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    prisma.journalAudit.count({ where: { action: { in: ["LOGIN_ECHEC", "LOGIN_BLOQUE", "CODE_ECHEC"] }, createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    prisma.utilisateur.count({ where: { role: "SALARIE", actif: true, salarie: { entreprise: client } } }),
    prisma.trameContrat.count({ where: { entrepriseId: null } }),
    prisma.modeleCourrier.count(),
    prisma.demandeContrat.count({ where: { entreprise: client, verification: true } }),
    prisma.accidentTravail.count({ where: { entreprise: client } }),
  ]);

  const groupes: { titre: string; tuiles: { href: string; icone: string; titre: string; detail: string; alerte?: boolean }[] }[] = [
    {
      titre: "📂 Suivi général",
      tuiles: [
        { href: "/admin/salaries/mouvements", icone: "🔄", titre: "Mouvements", detail: `${entrees} entrée(s) · ${sorties} sortie(s) ce mois` },
        { href: "/admin/salaries/echeances", icone: "⏰", titre: "Échéances", detail: `${retard} en retard · ${bientot} sous 30 jours`, alerte: retard > 0 },
        { href: "/admin/salaries/accidents", icone: "🩹", titre: "Accidents du travail", detail: `${accidents} déclaration(s)` },
      ],
    },
    {
      titre: "📜 Journaux",
      tuiles: [
        { href: "/admin/salaries/pointages", icone: "📍", titre: "Journal des pointages", detail: `${pointages} pointage(s) aujourd'hui · filtres par date` },
        { href: "/admin/salaries/rgpd", icone: "🔐", titre: "Journal d'activité & RGPD", detail: `${logs24} événement(s) en 24 h${echecs24 ? ` · ${echecs24} échec(s) de connexion` : ""}`, alerte: echecs24 > 0 },
        { href: "/admin/paie/clotures", icone: "🔒", titre: "Journal de paie & clôtures", detail: "Saisies, modifications, clôtures de mois" },
      ],
    },
    {
      titre: "🔑 Accès",
      tuiles: [
        { href: "/admin/salaries/acces", icone: "📱", titre: "Accès des salariés", detail: `${comptesSalaries} compte(s) salarié actif(s)` },
        { href: "/admin/entreprises", icone: "🏢", titre: "Accès des clients", detail: "Depuis chaque entreprise : Accès & droits" },
        { href: "/admin/entreprises/cabinets", icone: "🏛️", titre: "Accès des cabinets", detail: "Collaborateurs et clients suivis" },
      ],
    },
    {
      titre: "📝 Modèles",
      tuiles: [
        { href: "/admin/documentaire/modeles", icone: "📄", titre: "Modèles de contrats", detail: `${modeles} modèle(s) FRANEO déposé(s)` },
        { href: "/admin/salaries/courriers", icone: "✉️", titre: "Modèles de courriers", detail: `${courriers} modèle(s)` },
        { href: "/admin/salaries/contrats", icone: "🧐", titre: "Contrats à relire", detail: `${contrats} relecture(s) demandée(s)`, alerte: contrats > 0 },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10 flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow p-8">
            <h1 className="text-3xl font-bold">🗂️ Documentaire</h1>
            <p className="text-gray-500 mt-1">Le suivi de tous les clients au même endroit. Les salariés d&apos;un client s&apos;ouvrent depuis sa carte dans Entreprises.</p>
          </div>
          {groupes.map((g) => (
            <section key={g.titre}>
              <h2 className="text-sm font-bold uppercase text-gray-500 mb-2">{g.titre}</h2>
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                {g.tuiles.map((t) => (
                  <Link key={t.href + t.titre} href={t.href} className="bg-white rounded-xl shadow p-5 flex gap-4 items-start hover:shadow-md transition" style={{ borderLeft: `5px solid ${t.alerte ? "#f97316" : "#e5e7eb"}` }}>
                    <span className="text-3xl" aria-hidden="true">{t.icone}</span>
                    <span className="min-w-0">
                      <span className="block font-bold">{t.titre}</span>
                      <span className="block text-sm" style={{ color: t.alerte ? "#ea580c" : "#6b7280" }}>{t.detail}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
