import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BandeauFraneoJobs from "@/components/BandeauFraneoJobs";
import { appFraneo, STATUTS_DEMANDE, TYPES_DEMANDE } from "@/lib/apps-franeo";

export const dynamic = "force-dynamic";

type Ligne = { date: Date; type: string; titre: string; statut: string; href?: string };

/** Tickets RH › Historique des demandes : tickets, demandes ponctuelles, recrutements, audits, formations, apps, devis */
export default async function HistoriqueDemandes({ searchParams }: { searchParams: Promise<{ recrutement?: string; type?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");
  const entrepriseId = session.entrepriseId!;
  const sp = await searchParams;

  const [tickets, questions, recrutements, services, devis] = await Promise.all([
    prisma.ticket.findMany({ where: { entrepriseId }, select: { id: true, titre: true, statut: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.questionRH.findMany({ where: { entrepriseId }, select: { sujet: true, statut: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.demandeRecrutement.findMany({ where: { entrepriseId }, select: { poste: true, statut: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.demandeService.findMany({ where: { entrepriseId }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.devis.findMany({ where: { entrepriseId }, select: { statut: true, createdAt: true, totalIndicatif: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const LIB_Q: Record<string, string> = { OUVERTE: "En attente", REPONDUE: "Répondu", TICKET: "Ticket à ouvrir", CLOSE: "Close" };

  const lignes: Ligne[] = [
    ...tickets.map((t) => ({ date: t.createdAt, type: "🎫 Ticket RH", titre: t.titre, statut: t.statut, href: `/client/tickets/${t.id}` })),
    ...questions.map((q) => ({ date: q.createdAt, type: "💬 Demande ponctuelle", titre: q.sujet, statut: LIB_Q[q.statut] || q.statut, href: "/client/tickets/questions" })),
    ...recrutements.map((r) => ({ date: r.createdAt, type: "🎯 Recrutement", titre: r.poste, statut: r.statut, href: "/client/tickets/recrutement/historique" })),
    ...services.map((d) => ({ date: d.createdAt, type: `${TYPES_DEMANDE[d.type]?.icone ?? ""} ${TYPES_DEMANDE[d.type]?.label ?? d.type}`, titre: d.app ? appFraneo(d.app)?.nom ?? d.app : d.options.join(", ") || d.message?.slice(0, 80) || "—", statut: STATUTS_DEMANDE[d.statut]?.label ?? d.statut, href: d.type === "AUDIT" ? "/client/tickets/audit" : "/client/entreprise/devis" })),
    ...devis.map((d) => ({ date: d.createdAt, type: "🧾 Devis", titre: `Devis ${Math.round(d.totalIndicatif)} € (indicatif)`, statut: d.statut })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const types = [...new Set(lignes.map((l) => l.type))];
  const filtrees = sp.type ? lignes.filter((l) => l.type === sp.type) : lignes;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-4 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          {sp.recrutement === "ok" && <BandeauFraneoJobs poste={recrutements[0]?.poste} />}
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">📋 Historique des demandes</h1>
            <p className="text-gray-500 mt-1">Toutes vos demandes à FRANEO RH, de la plus récente à la plus ancienne.</p>
            <div className="flex gap-2 flex-wrap mt-4">
              <Link href="/client/tickets/historique" className={`px-3 py-1 rounded-full text-sm font-semibold ${!sp.type ? "bg-orange-500 text-white" : "bg-gray-100"}`}>Tout ({lignes.length})</Link>
              {types.map((t) => (
                <Link key={t} href={`/client/tickets/historique?type=${encodeURIComponent(t)}`} className={`px-3 py-1 rounded-full text-sm font-semibold ${sp.type === t ? "bg-orange-500 text-white" : "bg-gray-100"}`}>{t} ({lignes.filter((l) => l.type === t).length})</Link>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Objet</th><th className="p-3">Statut</th></tr></thead>
              <tbody>
                {filtrees.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-gray-500">Aucune demande.</td></tr> : filtrees.map((l, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3 whitespace-nowrap">{l.date.toLocaleDateString("fr-FR")}</td>
                    <td className="p-3 whitespace-nowrap">{l.type}</td>
                    <td className="p-3">{l.href ? <Link href={l.href} className="font-semibold hover:text-orange-500">{l.titre}</Link> : l.titre}</td>
                    <td className="p-3"><span className="px-2 py-1 rounded-full bg-gray-100 text-xs font-semibold">{l.statut}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
