import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { aAccesDocuments } from "@/lib/droits";
import { etatOptions } from "@/lib/options-serveur";
import CadreClient from "@/components/CadreClient";
import Courriers from "@/components/Courriers";
import OptionDocuments from "@/components/OptionDocuments";

export const dynamic = "force-dynamic";

export default async function PageCourriers() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");
  const acces = aAccesDocuments(session.entreprise);
  const options = acces ? null : await etatOptions(session);
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">✉️ Courriers & modèles</h1>
        <p className="text-gray-500 mt-1">Rupture ou renouvellement de période d&apos;essai, relances, attestations… Choisissez un modèle et un salarié : ses informations sont remplies automatiquement. Imprimez ou enregistrez en PDF à votre logo, ou envoyez par e-mail. Vous pouvez aussi créer vos propres modèles.</p>
      </div>
      {acces ? <Courriers /> : options && <OptionDocuments etat={options.documents} inclus={options.documentsInclus} peutDemander={!session.etablissementId} />}
    </CadreClient>
  );
}
