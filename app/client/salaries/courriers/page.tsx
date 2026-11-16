import CadreClient from "@/components/CadreClient";
import Courriers from "@/components/Courriers";

export default function PageCourriers() {
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">✉️ Courriers & modèles</h1>
        <p className="text-gray-500 mt-1">Rupture ou renouvellement de période d&apos;essai, relances, attestations… Choisissez un modèle et un salarié : ses informations sont remplies automatiquement. Imprimez, enregistrez en PDF ou envoyez par e-mail. Vous pouvez aussi créer vos propres modèles.</p>
      </div>
      <Courriers />
    </CadreClient>
  );
}
