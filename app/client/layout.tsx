import BuddyChat from "@/components/BuddyChat";
import GardeDroits from "@/components/GardeDroits";
import BandeauDemo from "@/components/BandeauDemo";
import { getSessionBrute } from "@/lib/session";
import { redirect } from "next/navigation";
import { estSessionDemo } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import BoutonDemandeEvolution from "@/components/BoutonDemandeEvolution";

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

  // L'application n'est pas accessible sans formule (RH ou paie)
  if (session && session.role === "CLIENT" && session.entreprise && !session.entreprise.demo && !session.entreprise.abonnementId && !session.entreprise.abonnementPaieId) {
    const [formules, demande] = await Promise.all([
      prisma.abonnement.findMany({ orderBy: { prixMensuel: "asc" } }),
      prisma.demandeEvolution.findFirst({ where: { entrepriseId: session.entreprise.id, statut: "En attente" } }),
    ]);
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center gap-6">
        <div className="bg-white rounded-2xl shadow p-8 max-w-3xl w-full text-center">
          <h1 className="text-2xl font-bold mb-2">Choisissez votre formule</h1>
          <p className="text-gray-500">L&apos;espace de <strong>{session.entreprise.nom}</strong> s&apos;ouvre dès qu&apos;une formule est activée par FRANEO RH.</p>
          {demande && <p className="mt-3 text-orange-600 font-semibold">⏳ Votre demande est en cours de validation.</p>}
        </div>
        <div className="grid gap-4 max-w-5xl w-full" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {formules.map((f) => (
            <div key={f.id} className="bg-white rounded-xl shadow p-5 flex flex-col gap-3">
              <h2 className="text-lg font-bold">{f.nom}</h2>
              <p className="text-2xl font-bold text-orange-500">{f.prixMensuel} €<span className="text-sm text-gray-400 font-normal">/mois</span></p>
              <ul className="text-sm text-gray-600 flex-1">{f.features.map((x, i) => <li key={i}>✓ {x}</li>)}</ul>
              <BoutonDemandeEvolution entrepriseId={session.entreprise!.id} abonnementId={f.id} disabled={!!demande} />
            </div>
          ))}
        </div>
        <form action="/api/suspendu/deconnexion" method="post"><button type="submit" className="text-sm text-gray-500 underline">Se déconnecter</button></form>
      </div>
    );
  }

  return (
    <>
      {estSessionDemo(session) && <BandeauDemo />}
      <GardeDroits>{children}</GardeDroits>
      <BuddyChat />
    </>
  );
}
