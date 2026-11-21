import { redirect } from "next/navigation";
import CadreClient from "@/components/CadreClient";
import LivretAccueilClient from "@/components/LivretAccueilClient";
import { getSession } from "@/lib/session";
import { aDroit, aAccesDocuments } from "@/lib/droits";
import { etatOptions } from "@/lib/options-serveur";
import OptionDocuments from "@/components/OptionDocuments";

export const dynamic = "force-dynamic";

/** Gestion RH › Livret d'accueil : commandé à FRANEO RH, livré dans l'app */
export default async function PageLivret() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");
  const p = session.entreprise?.permissions;
  const acces = aAccesDocuments(session.entreprise);
  const options = acces ? null : await etatOptions(session);
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">📘 Livret d&apos;accueil</h1>
        {!acces && <p className="mt-2 text-sm font-semibold" style={{ color: "#c2410c" }}>🔒 Inclus avec l&apos;option Documents & contrats.</p>}
        <p className="text-gray-500 mt-1">Un document remis à chaque nouveau salarié : l&apos;entreprise, son fonctionnement, ses règles et ses contacts. Commandez-le, FRANEO RH le rédige et vous l&apos;envoie ici.</p>
      </div>
      {acces ? <LivretAccueilClient peutDemander={aDroit(p, "entreprise.devis") || aDroit(p, "tickets.creer")} /> : options && <OptionDocuments etat={options.documents} inclus={options.documentsInclus} peutDemander={!session.etablissementId} />}
    </CadreClient>
  );
}
