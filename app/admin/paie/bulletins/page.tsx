import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import CadreAdmin from "@/components/CadreAdmin";
import BulletinsAdmin from "@/components/BulletinsAdmin";

export const dynamic = "force-dynamic";

/** Admin › Paie › Bulletins de paie */
export default async function PageBulletinsAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");
  return (
    <CadreAdmin>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">📄 Bulletins de paie</h1>
        <p className="text-gray-500 mt-1">Déposez les PDF du mois d&apos;un client : chaque salarié retrouve le sien dans son espace et reçoit un e-mail, l&apos;employeur aussi.</p>
      </div>
      <BulletinsAdmin />
    </CadreAdmin>
  );
}
