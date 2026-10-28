import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonExportVariables from "@/components/BoutonExportVariables";
import BoutonValiderPaie from "@/components/BoutonValiderPaie";
import BoutonResetPaie from "@/components/BoutonResetPaie";
import BoutonValiderVariable from "@/components/BoutonValiderVariable";
import BoutonValiderListe from "@/components/BoutonValiderListe";
import { BoutonExportComplet, BoutonImportAdmin, BoutonModifierAdmin, BoutonSupprimerAdmin } from "@/components/OutilsAdmin";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

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

export default async function AdminVariables({
  searchParams,
}: {
  searchParams: Promise<{
    moisDebut?: string; anneeDebut?: string;
    moisFin?: string; anneeFin?: string;
    categorie?: string; entrepriseId?: string;
    statut?: string;
  }>;
}) {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const sp = await searchParams;
  const maintenant = new Date();
  const moisCourant = maintenant.getMonth() + 1;
  const anneeCourante = maintenant.getFullYear();

  const moisDebut = parseInt(sp.moisDebut || String(moisCourant));
  const anneeDebut = parseInt(sp.anneeDebut || String(anneeCourante));
  const moisFin = parseInt(sp.moisFin || String(moisCourant));
  const anneeFin = parseInt(sp.anneeFin || String(anneeCourante));
  const categorie = sp.categorie || "tout";
  const entrepriseId = sp.entrepriseId || "";
  const statut = sp.statut || "tout";


  const periodes = Array.from(
    { length: (anneeFin - anneeDebut) * 12 + moisFin - moisDebut + 1 },
    (_, i) => {
      const d = new Date(anneeDebut, moisDebut - 1 + i);
      return { mois: d.getMonth() + 1, annee: d.getFullYear() };
    }
  );

  // Requêtes lancées en même temps
  const [entreprises, variables] = await Promise.all([
    prisma.entreprise.findMany({
      orderBy: { nom: "asc" },
    }),
    prisma.variablePaie.findMany({
      where: {
        entreprise: { demo: false },
        ...(entrepriseId ? { entrepriseId } : {}),
        ...(statut !== "tout" ? { statut } : {}),
        OR: periodes,
      },
      include: { salarie: true, entreprise: true },
      orderBy: [{ annee: "desc" }, { mois: "desc" }],
    }),
  ]);

  const variablesFiltrees = variables.filter(v => {
    if (categorie === "hs") return v.type === "HEURE_SUPPLEMENTAIRE";
    if (categorie === "prime") return v.type === "PRIME";
    if (categorie === "note_frais") return v.type === "NOTE_FRAIS";
    if (categorie === "acompte") return v.type === "ACOMPTE";
    return true;
  });

  const variablesAvecCout = variablesFiltrees.map((v) => ({
    ...v,
    ...calculerCout(v.type, v.valeur, v.salarie),
  }));

  const totalCoutEntreprise = variablesAvecCout.reduce((acc, v) => acc + v.coutEntreprise, 0);
  const enAttente = variablesAvecCout.filter(v => v.statut === "En attente").length;
  const idsEnAttente = variablesAvecCout.filter(v => v.statut === "En attente").map(v => v.id);
  // En attente regroupées par entreprise (boutons de validation par client)
  const parEntreprise = new Map<string, { nom: string; ids: string[] }>();
  for (const v of variablesAvecCout) {
    if (v.statut !== "En attente") continue;
    const g = parEntreprise.get(v.entrepriseId) || { nom: v.entreprise.nom, ids: [] };
    g.ids.push(v.id);
    parEntreprise.set(v.entrepriseId, g);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">💰 Variables de paie</h1>
              <div className="flex gap-4 mt-3">
                <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-semibold">
                  {enAttente} en attente
                </span>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-semibold">
                  {variablesAvecCout.length} au total
                </span>
                {totalCoutEntreprise > 0 && (
                  <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-semibold">
                    Coût total : {Math.round(totalCoutEntreprise)} €
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
            <BoutonExportComplet jeu="variables" />
            <BoutonImportAdmin jeu="variables" />
            <BoutonExportVariables
              entrepriseId={entrepriseId}
              categorie={categorie}
              statut={statut}
              moisDebut={moisDebut}
              anneeDebut={anneeDebut}
              moisFin={moisFin}
              anneeFin={anneeFin}
            />
            </div>
          </div>

          {/* Filtres */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <form className="grid grid-cols-3 gap-4 items-end" method="GET">
              <div>
                <label className="block text-sm font-semibold mb-1">Entreprise</label>
                <select name="entrepriseId" defaultValue={entrepriseId} className="w-full border rounded-lg px-4 py-3">
                  <option value="">Toutes</option>
                  {entreprises.map((e) => (
                    <option key={e.id} value={e.id}>{e.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Catégorie</label>
                <select name="categorie" defaultValue={categorie} className="w-full border rounded-lg px-4 py-3">
                  <option value="tout">Toutes</option>
                  <option value="hs">⏰ Heures supp.</option>
                  <option value="prime">💰 Primes</option>
                  <option value="note_frais">🧾 Notes de frais</option>
                  <option value="acompte">💳 Acomptes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Statut</label>
                <select name="statut" defaultValue={statut} className="w-full border rounded-lg px-4 py-3">
                  <option value="tout">Tous</option>
                  <option value="En attente">En attente</option>
                  <option value="Validé">Validé</option>
                  <option value="Réinitialisé">Réinitialisé</option>
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1">Mois début</label>
                  <select name="moisDebut" defaultValue={moisDebut} className="w-full border rounded-lg px-4 py-3">
                    {MOIS.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1">Année</label>
                  <select name="anneeDebut" defaultValue={anneeDebut} className="w-full border rounded-lg px-4 py-3">
                    {ANNEES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1">Mois fin</label>
                  <select name="moisFin" defaultValue={moisFin} className="w-full border rounded-lg px-4 py-3">
                    {MOIS.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1">Année</label>
                  <select name="anneeFin" defaultValue={anneeFin} className="w-full border rounded-lg px-4 py-3">
                    {ANNEES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full bg-black text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-800 transition">
                  🔍 Filtrer
                </button>
              </div>
            </form>
          </div>

          {/* Actions globales si entreprise sélectionnée */}
          {entrepriseId && (
            <div className="flex gap-3 mb-6">
              <BoutonValiderPaie mois={moisDebut} annee={anneeDebut} entrepriseId={entrepriseId} />
              <BoutonResetPaie mois={moisDebut} annee={anneeDebut} entrepriseId={entrepriseId} />
            </div>
          )}

          {/* Validation en une fois */}
          {idsEnAttente.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap items-center gap-3">
              <BoutonValiderListe ids={idsEnAttente} label="Tout valider" />
              {!entrepriseId && parEntreprise.size > 1 && (
                <>
                  <span className="text-gray-400 text-sm">ou par entreprise :</span>
                  {Array.from(parEntreprise.entries()).map(([id, g]) => (
                    <BoutonValiderListe key={id} ids={g.ids} label={g.nom} petit />
                  ))}
                </>
              )}
            </div>
          )}

          {/* Tableau */}
          <div className="bg-white rounded-xl shadow p-8">
            {variablesAvecCout.length === 0 ? (
              <p className="text-gray-500">Aucune variable pour cette période.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Entreprise</th>
                    <th className="pb-3">Salarié</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Valeur</th>
                    <th className="pb-3">Coût brut</th>
                    <th className="pb-3">Coût entreprise</th>
                    <th className="pb-3">Mois</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3">Saisi le</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {variablesAvecCout.map((v) => (
                    <tr key={v.id} className="border-b hover:bg-gray-50 transition">
                      <td className="py-3 text-sm">{v.entreprise.nom}</td>
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
                        }`}>
                          {v.statut}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 text-sm">
                        {new Date(v.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1 flex-wrap items-center">
                          {v.statut === "En attente" && <BoutonValiderVariable id={v.id} />}
                          <BoutonModifierAdmin modele="variablePaie" id={v.id} valeurs={{ type: v.type, valeur: v.valeur, mois: v.mois, annee: v.annee, statut: v.statut, commentaire: v.commentaire }} />
                          <BoutonSupprimerAdmin modele="variablePaie" id={v.id} quoi="cette variable" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}