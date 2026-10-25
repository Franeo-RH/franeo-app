import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonSupprimerVariable from "@/components/BoutonSupprimerVariable";
import BoutonExport from "@/components/BoutonExport";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const TYPES_ABSENCE: Record<string, string> = {
  CONGE_PAYE: "🏖️ Congés payés",
  RTT: "📅 RTT",
  CONGE_SANS_SOLDE: "💼 Congé sans solde",
  CONGE_EXCEPTIONNEL: "⭐ Congé exceptionnel",
  CONGE_NAISSANCE: "👶 Congé naissance",
  MATERNITE_PATERNITE: "👨‍👩‍👦 Maternité / Paternité",
  MALADIE: "🤒 Maladie",
  ABSENCE_NON_REMUNEREE: "❌ Absence non rémunérée",
};

const TYPES_VARIABLE: Record<string, string> = {
  HEURE_SUPPLEMENTAIRE: "⏰ Heures supp.",
  PRIME: "💰 Prime",
  NOTE_FRAIS: "🧾 Note de frais",
  ACOMPTE: "💳 Acompte",
};

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
    return {
      coutBrut: Math.round(coutBrut * 100) / 100,
      coutEntreprise: Math.round(coutBrut * 1.40 * 100) / 100,
    };
  }
  return {
    coutBrut: valeur,
    coutEntreprise: Math.round(valeur * 1.40 * 100) / 100,
  };
}

const anneeActuelleGlobal = new Date().getFullYear();
const ANNEES = Array.from({ length: 25 }, (_, i) => anneeActuelleGlobal - 10 + i);

