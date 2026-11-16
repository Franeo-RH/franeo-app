import CadreClient from "@/components/CadreClient";
import DeclarerSortie from "@/components/DeclarerSortie";

export default function PageSorties() {
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">🚪 Déclarer une sortie</h1>
        <p className="text-gray-500 mt-1">Démission, rupture conventionnelle, fin de CDD, licenciement… Indiquez le motif et les dates : la paie prépare le solde de tout compte et les documents de fin de contrat.</p>
      </div>
      <DeclarerSortie />
    </CadreClient>
  );
}
