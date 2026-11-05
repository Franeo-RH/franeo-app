import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import BandeauCommunications from "@/components/BandeauCommunications";
import BlocEcheances from "@/components/BlocEcheances";
import BoutonCloture from "@/components/BoutonCloture";
import AppsFraneo from "@/components/AppsFraneo";
import { communicationsNonLues } from "@/lib/communications";
import { chargerEcheances } from "@/lib/rappels-serveur";
import { calculerMasseSalariale } from "@/lib/masse-salariale";
import { calculerFacture, PRIX_TICKET_SANS_ABONNEMENT, quotaTickets, ticketsDuMois } from "@/lib/facturation";
import { aAccesPaie, aDroit } from "@/lib/droits";

export const dynamic = "force-dynamic";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

export default async function ClientDashboard() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");

  const permissions = session.entreprise?.permissions || [];
  const peut = (d: Parameters<typeof aDroit>[1]) => aDroit(permissions, d);
  const entrepriseId = session.entrepriseId!;
  const maintenant = new Date();
  const mois = maintenant.getMonth() + 1;
  const annee = maintenant.getFullYear();
  const debutMois = new Date(annee, mois - 1, 1);
  const finMois = new Date(annee, mois, 0, 23, 59, 59);
  const avecPaie = aAccesPaie(session.entreprise);
  const avecEspace = permissions.includes("espace-salaries");

  const [
    communications, entreprise, nbSalaries, nbAbsences, nbTickets, nbQuestions, echeances, masse,
    calculMois, facture, ticketsMois, nbComptes, relevesDiffuses, nbBulletins,
  ] = await Promise.all([
    communicationsNonLues({ id: session.id, role: session.role, entrepriseId: session.entrepriseId }),
    prisma.entreprise.findUnique({ where: { id: entrepriseId }, include: { abonnement: true, abonnementPaie: true } }),
    prisma.salarie.count({ where: { entrepriseId, statut: "Actif", OR: [{ dateFin: null }, { dateFin: { gte: maintenant } }] } }),
    prisma.absence.count({ where: { entrepriseId, statut: { not: "Refusé" }, dateDebut: { lte: finMois }, dateFin: { gte: debutMois } } }),
    prisma.ticket.count({ where: { entrepriseId, statut: { not: "Clôturé" } } }),
    prisma.questionRH.count({ where: { entrepriseId, statut: { not: "CLOSE" } } }),
    chargerEcheances({ entrepriseId }),
    calculerMasseSalariale({ mois, annee, entrepriseId }),
    calculerFacture(entrepriseId, mois, annee),
    prisma.facturation.findFirst({ where: { entrepriseId, mois, annee } }),
    ticketsDuMois(entrepriseId, mois, annee),
    avecEspace ? prisma.utilisateur.count({ where: { role: "SALARIE", actif: true, salarie: { entrepriseId, statut: "Actif" } } }) : Promise.resolve(0),
    avecEspace ? prisma.releveMois.count({ where: { entrepriseId, mois, annee, statut: { in: ["Envoyé", "Validé"] } } }) : Promise.resolve(0),
    prisma.salarie.count({ where: { entrepriseId, statut: "Actif", dateDebut: { lte: finMois }, OR: [{ dateFin: null }, { dateFin: { gte: debutMois } }] } }),
  ]);

  const abo = entreprise?.abonnement;
  const paie = entreprise?.abonnementPaie;
  const quota = entreprise ? quotaTickets(entreprise) : { inclus: 0, prixSupp: 0 };
  const coutFraneo = facture ? facture.montant : calculMois?.montant || 0;
  const relevesNonDiffuses = Math.max(nbComptes - relevesDiffuses, 0);
  const urgentes = echeances.filter((e) => e.statut === "retard" || e.statut === "aujourdhui" || e.statut === "bientot");
  const t = masse.totaux;
  const montantAbsences = t.retenueSansSolde + t.retenueMaladie;
  const chargesVariables = Math.max(t.coutVariables - t.variablesBrut - t.notesFrais, 0);

  const tuiles: { href: string; icone: string; label: string; n: string | number; couleur: string }[] = [
    { href: "/client/salaries", icone: "👥", label: "Salariés", n: nbSalaries, couleur: "text-gray-800" },
    { href: "/client/salaries/absences", icone: "📅", label: "Absences du mois", n: nbAbsences, couleur: "text-orange-500" },
    ...(avecEspace ? [{ href: "/client/salaries/releves", icone: "⏱️", label: "Relevés non envoyés", n: relevesNonDiffuses, couleur: relevesNonDiffuses ? "text-red-500" : "text-gray-800" }] : []),
    { href: "/client/tickets", icone: "🎫", label: "Tickets RH en cours", n: nbTickets, couleur: "text-gray-800" },
    { href: "/client/tickets/questions", icone: "💬", label: "Demandes ponctuelles", n: nbQuestions, couleur: "text-gray-800" },
    { href: "/client/paie", icone: "💶", label: "Masse salariale", n: eur(t.coutTotal), couleur: "text-gray-800" },
    { href: "/client/entreprise/facturation", icone: "🧾", label: `Coût Franeo ${MOIS[mois - 1]}${facture ? "" : " (estim.)"}`, n: eur(coutFraneo), couleur: "text-orange-500" },
    ...(avecPaie ? [
      { href: "/client/paie", icone: "📄", label: "Bulletins du mois", n: nbBulletins, couleur: "text-gray-800" },
      { href: "/client/paie/historique", icone: "💰", label: "Variables + charges", n: eur(t.variablesBrut + chargesVariables + t.notesFrais), couleur: "text-red-500" },
      { href: "/client/salaries/absences", icone: "🏖️", label: "Montant des absences", n: eur(montantAbsences), couleur: "text-orange-500" },
    ] : []),
  ];

  const boutons = [
    peut("tickets.creer") && { href: "/client/tickets/nouveau", label: "🎫 Demander un ticket RH" },
    peut("tickets.questions") && { href: "/client/tickets/questions/nouvelle", label: "💬 Faire une question rapide" },
    peut("salaries.creer") && { href: "/client/salaries/nouveau", label: "➕ Ajouter un salarié" },
    (permissions.includes("absences") || permissions.includes("salaries")) && { href: "/client/salaries/absences", label: "🏖️ Ajouter une absence" },
    peut("tickets.recrutement") && { href: "/client/tickets/recrutement", label: "🎯 Lancer un recrutement" },
    peut("entreprise.devis") && { href: "/client/entreprise/devis", label: "🧾 Avoir un devis" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} permissions={permissions} />
      <main className="px-4 md:px-6 py-4 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 flex-wrap px-1">
          <h1 className="text-xl font-bold">👋 Bonjour {session.prenom} !</h1>
          <ul className="text-gray-500 text-xs text-right" style={{ listStyle: "none", margin: 0, padding: 0, lineHeight: 1.5 }}>
            <li className="font-semibold text-gray-700">{entreprise?.nom}</li>
            <li>{MOIS[mois - 1]} {annee}</li>
            <li>CCN : {entreprise?.ccn || <Link href="/client/entreprise/modifier" className="text-orange-500">à renseigner</Link>}</li>
          </ul>
        </div>

        <BandeauCommunications communications={communications} />

        <div className="flex gap-2 flex-wrap">
          {boutons.map((x) => (
            <Link key={x.href} href={x.href} style={{ background: "#ffffff", border: "1px solid #fed7aa", color: "#c2410c", borderRadius: "999px", padding: "8px 14px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>{x.label}</Link>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.75rem" }}>
          {tuiles.map((x) => (
            <Link key={x.label} href={x.href} className="bg-white rounded-2xl shadow p-3 text-center hover:shadow-md transition">
              <p className="text-2xl">{x.icone}</p>
              <p className={`text-2xl font-bold leading-tight ${x.couleur}`}>{x.n}</p>
              <p className="text-gray-400 text-[11px] font-semibold uppercase">{x.label}</p>
            </Link>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          {/* Mes abonnements */}
          <Link href="/client/entreprise/abonnement" className="bg-white rounded-2xl shadow p-4 hover:shadow-md transition flex flex-col gap-3">
            <h2 className="text-sm font-bold">💳 Mes abonnements</h2>
            {!abo && !paie && (
              <div className="rounded-xl px-4 py-3" style={{ background: "#f3f4f6" }}>
                <p className="text-lg font-bold">Accès de base · gratuit</p>
                <p className="text-gray-600 text-xs mt-1">Ticket RH à {PRIX_TICKET_SANS_ABONNEMENT} € l&apos;unité ({ticketsMois} ce mois-ci).</p>
              </div>
            )}
            {abo && (
              <div className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white px-4 py-3">
                <div className="flex justify-between items-baseline"><p className="text-lg font-bold">{abo.nom}</p><p className="text-sm font-semibold">{abo.prixMensuel} €/mois</p></div>
                <p className="text-orange-100 text-xs mt-1">{nbSalaries}/{abo.salariesInclus} salariés · {Math.max(quota.inclus - ticketsMois, 0)}/{quota.inclus} tickets restants</p>
              </div>
            )}
            {paie && (
              <div className="rounded-xl bg-gradient-to-r from-gray-800 to-gray-700 text-white px-4 py-3">
                <div className="flex justify-between items-baseline"><p className="text-lg font-bold">Paie {paie.nom}</p><p className="text-sm font-semibold">{paie.prixMensuel} €/mois</p></div>
                <p className="text-gray-300 text-xs mt-1">{nbBulletins}/{paie.bulletinsInclus} bulletins inclus</p>
              </div>
            )}
          </Link>

          {/* Échéances urgentes et dépassées */}
          <div className="flex flex-col" style={{ maxHeight: "260px" }}>
            {peut("salaries.echeances")
              ? <BlocEcheances echeances={urgentes} role="CLIENT" max={6} />
              : <div className="bg-white rounded-2xl shadow p-4 text-sm text-gray-500">Échéances non disponibles pour votre compte.</div>}
          </div>

          <div className="flex flex-col gap-3">
            {avecPaie && peut("paie.cloture") && <BoutonCloture mois={mois} annee={annee} />}
            {!avecPaie && <BoutonCloture mois={mois} annee={annee} />}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-sm font-bold mb-3">🚀 Les autres apps Franeo</h2>
          <AppsFraneo compact />
        </div>
      </main>
    </div>
  );
}
