import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonCloture from "@/components/BoutonCloture";
import { NOMS_MOIS } from "@/lib/heures";

export const dynamic = "force-dynamic";

/** Paie › Contrôle avant paie : la liste de ce qui manque ou attend encore avant la clôture du mois */
export default async function ControleAvantPaie() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");
  const entrepriseId = session.entrepriseId!;
  const now = new Date();
  const mois = now.getMonth() + 1, annee = now.getFullYear();
  const debut = new Date(annee, mois - 1, 1), fin = new Date(annee, mois, 0, 23, 59, 59);
  const espace = (session.entreprise?.permissions || []).includes("espace-salaries");

  const [actifs, absAttente, relevesAttente, fraisAttente, demandes, entrees, sorties, varsAttente] = await Promise.all([
    prisma.salarie.findMany({ where: { entrepriseId, statut: "Actif", dateDebut: { lte: fin }, OR: [{ dateFin: null }, { dateFin: { gte: debut } }] }, select: { id: true, prenom: true, nom: true, salaireMensuel: true, iban: true, numeroSecuriteSociale: true, compte: { select: { id: true } }, releves: { where: { mois, annee }, select: { statut: true } } } }),
    prisma.absence.count({ where: { entrepriseId, statut: "En attente", dateDebut: { lte: fin } } }),
    prisma.releveMois.count({ where: { entrepriseId, mois, annee, statut: "Envoyé" } }),
    prisma.noteFrais.count({ where: { entrepriseId, statut: "En attente" } }),
    prisma.demandeSalarie.count({ where: { entrepriseId, statut: "EN_ATTENTE" } }),
    prisma.salarie.findMany({ where: { entrepriseId, dateDebut: { gte: debut, lte: fin } }, select: { id: true, prenom: true, nom: true } }),
    prisma.salarie.findMany({ where: { entrepriseId, dateFin: { gte: debut, lte: fin } }, select: { id: true, prenom: true, nom: true } }),
    prisma.variablePaie.count({ where: { entrepriseId, mois, annee, statut: "En attente" } }),
  ]);

  const sansSalaire = actifs.filter((s) => !s.salaireMensuel);
  const sansRib = actifs.filter((s) => !s.iban);
  const sansNss = actifs.filter((s) => !s.numeroSecuriteSociale);
  const relevesManquants = espace ? actifs.filter((s) => s.compte && !s.releves.some((r) => r.statut === "Validé" || r.statut === "Envoyé")) : [];

  const points: { ok: boolean; titre: string; detail?: string; href?: string; noms?: { id: string; prenom: string; nom: string }[] }[] = [
    { ok: absAttente === 0, titre: `${absAttente} absence(s) en attente de validation`, href: "/client/salaries/absences" },
    ...(espace ? [
      { ok: relevesAttente === 0, titre: `${relevesAttente} relevé(s) envoyé(s) à valider`, href: "/client/salaries/releves" },
      { ok: relevesManquants.length === 0, titre: `${relevesManquants.length} salarié(s) n'ont pas encore envoyé leur relevé de ${NOMS_MOIS[mois - 1]}`, noms: relevesManquants },
      { ok: fraisAttente === 0, titre: `${fraisAttente} note(s) de frais à valider`, href: "/client/salaries/frais" },
    ] : []),
    { ok: demandes === 0, titre: `${demandes} demande(s) salarié en attente de validation FRANEO RH`, href: "/client/salaries/demandes" },
    { ok: sansSalaire.length === 0, titre: `${sansSalaire.length} salarié(s) sans salaire renseigné`, noms: sansSalaire },
    { ok: sansRib.length === 0, titre: `${sansRib.length} salarié(s) sans RIB`, noms: sansRib },
    { ok: sansNss.length === 0, titre: `${sansNss.length} salarié(s) sans n° de sécurité sociale`, noms: sansNss },
    { ok: true, titre: `${entrees.length} entrée(s) et ${sorties.length} sortie(s) ce mois`, noms: [...entrees, ...sorties], href: "/client/salaries/mouvements" },
    { ok: true, titre: `${varsAttente} variable(s) saisie(s) pour ${NOMS_MOIS[mois - 1]}`, href: "/client/paie/historique" },
  ];
  const restants = points.filter((p) => !p.ok).length;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-4 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">🔎 Contrôle avant paie — {NOMS_MOIS[mois - 1]} {annee}</h1>
            <p className="text-gray-500 mt-1">{restants === 0 ? "✅ Tout est prêt : vous pouvez demander la clôture du mois." : `${restants} point(s) à régler avant de demander la clôture.`}</p>
          </div>
          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <div className="bg-white rounded-xl shadow p-4 flex flex-col divide-y">
              {points.map((p) => (
                <div key={p.titre} className="py-3">
                  <p className="font-semibold">{p.ok ? "✅" : "⚠️"} {p.href ? <Link href={p.href} className="hover:text-orange-500">{p.titre} →</Link> : p.titre}</p>
                  {p.noms && p.noms.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">{p.noms.slice(0, 15).map((n, i) => <span key={n.id + i}>{i > 0 && ", "}<Link href={`/client/salaries/${n.id}`} className="hover:underline">{n.prenom} {n.nom}</Link></span>)}{p.noms.length > 15 ? "…" : ""}</p>
                  )}
                </div>
              ))}
            </div>
            <div><BoutonCloture mois={mois} annee={annee} /></div>
          </div>
        </main>
      </div>
    </div>
  );
}
