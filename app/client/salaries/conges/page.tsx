import { redirect } from "next/navigation";
import CadreClient from "@/components/CadreClient";
import RepriseConges from "@/components/RepriseConges";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";

/** Gestion RH › Congés : soldes de tous les salariés, calculés automatiquement, mis à jour par saisie ou import */
export default async function PageConges() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">🏖️ Congés payés</h1>
        <p className="text-gray-500 mt-1">Le solde de chaque salarié est aussi visible dans sa fiche, dans son espace salarié et par son manager.</p>
      </div>
      <RepriseConges modifiable={aDroit(session.entreprise?.permissions, "salaries.modifier")} />
    </CadreClient>
  );
}
