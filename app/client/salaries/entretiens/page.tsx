import { redirect } from "next/navigation";
import CadreClient from "@/components/CadreClient";
import EntretiensClient from "@/components/EntretiensClient";
import EditeurTrameEntretien from "@/components/EditeurTrameEntretien";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";

/** Gestion RH › Entretiens annuels et professionnels */
export default async function PageEntretiens() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">🗣️ Entretiens</h1>
        <p className="text-gray-500 mt-1">Entretien professionnel tous les 2 ans (et au retour de certaines absences longues), état des lieux à 6 ans d&apos;ancienneté, entretiens annuels : l&apos;app calcule les échéances, vous planifiez, et le compte rendu s&apos;imprime en PDF.</p>
      </div>
      <EntretiensClient modifiable={aDroit(session.entreprise?.permissions, "salaries.modifier")} />
      {aDroit(session.entreprise?.permissions, "salaries.modifier") && !session.etablissementId && (
        <details className="bg-white rounded-xl shadow p-6">
          <summary className="cursor-pointer text-lg font-bold">⚙️ Personnaliser la trame des comptes rendus</summary>
          <p className="text-sm text-gray-500 mt-2 mb-4">Par défaut, le modèle FRANEO RH. Ajoutez, renommez ou réordonnez les rubriques pour votre entreprise.</p>
          <EditeurTrameEntretien client />
        </details>
      )}
    </CadreClient>
  );
}
