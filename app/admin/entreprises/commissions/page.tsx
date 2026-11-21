import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import CadreAdmin from "@/components/CadreAdmin";
import TableauCommissions from "@/components/TableauCommissions";
import { commissionsDuMois } from "@/lib/commissions";

export const dynamic = "force-dynamic";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** Admin › Commissions à reverser (% du CA des clients apportés) */
export default async function PageCommissions({ searchParams }: { searchParams: Promise<{ mois?: string; base?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");
  const sp = await searchParams;
  const now = new Date();
  const m = /^(\d{4})-(\d{2})$/.exec(sp.mois || "");
  const annee = m ? +m[1] : now.getFullYear(), mois = m ? +m[2] : now.getMonth() + 1;
  const base = sp.base === "FACTURE" ? "FACTURE" : "ENCAISSE";
  let lignes: Awaited<ReturnType<typeof commissionsDuMois>> = [];
  let erreur = "";
  try { lignes = await commissionsDuMois(mois, annee, base); } catch { erreur = "La base n'est pas à jour : lancez « npx prisma db push »."; }
  const cle = (a: number, mo: number) => `${a}-${String(mo).padStart(2, "0")}`;
  const prec = mois === 1 ? cle(annee - 1, 12) : cle(annee, mois - 1);
  const suiv = mois === 12 ? cle(annee + 1, 1) : cle(annee, mois + 1);
  const total = lignes.reduce((t, l) => t + l.montant, 0);
  const verse = lignes.filter((l) => l.versee).reduce((t, l) => t + (l.versee?.montant ?? 0), 0);
  const libelle = `${MOIS[mois - 1]} ${annee}`;
  return (
    <CadreAdmin>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">💶 Commissions à reverser</h1>
        <p className="text-gray-500 mt-1">Part du CA des clients apportés par un parrain ou un partenaire (code promo avec commission, ou réglée dans la fiche du client).</p>
        <div className="flex gap-3 items-center flex-wrap mt-4">
          <Link href={`?mois=${prec}&base=${base}`} className="border rounded-lg px-3 py-1">←</Link>
          <span className="font-bold text-lg capitalize">{libelle}</span>
          <Link href={`?mois=${suiv}&base=${base}`} className="border rounded-lg px-3 py-1">→</Link>
          <span className="text-sm text-gray-500 ml-4">Calcul sur :</span>
          <Link href={`?mois=${cle(annee, mois)}&base=ENCAISSE`} className={`rounded-lg px-3 py-1 text-sm font-semibold ${base === "ENCAISSE" ? "bg-orange-500 text-white" : "border"}`}>CA encaissé</Link>
          <Link href={`?mois=${cle(annee, mois)}&base=FACTURE`} className={`rounded-lg px-3 py-1 text-sm font-semibold ${base === "FACTURE" ? "bg-orange-500 text-white" : "border"}`}>CA facturé</Link>
        </div>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <div className="bg-white rounded-xl shadow p-4"><p className="text-xs font-semibold text-gray-500">À reverser</p><p className="text-2xl font-bold" style={{ color: "#6d28d9" }}>{eur(total)}</p></div>
        <div className="bg-white rounded-xl shadow p-4"><p className="text-xs font-semibold text-gray-500">Déjà versé</p><p className="text-2xl font-bold text-green-700">{eur(verse)}</p></div>
        <div className="bg-white rounded-xl shadow p-4"><p className="text-xs font-semibold text-gray-500">Clients concernés</p><p className="text-2xl font-bold">{lignes.length}</p></div>
      </div>
      <div className="bg-white rounded-xl shadow p-6">
        {erreur ? <p className="text-red-600 font-semibold">❌ {erreur}</p> : <TableauCommissions lignes={JSON.parse(JSON.stringify(lignes))} mois={mois} annee={annee} base={base} libelleMois={libelle} />}
        <p className="text-xs text-gray-500 mt-4">Sur « CA encaissé », seules les factures marquées Payé comptent : la commission suit vos encaissements. Pensez à demander une facture (ou une note d&apos;honoraires) au bénéficiaire pour chaque versement.</p>
      </div>
    </CadreAdmin>
  );
}
