import CadreClient from "@/components/CadreClient";
import TableauBordProjets from "@/components/projets/TableauBordProjets";
import { BandeauDev } from "@/components/projets/outils";

export default function PageTableauBordProjets() {
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">📊 Tableau de bord des projets</h1>
        <p className="text-gray-500 mt-1">Chiffre d&apos;affaires, coûts, marge, heures, facturation et plan de charge, mois par mois ou en cumul.</p>
      </div>
      <BandeauDev />
      <TableauBordProjets />
    </CadreClient>
  );
}
