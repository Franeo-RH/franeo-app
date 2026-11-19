import { redirect } from "next/navigation";
import { getSessionCabinet } from "@/lib/cabinet";
import EnteteCabinet from "@/components/cabinet/EnteteCabinet";
import BandeauDemo from "@/components/BandeauDemo";

// Espace cabinet : portefeuille de clients et collaborateurs
export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionCabinet();
  if (!session) redirect("/login");
  return (
    <div className="fr-fond min-h-screen">
      {session.modeCabinet.demo && <BandeauDemo />}
      <EnteteCabinet cabinet={session.modeCabinet.nom} prenom={session.prenom} gerant={session.modeCabinet.gerant} />
      <main className="fr-cab-page">{children}</main>
    </div>
  );
}
