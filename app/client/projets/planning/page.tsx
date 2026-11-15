import CadreClient from "@/components/CadreClient";
import PlanningProjets from "@/components/projets/PlanningProjets";
import { BandeauDev } from "@/components/projets/outils";

export default function PagePlanning() {
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">🗓️ Planning du mois</h1>
        <p className="text-gray-500 mt-1">Qui travaille sur quel projet, jour par jour, avec les absences et la charge de chacun.</p>
      </div>
      <BandeauDev />
      <PlanningProjets />
    </CadreClient>
  );
}
