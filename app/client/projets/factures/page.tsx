import CadreClient from "@/components/CadreClient";
import ListeFactures from "@/components/projets/ListeFactures";
import { BandeauDev } from "@/components/projets/outils";

export default function PageFactures() {
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">💶 Factures</h1>
        <p className="text-gray-500 mt-1">Toutes les factures émises depuis vos projets : encaissements, retards de paiement, relances et export pour votre comptable.</p>
      </div>
      <BandeauDev />
      <ListeFactures />
    </CadreClient>
  );
}
