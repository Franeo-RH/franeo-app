import CadreClient from "@/components/CadreClient";
import RentabiliteProjets from "@/components/projets/RentabiliteProjets";
import { BandeauDev } from "@/components/projets/outils";

export default function PageRentabilite() {
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">📈 Rentabilité</h1>
        <p className="text-gray-500 mt-1">Marge par client et par projet, occupation des salariés et coûts horaires utilisés dans les calculs.</p>
      </div>
      <BandeauDev />
      <RentabiliteProjets />
    </CadreClient>
  );
}
