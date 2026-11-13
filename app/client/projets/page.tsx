import CadreClient from "@/components/CadreClient";
import ListeProjets from "@/components/projets/ListeProjets";
import { BandeauDev } from "@/components/projets/outils";

export default function PageProjets() {
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">📐 Projets</h1>
        <p className="text-gray-500 mt-1">Planifiez vos équipes, suivez le temps passé (pointé ou saisi), les frais, le budget et la marge de chaque projet.</p>
      </div>
      <BandeauDev />
      <ListeProjets />
    </CadreClient>
  );
}
