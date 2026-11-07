import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { aAccesContrats } from "@/lib/droits";
import CadreClient from "@/components/CadreClient";
import ContratsClient from "@/components/ContratsClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PageContrats() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");
  return (
    <CadreClient>
      {aAccesContrats(session.entreprise) ? <ContratsClient /> : (
        <div className="bg-white rounded-xl shadow p-8 flex flex-col gap-3">
          <h1 className="text-2xl font-bold">📝 Contrats automatiques</h1>
          <p className="text-gray-600">Générez vos contrats de travail en quelques clics à partir de vos modèles Word. Inclus à partir de la formule <strong>RH Sérénité</strong>.</p>
          <Link href="/client/entreprise/abonnement" className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold self-start">Voir les formules</Link>
        </div>
      )}
    </CadreClient>
  );
}
