import { redirect } from "next/navigation";
import { getSessionCabinet } from "@/lib/cabinet";
import EnteteCabinet from "@/components/cabinet/EnteteCabinet";
import BandeauDemo from "@/components/BandeauDemo";
import VisiteGuidee from "@/components/VisiteGuidee";
import { etatMaintenance } from "@/lib/maintenance";
import PageMaintenance, { BandeauMaintenance } from "@/components/PageMaintenance";

// Espace cabinet : portefeuille de clients et collaborateurs
export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionCabinet();
  if (!session) redirect("/login");
  const maintenance = await etatMaintenance();
  if (maintenance.bloque) return <PageMaintenance etat={maintenance} />;
  return (
    <div className="fr-fond min-h-screen">
      <BandeauMaintenance etat={maintenance} />
      {session.modeCabinet.demo && <BandeauDemo />}
      <EnteteCabinet cabinet={session.modeCabinet.nom} prenom={session.prenom} gerant={session.modeCabinet.gerant} />
      <main className="fr-cab-page">{children}</main>
      <VisiteGuidee profil="cabinet" afficher={!session.modeCabinet.demo && !session.visiteVueLe} />
    </div>
  );
}