export default async function HistoriquePaie({
  searchParams,
}: {
  searchParams: Promise<{
    moisDebut?: string; anneeDebut?: string;
    moisFin?: string; anneeFin?: string;
    categorie?: string;
  }>;
}) {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");

  const sp = await searchParams;
  const maintenant = new Date();
  const moisCourant = maintenant.getMonth() + 1;
  const anneeCourante = maintenant.getFullYear();

  const moisDebut = parseInt(sp.moisDebut || String(moisCourant));
  const anneeDebut = parseInt(sp.anneeDebut || String(anneeCourante));
  const moisFin = parseInt(sp.moisFin || String(moisCourant));
  const anneeFin = parseInt(sp.anneeFin || String(anneeCourante));
  const categorie = sp.categorie || "tout";

  const periodes = Array.from(
    { length: (anneeFin - anneeDebut) * 12 + moisFin - moisDebut + 1 },
    (_, i) => {
      const d = new Date(anneeDebut, moisDebut - 1 + i);
      return { mois: d.getMonth() + 1, annee: d.getFullYear() };
    }
  );

  // Requêtes lancées en même temps
  const [variables, absences] = await Promise.all([
    prisma.variablePaie.findMany({
      where: {
        entrepriseId: session.entrepriseId!,
        OR: periodes,
      },
      include: { salarie: true },
      orderBy: [{ annee: "desc" }, { mois: "desc" }],
    }),
    prisma.absence.findMany({
      where: {
        entrepriseId: session.entrepriseId!,
        dateDebut: { gte: new Date(anneeDebut, moisDebut - 1, 1) },
        dateFin: { lte: new Date(anneeFin, moisFin, 0) },
      },
      include: { salarie: true },
      orderBy: { dateDebut: "desc" },
    }),
  ]);

  const variablesAvecCout = variables.map((v) => ({
    ...v,
    ...calculerCout(v.type, v.valeur, v.salarie),
  }));

  const variablesFiltrees = variablesAvecCout.filter(v => {
    if (categorie === "hs") return v.type === "HEURE_SUPPLEMENTAIRE";
    if (categorie === "prime") return v.type === "PRIME";
    if (categorie === "note_frais") return v.type === "NOTE_FRAIS";
    if (categorie === "acompte") return v.type === "ACOMPTE";
    return categorie !== "absence";
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <h1 className="text-3xl font-bold">📋 Historique</h1>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <BoutonExport type="client-variables" label="📊 Variables (Excel)" />
                <BoutonExport type="client-absences" label="📊 Absences (Excel)" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <form className="grid grid-cols-3 gap-4 items-end" method="GET">
              <div>
                <label className="block text-sm font-semibold mb-1">Catégorie</label>
                <select name="categorie" defaultValue={categorie} className="w-full border rounded-lg px-4 py-3">
                  <option value="tout">Tout</option>
                  <option value="hs">⏰ Heures supp.</option>
                  <option value="prime">💰 Primes</option>
                  <option value="note_frais">🧾 Notes de frais</option>
                  <option value="acompte">💳 Acomptes</option>
                  <option value="absence">🏖️ Absences</option>
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1">Mois début</label>
                  <select name="moisDebut" defaultValue={moisDebut} className="w-full border rounded-lg px-4 py-3">
                    {MOIS.map((m, i) => (<option key={i} value={i + 1}>{m}</option>))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1">Année</label>
                  <select name="anneeDebut" defaultValue={anneeDebut} className="w-full border rounded-lg px-4 py-3">
                    {ANNEES.map((a) => (<option key={a} value={a}>{a}</option>))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1">Mois fin</label>
                  <select name="moisFin" defaultValue={moisFin} className="w-full border rounded-lg px-4 py-3">
                    {MOIS.map((m, i) => (<option key={i} value={i + 1}>{m}</option>))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1">Année</label>
                  <select name="anneeFin" defaultValue={anneeFin} className="w-full border rounded-lg px-4 py-3">
                    {ANNEES.map((a) => (<option key={a} value={a}>{a}</option>))}
                  </select>
                </div>
              </div>
              <div className="col-span-3 flex justify-end">
                <button type="submit" className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition">
                  🔍 Filtrer
                </button>
              </div>
            </form>
          </div>

          {categorie !== "absence" && (
            <div className="bg-white rounded-xl shadow p-8 mb-6">
              <h2 className="text-xl font-bold mb-4">Variables de paie</h2>
              {variablesFiltrees.length === 0 ? (
                <p className="text-gray-500">Aucune variable pour cette période.</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3">Salarié</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Valeur</th>
                      <th className="pb-3">Coût brut</th>
                      <th className="pb-3">Coût entreprise</th>
                      <th className="pb-3">Mois</th>
                      <th className="pb-3">Statut</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {variablesFiltrees.map((v) => (
                      <tr key={v.id} className="border-b hover:bg-gray-50 transition">
                        <td className="py-3">{v.salarie.prenom} {v.salarie.nom}</td>
                        <td className="py-3">{TYPES_VARIABLE[v.type] || v.type}</td>
                        <td className="py-3">{v.type === "HEURE_SUPPLEMENTAIRE" ? `${v.valeur}h` : `${v.valeur} €`}</td>
                        <td className="py-3 text-orange-500 font-semibold">{v.coutBrut} €</td>
                        <td className="py-3 text-red-500 font-semibold">{v.coutEntreprise} €</td>
                        <td className="py-3 text-gray-500 text-sm">{MOIS[v.mois - 1]} {v.annee}</td>
                        <td className="py-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            v.statut === "En attente" ? "bg-orange-100 text-orange-600" :
                            v.statut === "Validé" ? "bg-green-100 text-green-600" :
                            "bg-gray-100 text-gray-600"
                          }`}>{v.statut}</span>
                        </td>
                        <td className="py-3">
                          {v.statut === "En attente" && <BoutonSupprimerVariable id={v.id} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {(categorie === "tout" || categorie === "absence") && (
            <div className="bg-white rounded-xl shadow p-8">
              <h2 className="text-xl font-bold mb-4">Absences</h2>
              {absences.length === 0 ? (
                <p className="text-gray-500">Aucune absence pour cette période.</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3">Salarié</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Du</th>
                      <th className="pb-3">Au</th>
                      <th className="pb-3">Commentaire</th>
                      <th className="pb-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absences.map((a) => (
                      <tr key={a.id} className="border-b hover:bg-gray-50 transition">
                        <td className="py-3">{a.salarie.prenom} {a.salarie.nom}</td>
                        <td className="py-3">{TYPES_ABSENCE[a.type] || a.type}</td>
                        <td className="py-3">{new Date(a.dateDebut).toLocaleDateString("fr-FR")}</td>
                        <td className="py-3">{new Date(a.dateFin).toLocaleDateString("fr-FR")}</td>
                        <td className="py-3 text-gray-500 text-sm">{a.commentaire || "—"}</td>
                        <td className="py-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            a.statut === "En attente" ? "bg-orange-100 text-orange-600" :
                            a.statut === "Validé" ? "bg-green-100 text-green-600" :
                            "bg-red-100 text-red-600"
                          }`}>{a.statut}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
