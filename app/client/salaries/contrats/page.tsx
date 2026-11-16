import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { aAccesContrats } from "@/lib/droits";
import CadreClient from "@/components/CadreClient";
import ContratsClient from "@/components/ContratsClient";
import OptionDocuments from "@/components/OptionDocuments";
import { etatOptions } from "@/lib/options-serveur";
import { aAccesDocuments } from "@/lib/droits";

export const dynamic = "force-dynamic";

export default async function PageContrats() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");
  const options = aAccesDocuments(session.entreprise) ? null : await etatOptions(session);
  return (
    <CadreClient>
      {aAccesContrats(session.entreprise) ? <ContratsClient /> : (
        <>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">📝 Contrats automatiques</h1>
            <p className="text-gray-500 mt-1">{options ? "Cette fonction fait partie de l'option Documents & contrats." : "Cette fonction n'est pas activée sur votre compte : demandez-la à FRANEO RH."}</p>
          </div>
          {options && <OptionDocuments etat={options.documents} inclus={options.documentsInclus} peutDemander={!session.etablissementId} />}
        </>
      )}
    </CadreClient>
  );
}
