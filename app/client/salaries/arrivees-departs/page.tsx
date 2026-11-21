import { redirect } from "next/navigation";
import CadreClient from "@/components/CadreClient";
import ChecklistsSalaries from "@/components/ChecklistsSalaries";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";

/** Gestion RH › Arrivées & départs : les étapes à ne pas oublier */
export default async function PageArriveesDeparts() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">✅ Arrivées & départs</h1>
        <p className="text-gray-500 mt-1">Pour chaque salarié arrivé ou parti ces 3 derniers mois (ou attendu), cochez les étapes au fur et à mesure : rien n&apos;est oublié, de la DPAE au solde de tout compte.</p>
      </div>
      <ChecklistsSalaries modifiable={aDroit(session.entreprise?.permissions, "salaries.modifier")} />
    </CadreClient>
  );
}
