import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import BlocEcheances from "@/components/BlocEcheances";
import BoutonResetDemo from "@/components/BoutonResetDemo";
import RafraichirAuto from "@/components/RafraichirAuto";
import { chargerEcheances } from "@/lib/rappels-serveur";
import { calculerFacture } from "@/lib/facturation";
import { BoutonExportComplet } from "@/components/OutilsAdmin";

export const dynamic = "force-dynamic";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

type Activite = { date: Date; icone: string; texte: string; client: string; href: string };

export default async function AdminDashboard() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const maintenant = new Date();
  const moisActuel = maintenant.getMonth() + 1;
  const anneeActuelle = maintenant.getFullYear();
  const client = { demo: false, actif: true };
  const recent = { gte: new Date(Date.now() - 14 * 86400000) };

  const [
    entreprises,
    nDemSal, nInscriptions, nDemRH, nDemPaie, nDevis, nQuestions, nTickets, nHelpdesk, nPrest, nRecrut, nVariables, nAbsences, nReleves,
    echeances, facturesMois,
    actDemSal, actDevis, actQuestions, actTickets, actHelpdesk, actRecrut, actPrest, actAbs, actReleves,
  ] = await Promise.all([
    prisma.entreprise.findMany({ where: client, select: { id: true, nom: true, permissions: true, abonnementId: true, abonnementPaieId: true } }),
    prisma.demandeSalarie.count({ where: { statut: "EN_ATTENTE", entreprise: client } }),
    prisma.demandeInscription.count({ where: { statut: "NOUVELLE" } }),
    prisma.demandeEvolution.count({ where: { statut: "En attente", entreprise: client } }),
    prisma.demandeEvolutionPaie.count({ where: { statut: "EN_ATTENTE", entreprise: client } }),
    prisma.devis.count({ where: { statut: "EN_ATTENTE", entreprise: client } }),
    prisma.questionRH.count({ where: { statut: "OUVERTE", entreprise: client } }),
    prisma.ticket.count({ where: { statut: { not: "Clôturé" }, entreprise: client } }),
    prisma.ticketSupport.count({ where: { statut: { not: "Clôturé" }, OR: [{ entreprise: client }, { categorie: "SUGGESTION" }] } }),
    prisma.commandePrestation.count({ where: { statut: "A_FAIRE", entreprise: client } }),
    prisma.demandeRecrutement.count({ where: { statut: "Reçue", entreprise: client } }),
    prisma.variablePaie.count({ where: { statut: "En attente", mois: moisActuel, annee: anneeActuelle, entreprise: client } }),
    prisma.absence.count({ where: { statut: "En attente", entreprise: client } }),
    prisma.releveMois.count({ where: { statut: "Envoyé", entreprise: client } }),
    chargerEcheances({ sansDemo: true }),
    prisma.facturation.findMany({ where: { mois: moisActuel, annee: anneeActuelle, entreprise: { demo: false } }, select: { entrepriseId: true, montant: true } }),
    // Dernières activités (14 jours)
    prisma.demandeSalarie.findMany({ where: { createdAt: recent, entreprise: client }, take: 8, orderBy: { createdAt: "desc" }, select: { createdAt: true, resume: true, entreprise: { select: { nom: true } } } }),
    prisma.devis.findMany({ where: { createdAt: recent, entreprise: client }, take: 8, orderBy: { createdAt: "desc" }, select: { createdAt: true, totalIndicatif: true, entreprise: { select: { nom: true } } } }),
    prisma.questionRH.findMany({ where: { updatedAt: recent, entreprise: client }, take: 8, orderBy: { updatedAt: "desc" }, select: { updatedAt: true, sujet: true, statut: true, entreprise: { select: { nom: true } } } }),
    prisma.ticket.findMany({ where: { createdAt: recent, entreprise: client }, take: 8, orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true, titre: true, entreprise: { select: { nom: true } } } }),
    prisma.ticketSupport.findMany({ where: { createdAt: recent, entreprise: client }, take: 8, orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true, titre: true, entreprise: { select: { nom: true } } } }),
    prisma.demandeRecrutement.findMany({ where: { createdAt: recent, entreprise: client }, take: 8, orderBy: { createdAt: "desc" }, select: { createdAt: true, poste: true, entreprise: { select: { nom: true } } } }),
    prisma.commandePrestation.findMany({ where: { createdAt: recent, entreprise: client }, take: 8, orderBy: { createdAt: "desc" }, select: { createdAt: true, libelle: true, entreprise: { select: { nom: true } } } }),
    prisma.absence.findMany({ where: { createdAt: recent, declareeParSalarie: true, entreprise: client }, take: 8, orderBy: { createdAt: "desc" }, select: { createdAt: true, type: true, salarie: { select: { prenom: true, nom: true } }, entreprise: { select: { nom: true } } } }),
    prisma.releveMois.findMany({ where: { envoyeAt: recent, entreprise: client }, take: 8, orderBy: { envoyeAt: "desc" }, select: { envoyeAt: true, mois: true, annee: true, salarie: { select: { prenom: true, nom: true } }, entreprise: { select: { nom: true } } } }),
  ]);

  // Ce qui existe chez les clients : le tableau de bord s'adapte aux modules réellement utilisés
  const avec = (m: string) => entreprises.some((e) => e.permissions.includes(m));
  const nbPaie = entreprises.filter((e) => e.abonnementPaieId).length;
  const nbRH = entreprises.filter((e) => e.abonnementId).length;
  const nbBase = entreprises.filter((e) => !e.abonnementId && !e.abonnementPaieId).length;
  const nbEspace = entreprises.filter((e) => e.permissions.includes("espace-salaries")).length;

  const aTraiter = [
    { n: nInscriptions, icone: "🆕", label: "Nouveaux clients", href: "/admin/entreprises/nouveaux-clients", visible: true },
    { n: nDemSal, icone: "📝", label: "Demandes salariés", href: "/admin/salaries/demandes", visible: avec("salaries") },
    { n: nDemRH + nDemPaie, icone: "📦", label: "Changements d'abonnement", href: "/admin/entreprises/demandes", visible: true },
    { n: nDevis, icone: "🧾", label: "Devis à chiffrer", href: "/admin/entreprises/devis", visible: true },
    { n: nQuestions, icone: "💬", label: "Questions RH en attente", href: "/admin/tickets/questions", visible: true },
    { n: nTickets, icone: "🎫", label: "Tickets RH ouverts", href: "/admin/tickets", visible: avec("tickets") },
    { n: nRecrut, icone: "🎯", label: "Recrutements à lancer", href: "/admin/recrutement", visible: avec("tickets") },
    { n: nHelpdesk, icone: "🆘", label: "Helpdesk ouverts", href: "/admin/helpdesk", visible: true },
    { n: nPrest, icone: "🛒", label: "Prestations à traiter", href: "/admin/entreprises/prestations", visible: nbPaie > 0 },
    { n: nVariables, icone: "💰", label: `Variables ${MOIS[moisActuel - 1]} à valider`, href: "/admin/paie/variables", visible: nbPaie > 0 },
    { n: nAbsences, icone: "🏖️", label: "Absences en attente", href: "/admin/salaries/absences", visible: avec("absences") || avec("salaries") },
    { n: nReleves, icone: "⏱️", label: "Relevés d'heures envoyés", href: "/admin/paie/releves", visible: nbEspace > 0 },
  ].filter((t) => t.visible);
  const totalATraiter = aTraiter.reduce((a, t) => a + t.n, 0);
  const enRetard = echeances.filter((e) => e.jours < 0).length;

  const activites: Activite[] = [
    ...actDemSal.map((a) => ({ date: a.createdAt, icone: "📝", texte: a.resume, client: a.entreprise.nom, href: "/admin/salaries/demandes" })),
    ...actDevis.map((a) => ({ date: a.createdAt, icone: "🧾", texte: `Demande de devis (indicatif ${a.totalIndicatif} €)`, client: a.entreprise.nom, href: "/admin/entreprises/devis" })),
    ...actQuestions.map((a) => ({ date: a.updatedAt, icone: "💬", texte: `Question RH : ${a.sujet}`, client: a.entreprise.nom, href: "/admin/tickets/questions" })),
    ...actTickets.map((a) => ({ date: a.createdAt, icone: "🎫", texte: `Ticket RH : ${a.titre}`, client: a.entreprise.nom, href: `/admin/tickets/${a.id}` })),
    ...actHelpdesk.map((a) => ({ date: a.createdAt, icone: "🆘", texte: `Helpdesk : ${a.titre}`, client: a.entreprise.nom, href: `/admin/helpdesk/${a.id}` })),
    ...actRecrut.map((a) => ({ date: a.createdAt, icone: "🎯", texte: `Recrutement : ${a.poste}`, client: a.entreprise.nom, href: "/admin/recrutement" })),
    ...actPrest.map((a) => ({ date: a.createdAt, icone: "🛒", texte: `Prestation : ${a.libelle}`, client: a.entreprise.nom, href: "/admin/entreprises/prestations" })),
    ...actAbs.map((a) => ({ date: a.createdAt, icone: "📱", texte: `Absence demandée par ${a.salarie.prenom} ${a.salarie.nom}`, client: a.entreprise.nom, href: "/admin/salaries/absences" })),
    ...actReleves.map((a) => ({ date: a.envoyeAt!, icone: "⏱️", texte: `Relevé ${MOIS[a.mois - 1]} envoyé par ${a.salarie.prenom} ${a.salarie.nom}`, client: a.entreprise.nom, href: "/admin/paie/releves" })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 15);

  // Chiffre d'affaires du mois : facture si générée, sinon estimation (même calcul que la facturation)
  const caMois = (await Promise.all(entreprises.map(async (e) => {
    const f = facturesMois.filter((x) => x.entrepriseId === e.id);
    return f.length ? f.reduce((a, x) => a + x.montant, 0) : (await calculerFacture(e.id, moisActuel, anneeActuelle))?.montant ?? 0;
  }))).reduce((a, b) => a + b, 0);

  const depuis = (d: Date) => {
    const min = Math.round((Date.now() - d.getTime()) / 60000);
    if (min < 60) return `il y a ${Math.max(min, 1)} min`;
    if (min < 1440) return `il y a ${Math.round(min / 60)} h`;
    return d.toLocaleDateString("fr-FR");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <RafraichirAuto secondes={60} />
      <main className="px-6 py-4 flex flex-col gap-4">
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">👋 Bonjour {session.prenom}</h1>
            <p className="text-sm text-gray-500">
              {totalATraiter > 0 ? `${totalATraiter} élément(s) à traiter` : "Tout est à jour 🎉"}{enRetard > 0 ? ` · ${enRetard} échéance(s) en retard` : ""}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <BoutonExportComplet jeu="tout" label="💾 Sauvegarde complète (Excel)" />
            <BoutonResetDemo />
          </div>
        </div>

        {/* Repères clients */}
        <div className="flex gap-2 flex-wrap text-sm">
          {[
            { t: `🏢 ${entreprises.length} client(s)`, href: "/admin/entreprises" },
            { t: `👥 ${nbRH} pack RH`, href: "/admin/entreprises" },
            { t: `💼 ${nbPaie} paie`, href: "/admin/abonnement-paie" },
            { t: `🆓 ${nbBase} accès de base`, href: "/admin/entreprises" },
            ...(nbEspace > 0 ? [{ t: `📱 ${nbEspace} espace salarié`, href: "/admin/salaries/acces" }] : []),
            { t: `💶 ${Math.round(caMois).toLocaleString("fr-FR")} € en ${MOIS[moisActuel - 1]}`, href: "/admin/entreprises/facturation" },
          ].map((c) => (
            <Link key={c.t} href={c.href} className="bg-white rounded-full shadow px-3 py-1 font-semibold hover:shadow-md">{c.t}</Link>
          ))}
        </div>

        {/* À traiter */}
        <section aria-labelledby="t-atraiter">
          <h2 id="t-atraiter" className="text-sm font-bold uppercase text-gray-500 mb-2">🔔 À traiter</h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
            {aTraiter.map((t) => (
              <Link key={t.label} href={t.href} className="bg-white rounded-2xl shadow p-3 hover:shadow-md transition"
                style={{ borderLeft: `5px solid ${t.n > 0 ? "#f97316" : "#e5e7eb"}`, opacity: t.n > 0 ? 1 : 0.6 }}>
                <p className="text-xs font-semibold text-gray-500">{t.icone} {t.label}</p>
                <p className="text-3xl font-bold" style={{ color: t.n > 0 ? "#ea580c" : "#9ca3af" }}>{t.n}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="fr-grille-2" style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "1rem" }}>
          {/* Fil d'activité */}
          <section className="bg-white rounded-2xl shadow p-4" aria-labelledby="t-activite">
            <h2 id="t-activite" className="text-sm font-bold mb-3">🕒 Dernières activités des clients</h2>
            {activites.length === 0 ? <p className="text-sm text-gray-500">Rien de nouveau ces 14 derniers jours.</p> : (
              <ul className="flex flex-col">
                {activites.map((a, i) => (
                  <li key={i} className="border-b last:border-0">
                    <Link href={a.href} className="flex gap-3 py-2 hover:bg-gray-50 rounded-lg px-1">
                      <span className="text-lg">{a.icone}</span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span className="block text-sm font-semibold truncate">{a.texte}</span>
                        <span className="block text-xs text-gray-500">{a.client} · {depuis(a.date)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Rappels */}
          <section className="flex flex-col" aria-label="Échéances">
            <BlocEcheances echeances={echeances} role="ADMIN" max={10} />
          </section>
        </div>
      </main>
    </div>
  );
}
