import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import BlocEcheances from "@/components/BlocEcheances";
import { chargerEcheances } from "@/lib/rappels-serveur";
import { EncartMasseSalariale } from "@/components/SuiviMasseSalariale";
import { calculerMasseSalariale } from "@/lib/masse-salariale";
import { calculerFacture, quotaTickets, ticketsDuMois } from "@/lib/facturation";
import type { Echeance } from "@/lib/rappels";

export const dynamic = "force-dynamic";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function calculerCout(type: string, valeur: number, salarie: {
  salaireMensuel: number | null;
  heuresHebdomadaires: number | null;
}) {
  if (type === "HEURE_SUPPLEMENTAIRE") {
    const salaireMensuel = salarie.salaireMensuel || 0;
    const heuresHebdo = salarie.heuresHebdomadaires || 35;
    const salaireHoraire = salaireMensuel / (heuresHebdo * 52 / 12);
    let coutBrut = valeur <= 8
      ? salaireHoraire * valeur * 1.25
      : (salaireHoraire * 8 * 1.25) + (salaireHoraire * (valeur - 8) * 1.50);
    return Math.round(coutBrut * 1.40 * 100) / 100;
  }
  return Math.round(valeur * 1.40 * 100) / 100;
}

export default async function ClientDashboard() {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");

  const permissions = session.entreprise?.permissions || [];
  const maintenant = new Date();
  const moisActuel = maintenant.getMonth() + 1;
  const anneeActuelle = maintenant.getFullYear();

  const entrepriseId = session.entrepriseId!;
  const debutMois = new Date(anneeActuelle, moisActuel - 1, 1);
  const finMois = new Date(anneeActuelle, moisActuel, 0);
  const avecSalaries = permissions.includes("salaries");
  const avecPaie = permissions.includes("paie");
  const avecTickets = permissions.includes("tickets");
  const masseP = avecPaie || avecSalaries ? calculerMasseSalariale({ mois: moisActuel, annee: anneeActuelle, entrepriseId }) : null;

  // Toutes les requêtes partent en même temps (au lieu de 10 à la suite)
  const [
    nbSalaries,
    variables,
    nbAbsences,
    nbTickets,
    nbTicketsSupport,
    entreprise,
    facturesAnnee,
    nbSalariesMois,
    echeances,
  ] = await Promise.all([
    avecSalaries ? prisma.salarie.count({ where: { entrepriseId, statut: "Actif" } }) : Promise.resolve(0),
    avecPaie
      ? prisma.variablePaie.findMany({
          where: { entrepriseId, mois: moisActuel, annee: anneeActuelle },
          select: { type: true, valeur: true, statut: true, salarie: { select: { salaireMensuel: true, heuresHebdomadaires: true } } },
        })
      : Promise.resolve([] as { type: string; valeur: number; statut: string; salarie: { salaireMensuel: number | null; heuresHebdomadaires: number | null } }[]),
    avecPaie ? prisma.absence.count({ where: { entrepriseId, statut: "En attente" } }) : Promise.resolve(0),
    avecTickets ? prisma.ticket.count({ where: { entrepriseId, statut: { not: "Clôturé" } } }) : Promise.resolve(0),
    prisma.ticketSupport.count({ where: { entrepriseId, statut: { not: "Clôturé" } } }),
    prisma.entreprise.findUnique({
      where: { id: entrepriseId },
      include: { abonnement: true, abonnementPaie: true },
    }),
    prisma.facturation.findMany({
      where: { entrepriseId, annee: anneeActuelle },
      select: { mois: true, montant: true, statut: true },
    }),
    // Estimation (avant génération de la facture) : même calcul que la facturation
    prisma.salarie.count({
      where: {
        entrepriseId,
        statut: "Actif",
        dateDebut: { lte: finMois },
        OR: [{ dateFin: null }, { dateFin: { gte: debutMois } }],
      },
    }),
    // Échéances des salariés (visites médicales, titres de séjour, avenants...)
    avecSalaries ? chargerEcheances({ entrepriseId }) : Promise.resolve([] as Echeance[]),
  ]);

  const masse = masseP ? await masseP : null;
  const coutPaie = variables.reduce((acc, v) => acc + calculerCout(v.type, v.valeur, v.salarie), 0);

  // Tickets RH : inclus (abonnement RH + formule paie), comptés sur le mois en cours
  const [ticketsMois, calculMois] = await Promise.all([
    ticketsDuMois(entrepriseId, moisActuel, anneeActuelle),
    calculerFacture(entrepriseId, moisActuel, anneeActuelle),
  ]);
  const quota = entreprise ? quotaTickets(entreprise) : { inclus: 0, prixSupp: 0 };
  const ticketsRestants = Math.max(quota.inclus - ticketsMois, 0);

  // Facturation du mois
  const facturationMois = facturesAnnee.find((f) => f.mois === moisActuel) || null;

  const abo = entreprise?.abonnement;
  const paie = entreprise?.abonnementPaie;

  // Estimation : même calcul que la facture (lib/facturation.ts)
  const estimation = calculMois?.montant || 0;

  const montantMois = facturationMois ? facturationMois.montant : Math.round(estimation * 100) / 100;

  const statutFacture = facturationMois ? facturationMois.statut : "Estimé";

  const tuiles = [
    permissions.includes("salaries") && { href: "/client/salaries", icone: "👥", label: "Salariés", n: nbSalaries, couleur: "text-gray-800" },
    permissions.includes("paie") && { href: "/client/paie", icone: "💰", label: "Paie ce mois", n: `${Math.round(coutPaie).toLocaleString("fr-FR")} €`, couleur: "text-red-500" },
    permissions.includes("paie") && { href: "/client/paie/absences", icone: "📅", label: "Absences", n: nbAbsences, couleur: "text-orange-500" },
    permissions.includes("tickets") && { href: "/client/tickets", icone: "🎫", label: "Tickets RH", n: nbTickets, couleur: "text-gray-800" },
    { href: "/client/helpdesk", icone: "🆘", label: "Helpdesk", n: nbTicketsSupport, couleur: "text-red-500" },
    permissions.includes("salaries") && { href: "/client/salaries", icone: "⏰", label: "Échéances", n: echeances.length, couleur: "text-orange-500" },
  ].filter(Boolean) as { href: string; icone: string; label: string; n: number | string; couleur: string }[];

  const lienFacture = permissions.includes("entreprise") ? "/client/entreprise/facturation" : "#";

  // Évolution des coûts Franeo : factures réelles, estimation pour le mois en cours
  const couts = MOIS.map((nom, i) => {
    const f = facturesAnnee.find((x) => x.mois === i + 1);
    const reel = f ? f.montant : 0;
    const estime = !f && i + 1 === moisActuel ? montantMois : 0;
    return { nom: ["Janv","Févr","Mars","Avr","Mai","Juin","Juil","Août","Sept","Oct","Nov","Déc"][i], valeur: reel || estime, estime: !!estime, actuel: i + 1 === moisActuel };
  });
  const maxCout = Math.max(...couts.map((m) => m.valeur), 1);
  const totalCouts = couts.reduce((acc, m) => acc + m.valeur, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} permissions={permissions} />
      <main className="px-6 py-4 flex flex-col gap-4">

        <div className="flex items-baseline justify-between px-1">
          <h1 className="text-xl font-bold">👋 Bonjour {session.prenom} !</h1>
          <p className="text-gray-500 text-sm">{entreprise?.nom} — {MOIS[moisActuel - 1]} {anneeActuelle}</p>
        </div>

        {/* Toutes les tuiles sur une seule ligne */}
        <div className="fr-grille-tuiles" style={{ display: "grid", gridTemplateColumns: `repeat(${tuiles.length}, minmax(0, 1fr))`, gap: "0.75rem" }}>
          {tuiles.map((t) => (
            <Link key={t.label} href={t.href} className="bg-white rounded-2xl shadow p-3 text-center hover:shadow-md transition">
              <p className="text-2xl">{t.icone}</p>
              <p className={`text-3xl font-bold leading-tight ${t.couleur}`}>{t.n}</p>
              <p className="text-gray-400 text-[11px] font-semibold uppercase">{t.label}</p>
            </Link>
          ))}
        </div>

        {masse && <EncartMasseSalariale data={masse} lien="/client/paie" />}

        {/* Graphique des coûts + abonnements actuels */}
        <div className="fr-grille-2" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-bold">📊 Évolution de vos coûts Franeo {anneeActuelle}</h2>
              <span className="text-sm font-bold text-orange-500">{Math.round(totalCouts).toLocaleString("fr-FR")} €</span>
            </div>
            <div className="flex items-end gap-2 h-36">
              {couts.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span className="text-[10px] text-gray-500 mb-1">{m.valeur > 0 ? `${Math.round(m.valeur).toLocaleString("fr-FR")} €` : ""}</span>
                  <div
                    className={`w-full rounded-t-md ${m.estime ? "bg-orange-300" : m.valeur > 0 ? "bg-orange-500" : "bg-gray-200"}`}
                    style={{ height: `${Math.max((m.valeur / maxCout) * 100, m.valeur > 0 ? 4 : 1)}%` }}
                  />
                  <span className={`text-[11px] mt-1 ${m.actuel ? "font-bold text-orange-500" : "text-gray-400"}`}>{m.nom}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Orange foncé : factures émises · orange clair : estimation du mois en cours</p>
          </div>

          <Link href={lienFacture} className="bg-white rounded-2xl shadow p-4 hover:shadow-md transition flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold">💳 Mes abonnements</h2>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                statutFacture === "Payé" ? "bg-green-100 text-green-700" :
                statutFacture === "En retard" ? "bg-red-100 text-red-700" :
                statutFacture === "Estimé" ? "bg-gray-100 text-gray-600" : "bg-orange-100 text-orange-700"
              }`}>{facturationMois ? "Facture" : "Estimation"} · {statutFacture}</span>
            </div>

            <div className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white px-4 py-3">
              <p className="text-orange-100 text-[11px] font-semibold uppercase">RH</p>
              <div className="flex justify-between items-baseline">
                <p className="text-xl font-bold">{abo?.nom || "—"}</p>
                <p className="text-sm font-semibold">{abo ? `${abo.prixMensuel.toLocaleString("fr-FR")} €/mois` : ""}</p>
              </div>
              <p className="text-orange-100 text-xs mt-1">
                {abo ? `${nbSalariesMois}/${abo.salariesInclus} salariés · ${ticketsRestants}/${quota.inclus} tickets restants ce mois` : "Non souscrit"}
              </p>
            </div>

            <div className="rounded-xl bg-gradient-to-r from-gray-800 to-gray-700 text-white px-4 py-3">
              <p className="text-gray-300 text-[11px] font-semibold uppercase">Paie</p>
              <div className="flex justify-between items-baseline">
                <p className="text-xl font-bold">{paie?.nom || "—"}</p>
                <p className="text-sm font-semibold">{paie ? `${paie.prixMensuel.toLocaleString("fr-FR")} €/mois` : ""}</p>
              </div>
              <p className="text-gray-300 text-xs mt-1">
                {paie ? `${nbSalariesMois}/${paie.bulletinsInclus} bulletins inclus${paie.ticketsRHInclus > 0 ? ` · ${paie.ticketsRHInclus} ticket(s) RH/mois` : ""}` : "Non souscrit"}
              </p>
            </div>

            <div className="flex justify-between items-baseline px-1">
              <span className="text-gray-500 text-xs">{MOIS[moisActuel - 1]} {facturationMois ? "(facturé)" : "(estimé)"}</span>
              <span className="text-2xl font-bold text-orange-500">{montantMois.toLocaleString("fr-FR")} €</span>
            </div>
          </Link>
        </div>

        {permissions.includes("salaries") && (
          <div className="max-h-[170px] flex flex-col">
            <BlocEcheances echeances={echeances} role="CLIENT" max={6} />
          </div>
        )}

      </main>
    </div>
  );
}
