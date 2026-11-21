import { redirect } from "next/navigation";
import CadreClient from "@/components/CadreClient";
import BulletinsClient from "@/components/BulletinsClient";
import { getSession } from "@/lib/session";

/** Paie › Bulletins de paie déposés par FRANEO RH */
export default async function PageBulletins() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">📄 Bulletins de paie</h1>
        <p className="text-gray-500 mt-1">Les bulletins déposés chaque mois par FRANEO RH. Vos salariés qui ont leur espace les retrouvent aussi dans « Mes bulletins ».</p>
      </div>
      <BulletinsClient />
    </CadreClient>
  );
}
