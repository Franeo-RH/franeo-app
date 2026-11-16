import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { aAccesMedical } from "@/lib/droits";
import { etatOptions } from "@/lib/options-serveur";
import CadreClient from "@/components/CadreClient";
import SuiviMedical from "@/components/SuiviMedical";
import OptionMedical from "@/components/OptionMedical";

export const dynamic = "force-dynamic";

export default async function PageSuiviMedical() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");
  const acces = aAccesMedical(session.entreprise);
  const options = acces ? null : await etatOptions(session);
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">🩺 Suivi médical</h1>
        <p className="text-gray-500 mt-1">Pour chaque salarié : son type de suivi, sa dernière visite et la date de la prochaine, calculée automatiquement. Les visites de reprise après un arrêt et la visite de mi-carrière (45 ans) sont signalées.</p>
      </div>
      {acces ? <SuiviMedical /> : options && <OptionMedical etat={options.medical} inclus={options.medicalInclus} peutDemander={!session.etablissementId} />}
    </CadreClient>
  );
}
