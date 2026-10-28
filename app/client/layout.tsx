import BuddyChat from "@/components/BuddyChat";
import BandeauDemo from "@/components/BandeauDemo";
import { getSessionBrute } from "@/lib/session";
import { redirect } from "next/navigation";
import { estSessionDemo } from "@/lib/demo";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionBrute();

  // Un compte salarié a son propre espace
  if (session?.role === "SALARIE") redirect("/salarie");

  // Entreprise suspendue : aucun contenu, seulement un message
  if (session && session.role === "CLIENT" && session.entreprise && session.entreprise.actif === false) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow p-10 max-w-lg text-center">
          <p className="text-5xl mb-4">⏸️</p>
          <h1 className="text-2xl font-bold mb-2">Accès suspendu</h1>
          <p className="text-gray-500 mb-6">
            L&apos;accès de <strong>{session.entreprise.nom}</strong> à Franeo est actuellement suspendu.
            Vos données sont conservées. Pour réactiver votre espace, contactez-nous.
          </p>
          <form action="/api/suspendu/deconnexion" method="post">
            <button type="submit" className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition">
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {estSessionDemo(session) && <BandeauDemo />}
      {children}
      <BuddyChat />
    </>
  );
}
