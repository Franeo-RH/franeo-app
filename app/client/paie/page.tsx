import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import SuiviMasseSalariale from "@/components/SuiviMasseSalariale";
import { calculerMasseSalariale } from "@/lib/masse-salariale";
import BoutonExport from "@/components/BoutonExport";

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

export default async function ClientPaie({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; annee?: string }>;
}) {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");

  if (!session.entreprise?.permissions.includes("paie")) {
    redirect("/client/dashboard");
  }

  // Mois affiché (par défaut : le mois en cours)
  const sp = await searchParams;
  const maintenant = new Date();
  const moisChoisi = parseInt(sp.mois || "");
  const anneeChoisie = parseInt(sp.annee || "");
  const moisActuel = moisChoisi >= 1 && moisChoisi <= 12 ? moisChoisi : maintenant.getMonth() + 1;
  const anneeActuelle = anneeChoisie >= 2000 && anneeChoisie <= 2100 ? anneeChoisie : maintenant.getFullYear();
  const masseP = calculerMasseSalariale({ mois: moisActuel, annee: anneeActuelle, entrepriseId: session.entrepriseId! });



  // Requêtes lancées en même temps
  const [variables, absences] = await Promise.all([
    prisma.variablePaie.findMany({
      where: {
        entrepriseId: session.entrepriseId!,
        mois: moisActuel,
        annee: anneeActuelle,
      },
      include: { salarie: true },
    }),
    prisma.absence.findMany({
      where: {
        entrepriseId: session.entrepriseId!,
        dateDebut: { gte: new Date(anneeActuelle, moisActuel - 1, 1) },
        dateFin: { lte: new Date(anneeActuelle, moisActuel, 0) },
      },
    }),
  ]);

  const masse = await masseP;

  const hs = variables.filter(v => v.type === "HEURE_SUPPLEMENTAIRE");
  const primes = variables.filter(v => v.type === "PRIME");
  const notesFrais = variables.filter(v => v.type === "NOTE_FRAIS");
  const acomptes = variables.filter(v => v.type === "ACOMPTE");

  const totalHS = hs.reduce((acc, v) => acc + v.valeur, 0);
  const totalCoutHS = hs.reduce((acc, v) => acc + calculerCout(v.type, v.valeur, v.salarie).coutEntreprise, 0);
  const totalPrimes = primes.reduce((acc, v) => acc + v.valeur, 0);
  const totalNotesFrais = notesFrais.reduce((acc, v) => acc + v.valeur, 0);
  const totalAcomptes = acomptes.reduce((acc, v) => acc + v.valeur, 0);

  const totalJoursAbsence = absences.reduce((acc, a) => {
    const diff = Math.ceil((new Date(a.dateFin).getTime() - new Date(a.dateDebut).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return acc + diff;
  }, 0);

  const totalCoutEntreprise = variables.reduce((acc, v) => {
    return acc + calculerCout(v.type, v.valeur, v.salarie).coutEntreprise;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <h1 className="text-3xl font-bold">💰 Paie</h1>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <BoutonExport type="client-variables" label="📊 Variables du mois" />
                </div>
              </div>
              <p className="text-gray-500 mt-1">{MOIS[moisActuel - 1]} {anneeActuelle}</p>
            </div>
            <Link href="/client/paie/saisie" className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition">
              ✏️ Saisir des variables
            </Link>
          </div>

          {/* Choix du mois */}
          <form method="get" className="bg-white rounded-xl shadow p-4 mb-6" style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label htmlFor="mois-suivi" className="block text-sm font-semibold mb-1">Mois</label>
              <select id="mois-suivi" name="mois" defaultValue={moisActuel} className="border rounded-lg px-3 py-2">
                {MOIS.map((m, i) => (<option key={m} value={i + 1}>{m}</option>))}
              </select>
            </div>
            <div>
              <label htmlFor="annee-suivi" className="block text-sm font-semibold mb-1">Année</label>
              <select id="annee-suivi" name="annee" defaultValue={anneeActuelle} className="border rounded-lg px-3 py-2">
                {[maintenant.getFullYear() - 2, maintenant.getFullYear() - 1, maintenant.getFullYear(), maintenant.getFullYear() + 1].map((a) => (<option key={a} value={a}>{a}</option>))}
              </select>
            </div>
            <button type="submit" style={{ background: "#111827", color: "#ffffff" }} className="px-5 py-2 rounded-lg font-semibold">Afficher</button>
          </form>

          <SuiviMasseSalariale data={masse} lienSalarie="/client/salaries" />

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-3">⏰ Heures supplémentaires</p>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Nombre d'heures</span>
                  <span className="font-bold">{totalHS}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Coût entreprise</span>
                  <span className="font-bold text-red-500">{Math.round(totalCoutHS)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Nombre de salariés</span>
                  <span className="font-bold">{new Set(hs.map(v => v.salarieId)).size}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-3">💰 Primes & Variables</p>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Primes</span>
                  <span className="font-bold">{totalPrimes} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Notes de frais</span>
                  <span className="font-bold">{totalNotesFrais} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Acomptes</span>
                  <span className="font-bold">{totalAcomptes} €</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-3">🏖️ Absences</p>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Nombre d'absences</span>
                  <span className="font-bold">{absences.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Total jours</span>
                  <span className="font-bold">{totalJoursAbsence} jour(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">En attente</span>
                  <span className="font-bold text-orange-500">
                    {absences.filter(a => a.statut === "En attente").length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center">
              <p className="text-gray-500 font-semibold">💼 Coût total entreprise ce mois</p>
              <p className="text-3xl font-bold text-red-500">{Math.round(totalCoutEntreprise)} €</p>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}