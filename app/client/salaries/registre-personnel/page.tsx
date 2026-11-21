import { redirect } from "next/navigation";
import CadreClient from "@/components/CadreClient";
import RegistrePersonnel from "@/components/RegistrePersonnel";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { filtreSalaries } from "@/lib/perimetre";
import { COLONNES_RUP, registrePersonnel } from "@/lib/rup";

export const dynamic = "force-dynamic";

/** Gestion RH › Registre unique du personnel */
export default async function PageRegistre() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT" || !session.entrepriseId) redirect("/login");
  const lignes = await registrePersonnel(session.entrepriseId, filtreSalaries(session));
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">📒 Registre unique du personnel</h1>
        <p className="text-gray-500 mt-1">{session.entreprise?.nom} · généré le {new Date().toLocaleDateString("fr-FR")} à partir des fiches salariés. Obligatoire dès le premier salarié, à présenter en cas de contrôle (inspection du travail, URSSAF).</p>
      </div>
      <div className="bg-white rounded-xl shadow p-6">
        <RegistrePersonnel entreprise={session.entreprise?.nom ?? "Entreprise"} colonnes={COLONNES_RUP} lignes={lignes} modifiable={aDroit(session.entreprise?.permissions, "salaries.modifier")} />
      </div>
    </CadreClient>
  );
}
