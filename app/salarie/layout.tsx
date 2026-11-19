import { etatMaintenance } from "@/lib/maintenance";
import PageMaintenance, { BandeauMaintenance } from "@/components/PageMaintenance";

// Espace salarié : bloqué pendant une maintenance, annonce affichée avant
export default async function SalarieLayout({ children }: { children: React.ReactNode }) {
  const maintenance = await etatMaintenance();
  if (maintenance.bloque) return <PageMaintenance etat={maintenance} />;
  return (
    <>
      <BandeauMaintenance etat={maintenance} />
      {children}
    </>
  );
}
