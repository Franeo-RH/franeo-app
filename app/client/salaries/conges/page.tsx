import CadreClient from "@/components/CadreClient";
import RepriseConges from "@/components/RepriseConges";

/** Gestion RH › Congés BTP : solde de départ (saisie ou import), puis calcul automatique */
export default function PageCongesBTP() {
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">🏗️ Congés BTP</h1>
        <p className="text-gray-500 mt-1">Saisissez ou importez une fois le solde de chaque salarié : les compteurs se mettent ensuite à jour seuls. Le détail par salarié est dans sa fiche.</p>
      </div>
      <RepriseConges />
    </CadreClient>
  );
}
