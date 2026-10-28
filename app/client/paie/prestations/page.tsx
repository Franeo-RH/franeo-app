import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import CommanderPrestation from "@/components/CommanderPrestation";
import MentionsFacturation from "@/components/MentionsFacturation";
import { NOMS_FORMULES, PRESTATIONS, STATUTS_PRESTATION, formuleQuiInclut, prixPrestation, type CodeFormule } from "@/lib/prestations";

export const dynamic = "force-dynamic";

export default async function ClientPrestations() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");
  if (!session.entreprise?.permissions.includes("paie")) redirect("/client/dashboard");

  const [entreprise, salaries, commandes] = await Promise.all([
    prisma.entreprise.findUnique({ where: { id: session.entrepriseId! }, include: { abonnementPaie: true } }),
    prisma.salarie.findMany({ where: { entrepriseId: session.entrepriseId!, statut: "Actif" }, select: { prenom: true, nom: true }, orderBy: { nom: "asc" } }),
    prisma.commandePrestation.findMany({ where: { entrepriseId: session.entrepriseId! }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  const formule = entreprise?.abonnementPaie?.code || null;
  const offres = formule
    ? PRESTATIONS.flatMap((p) => {
        const prix = prixPrestation(p.code, formule);
        if (prix === null) return [];
        const incl = formuleQuiInclut(p.code);
        return [{
          code: p.code, libelle: p.libelle, description: p.description, unite: p.unite, avecSalarie: p.avecSalarie,
          prix, incluseEn: incl ? NOMS_FORMULES[incl as CodeFormule] : null,
        }];
      })
    : [];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">
          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">🛒 Prestations</h1>
            <p className="text-gray-500 mt-1">
              {entreprise?.abonnementPaie
                ? <>Votre formule : <strong className="text-orange-500">{entreprise.abonnementPaie.nom}</strong>. Les arrivées et sorties de salariés sont facturées automatiquement d&apos;après leurs dates.</>
                : "Les prestations sont proposées avec une formule paie."}
            </p>
          </div>

          {session.entreprise?.demo && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px", fontWeight: 600 }}>
              🧪 Version démo : vous pouvez tester une commande, elle est simulée (rien n&apos;est facturé).
            </div>
          )}
          {!entreprise?.abonnementPaie ? (
            <div className="bg-white rounded-xl shadow p-8">
              <p className="text-gray-600">Aucune formule paie n&apos;est active sur votre compte.</p>
              <Link href="/client/abonnement-paie" className="text-orange-600 font-semibold hover:underline">Voir les formules paie →</Link>
            </div>
          ) : (
            <CommanderPrestation offres={offres} salaries={salaries.map((s) => `${s.prenom} ${s.nom}`)} />
          )}

          {commandes.length > 0 && (
            <div className="bg-white rounded-xl shadow p-8 mt-6">
              <h2 className="text-xl font-bold mb-4">Mes commandes</h2>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Prestation</th>
                    <th className="pb-3">Salarié</th>
                    <th className="pb-3">Montant</th>
                    <th className="pb-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {commandes.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-3 text-sm text-gray-500">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3">{c.libelle}{c.quantite > 1 ? ` × ${c.quantite}` : ""}</td>
                      <td className="py-3 text-sm">{c.salarie || "—"}</td>
                      <td className="py-3 font-semibold">{c.total > 0 ? `${c.total} €` : "Inclus"}</td>
                      <td className="py-3 text-sm">{STATUTS_PRESTATION[c.statut] || c.statut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <MentionsFacturation />
        </main>
      </div>
    </div>
  );
}
