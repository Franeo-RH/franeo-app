import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonPackRH from "@/components/BoutonPackRH";
import OngletsAbonnements from "@/components/OngletsAbonnements";
import ExportCSV from "@/components/ExportCSV";
import { PRIX_TICKET_SANS_ABONNEMENT } from "@/lib/facturation";

export const dynamic = "force-dynamic";

const TEINTES = ["#9ca3af", "#3b82f6", "#8b5cf6", "#f59e0b", "#111827"];
const eur = (n: number) => `${Math.round(n * 100) / 100} €`.replace(".", ",");

export default async function AdminAbonnementsRH({ searchParams }: { searchParams: Promise<{ pack?: string; tous?: string; base?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");
  const sp = await searchParams;

  const maintenant = new Date();
  const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const fin = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0, 23, 59, 59);

  const [packs, entreprises, comptes, tickets] = await Promise.all([
    prisma.abonnement.findMany({ orderBy: { prixMensuel: "asc" } }),
    prisma.entreprise.findMany({ where: { demo: false }, select: { id: true, nom: true, actif: true, abonnementId: true, abonnementPaieId: true }, orderBy: { nom: "asc" } }),
    prisma.salarie.groupBy({
      by: ["entrepriseId"],
      where: { statut: "Actif", dateDebut: { lte: fin }, OR: [{ dateFin: null }, { dateFin: { gte: debut } }], entreprise: { demo: false } },
      _count: { _all: true },
    }),
    prisma.ticket.groupBy({ by: ["entrepriseId"], where: { createdAt: { gte: debut, lte: fin }, entreprise: { demo: false } }, _count: { _all: true } }),
  ]);

  const lignes = entreprises.map((e) => {
    const p = packs.find((x) => x.id === e.abonnementId) ?? null;
    const salaries = comptes.find((c) => c.entrepriseId === e.id)?._count._all ?? 0;
    const nbTickets = tickets.find((t) => t.entrepriseId === e.id)?._count._all ?? 0;
    const supp = p ? Math.max(salaries - p.salariesInclus, 0) : 0;
    const base = !e.abonnementId && !e.abonnementPaieId;
    const montant = p ? p.prixMensuel + supp * p.prixSalarieSupp : base ? nbTickets * PRIX_TICKET_SANS_ABONNEMENT : 0;
    const mieux = p ? packs.find((x) => x.prixMensuel > p.prixMensuel && x.prixMensuel + Math.max(salaries - x.salariesInclus, 0) * x.prixSalarieSupp < montant) : undefined;
    return { e, p, salaries, nbTickets, supp, montant, mieux, base };
  });
  const filtrees = lignes.filter((l) => (sp.pack ? l.p?.id === sp.pack : sp.base ? l.base : sp.tous ? true : !!l.p));
  const parPack = (id: string) => lignes.filter((l) => l.p?.id === id);
  const caRH = lignes.reduce((a, l) => a + (l.e.actif !== false ? l.montant : 0), 0);
  const nbBase = lignes.filter((l) => l.base).length;

  const puce = (actif: boolean) => `px-3 py-1 rounded-full text-sm font-semibold ${actif ? "bg-orange-500 text-white" : "bg-white text-gray-600 border"}`;
  type Pack = (typeof packs)[number];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom={session.prenom} />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-6 md:p-10" style={{ minWidth: 0 }}>
          <OngletsAbonnements espace="admin" actif="rh" />

          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <div className="bg-white rounded-xl shadow p-4" style={{ borderTop: "4px solid #f97316" }}>
              <p className="text-xs font-bold text-gray-500 uppercase">Clients pack RH</p>
              <p className="text-2xl font-bold">{lignes.filter((l) => l.p).length}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs font-bold text-gray-500 uppercase">Accès de base gratuits</p>
              <p className="text-2xl font-bold">{nbBase}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs font-bold text-gray-500 uppercase">Salariés suivis ce mois</p>
              <p className="text-2xl font-bold">{lignes.filter((l) => l.p).reduce((a, l) => a + l.salaries, 0)}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs font-bold text-gray-500 uppercase">CA RH du mois (packs + tickets à l'unité)</p>
              <p className="text-2xl font-bold">{eur(caRH)}</p>
            </div>
          </div>

          {/* Comparatif des packs */}
          <div className="bg-white rounded-xl shadow p-6 mb-6" style={{ overflowX: "auto" }}>
            <h1 className="text-2xl font-bold mb-4">💳 Packs Admin RH</h1>
            <table className="w-full text-sm fr-tableau-fixe" style={{ minWidth: "640px" }}>
              <thead>
                <tr>
                  <th className="text-left py-2"></th>
                  <th className="py-2 px-2 text-center" style={{ borderTop: `4px solid ${TEINTES[0]}` }}>
                    <span className="block text-base font-bold">Accès de base</span>
                    <span className="block text-2xl font-black">0 €</span>
                    <span className="block text-xs text-gray-500 font-normal">{nbBase} client(s)</span>
                  </th>
                  {packs.map((p, i) => (
                    <th key={p.id} className="py-2 px-2 text-center" style={{ borderTop: `4px solid ${TEINTES[(i % 4) + 1]}` }}>
                      <span className="block text-base font-bold">{p.nom}</span>
                      <span className="block text-2xl font-black">{p.prixMensuel} €</span>
                      <span className="block text-xs text-gray-500 font-normal">{parPack(p.id).length} client(s)</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Salariés inclus", base: "—", v: (p: Pack) => String(p.salariesInclus) },
                  { label: "Salarié en plus", base: "—", v: (p: Pack) => eur(p.prixSalarieSupp) },
                  { label: "Tickets RH inclus / mois", base: "0", v: (p: Pack) => String(p.ticketsRH) },
                  { label: "Ticket RH en plus", base: eur(PRIX_TICKET_SANS_ABONNEMENT), v: (p: Pack) => eur(p.prixTicketSupp) },
                  { label: "Questions RH ponctuelles", base: "✓", v: () => "✓" },
                ].map((r) => (
                  <tr key={r.label} className="border-t">
                    <td className="py-2 font-semibold text-gray-600">{r.label}</td>
                    <td className="py-2 text-center font-semibold">{r.base}</td>
                    {packs.map((p) => <td key={p.id} className="py-2 text-center font-semibold">{r.v(p)}</td>)}
                  </tr>
                ))}
                <tr className="border-t align-top">
                  <td className="py-2 font-semibold text-gray-600">Services</td>
                  <td className="py-2 text-xs text-gray-500 text-center">Application, FAQ, communications</td>
                  {packs.map((p) => (
                    <td key={p.id} className="py-2 px-2">
                      <ul className="text-xs flex flex-col gap-1">
                        {p.features.map((f) => <li key={f}><span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span> {f}</li>)}
                      </ul>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-3">Les prix se mettent à jour avec le script prisma/packs-rh-2026.ts.</p>
          </div>

          {/* Clients */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
              <h2 className="text-xl font-bold">🏢 Clients et pack RH</h2>
              <ExportCSV nom="clients-rh" entetes={["Entreprise", "Pack", "Salariés ce mois", "Inclus", "En plus", "Tickets ce mois", "Montant RH estimé"]}
                lignes={filtrees.map((l) => [l.e.nom, l.p?.nom ?? (l.base ? "Accès de base" : "Aucun (client paie)"), l.salaries, l.p?.salariesInclus ?? "", l.supp, l.nbTickets, l.montant])} />
            </div>
            <div className="flex gap-2 flex-wrap mb-4">
              <Link href="/admin/abonnements-rh" className={puce(!sp.pack && !sp.tous && !sp.base)}>Avec pack RH</Link>
              {packs.map((p) => <Link key={p.id} href={`/admin/abonnements-rh?pack=${p.id}`} className={puce(sp.pack === p.id)}>{p.nom} ({parPack(p.id).length})</Link>)}
              <Link href="/admin/abonnements-rh?base=1" className={puce(!!sp.base)}>Accès de base ({nbBase})</Link>
              <Link href="/admin/abonnements-rh?tous=1" className={puce(!!sp.tous)}>Tous les clients</Link>
            </div>
            {filtrees.length === 0 ? <p className="text-gray-500">Aucun client avec ce filtre.</p> : (
              <div style={{ overflowX: "auto" }}>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="py-2">Entreprise</th><th className="py-2">Salariés ce mois</th><th className="py-2">Tickets ce mois</th><th className="py-2">Montant RH estimé</th><th className="py-2">Conseil</th><th className="py-2">Pack</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrees.map((l) => (
                      <tr key={l.e.id} className="border-b align-middle">
                        <td className="py-2 font-semibold">
                          <Link href={`/admin/entreprises/${l.e.id}`} className="hover:underline">{l.e.nom}</Link>
                          {l.e.actif === false && <span className="ml-2 text-xs text-red-600">suspendue</span>}
                        </td>
                        <td className="py-2">
                          {l.p ? (<><strong>{l.salaries}</strong> / {l.p.salariesInclus}{l.supp > 0 && <span style={{ color: "#c2410c", fontWeight: 700 }}> (+{l.supp})</span>}</>) : <span className="text-gray-400">{l.salaries}</span>}
                        </td>
                        <td className="py-2">{l.nbTickets}{l.p ? ` / ${l.p.ticketsRH}` : l.base && l.nbTickets > 0 ? ` × ${PRIX_TICKET_SANS_ABONNEMENT} €` : ""}</td>
                        <td className="py-2 font-semibold">{l.p || l.base ? eur(l.montant) : "—"}</td>
                        <td className="py-2 text-xs">
                          {l.mieux ? <span style={{ color: "#15803d", fontWeight: 600 }}>💡 {l.mieux.nom} reviendrait moins cher</span>
                            : l.base && l.nbTickets * PRIX_TICKET_SANS_ABONNEMENT > (packs[0]?.prixMensuel ?? Infinity) ? <span style={{ color: "#15803d", fontWeight: 600 }}>💡 Un pack RH reviendrait moins cher</span> : ""}
                        </td>
                        <td className="py-2"><BoutonPackRH entrepriseId={l.e.id} abonnementId={l.e.abonnementId || ""} packs={packs.map((p) => ({ id: p.id, nom: p.nom, prixMensuel: p.prixMensuel }))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
