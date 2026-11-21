import { redirect } from "next/navigation";
import CadreClient from "@/components/CadreClient";
import LivretAccueilClient from "@/components/LivretAccueilClient";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";

export const dynamic = "force-dynamic";

/** Gestion RH › Livret d'accueil : commandé à FRANEO RH, livré dans l'app */
export default async function PageLivret() {
  const session = await getSession();
  if (!session) redirect("/login");
  const p = session.entreprise?.permissions;
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">📘 Livret d&apos;accueil</h1>
        <p className="text-gray-500 mt-1">Un document remis à chaque nouveau salarié : l&apos;entreprise, son fonctionnement, ses règles et ses contacts. Commandez-le, FRANEO RH le rédige et vous l&apos;envoie ici.</p>
      </div>
      <LivretAccueilClient peutDemander={aDroit(p, "entreprise.devis") || aDroit(p, "tickets.creer")} />
    </CadreClient>
  );
}
