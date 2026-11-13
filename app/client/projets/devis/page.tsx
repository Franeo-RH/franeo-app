import CadreClient from "@/components/CadreClient";
import ListeDevis from "@/components/projets/ListeDevis";
import { BandeauDev } from "@/components/projets/outils";

export default function PageDevis() {
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">🧾 Devis</h1>
        <p className="text-gray-500 mt-1">Chiffrez au vrai coût de vos équipes, visez une marge, imprimez le devis. Accepté, il devient un projet avec son budget, son planning et son échéancier de facturation.</p>
      </div>
      <BandeauDev />
      <ListeDevis />
    </CadreClient>
  );
}
