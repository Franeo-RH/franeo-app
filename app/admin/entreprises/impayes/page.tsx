import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import CadreAdmin from "@/components/CadreAdmin";
import BoutonAction from "@/components/BoutonAction";
import { MOIS_FR } from "@/lib/bulletins";
import { PALIERS_RELANCE } from "@/lib/relances";

export const dynamic = "force-dynamic";
const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** Admin › Entreprises › Impayés et relances */
export default async function PageImpayes() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");
  const factures = await prisma.facturation.findMany({
    where: { statut: { not: "Payé" }, entreprise: { demo: false } },
    include: { entreprise: { select: { id: true, nom: true } } },
    orderBy: [{ dateLimitePaie: "asc" }],
  });
  const maintenant = Date.now();
  const enRetard = factures.filter((f) => f.dateLimitePaie && f.dateLimitePaie.getTime() < maintenant);
  const total = (l: typeof factures) => l.reduce((t, f) => t + f.montant, 0);
  return (
    <CadreAdmin>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">💸 Impayés & relances</h1>
        <p className="text-gray-500 mt-1">Relances automatiques chaque nuit à J+{PALIERS_RELANCE.join(", J+")} après la date limite (3 au plus), puis vous êtes prévenu. Vous pouvez aussi relancer à la main.</p>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        {[{ l: "En attente de paiement", v: eur(total(factures)), n: factures.length }, { l: "En retard", v: eur(total(enRetard)), n: enRetard.length, a: true }, { l: "Après 3 relances", v: eur(total(factures.filter((f) => f.relances >= 3))), n: factures.filter((f) => f.relances >= 3).length, a: true }].map((k) => (
          <div key={k.l} className="bg-white rounded-xl shadow p-4"><p className="text-xs font-semibold text-gray-500">{k.l} ({k.n})</p><p className="text-2xl font-bold" style={{ color: k.a && k.n ? "#dc2626" : "#111827" }}>{k.v}</p></div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow p-6">
        {factures.length === 0 ? <p className="text-gray-500">Aucune facture en attente. 🎉</p> : (
          <table className="w-full text-sm text-left">
            <thead><tr className="text-gray-500 border-b"><th className="pb-2">Client</th><th className="pb-2">Mois</th><th className="pb-2">Montant</th><th className="pb-2">Date limite</th><th className="pb-2">Retard</th><th className="pb-2">Relances</th><th /></tr></thead>
            <tbody>
              {factures.map((f) => {
                const retard = f.dateLimitePaie ? Math.floor((maintenant - f.dateLimitePaie.getTime()) / 86400000) : null;
                return (
                  <tr key={f.id} className="border-b last:border-0">
                    <td data-label="Client" className="py-2 font-semibold"><Link href={`/admin/entreprises/${f.entreprise.id}?onglet=facturation`} className="hover:text-orange-600">{f.entreprise.nom}</Link></td>
                    <td data-label="Mois" className="py-2">{MOIS_FR[f.mois - 1]} {f.annee}</td>
                    <td data-label="Montant" className="py-2">{eur(f.montant)}</td>
                    <td data-label="Date limite" className="py-2">{f.dateLimitePaie ? f.dateLimitePaie.toLocaleDateString("fr-FR") : "—"}</td>
                    <td data-label="Retard" className="py-2" style={{ color: retard && retard > 0 ? "#dc2626" : "#6b7280" }}>{retard === null ? "—" : retard > 0 ? `${retard} j` : "à venir"}</td>
                    <td data-label="Relances" className="py-2">{f.relances}{f.derniereRelance ? ` · ${f.derniereRelance.toLocaleDateString("fr-FR")}` : ""}</td>
                    <td data-label="" className="py-2 text-right"><BoutonAction url="/api/admin/relances" corps={{ facturationId: f.id }} label="✉️ Relancer" confirmer={`Relancer ${f.entreprise.nom} ?`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </CadreAdmin>
  );
}
