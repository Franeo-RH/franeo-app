import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import CadreAdmin from "@/components/CadreAdmin";
import ModelesEmailAdmin from "@/components/ModelesEmailAdmin";

export const dynamic = "force-dynamic";

/** Admin › Communication › Modèles d'e-mails */
export default async function PageModelesEmail() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");
  return (
    <CadreAdmin>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">✉️ Modèles d&apos;e-mails</h1>
        <p className="text-gray-500 mt-1">Bienvenue, relance de paiement, fin d&apos;essai, mandat, point mensuel… Rédigez-les une fois, envoyez-les en un clic depuis la fiche d&apos;un client.</p>
      </div>
      <ModelesEmailAdmin />
    </CadreAdmin>
  );
}
