import { etatMaintenance } from "@/lib/maintenance";
import PageMaintenance, { BandeauMaintenance } from "@/components/PageMaintenance";
import VisiteGuidee from "@/components/VisiteGuidee";
import { getSessionSalarie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Espace salarié : bloqué pendant une maintenance, annonce affichée avant ; présentation guidée (salarié ou manager)
export default async function SalarieLayout({ children }: { children: React.ReactNode }) {
  const maintenance = await etatMaintenance();
  if (maintenance.bloque) return <PageMaintenance etat={maintenance} />;
  const s = await getSessionSalarie();
  const manager = s.ok ? (await prisma.salarie.count({ where: { managerId: s.salarie.id } })) > 0 : false;
  return (
    <>
      <BandeauMaintenance etat={maintenance} />
      {children}
      {s.ok && <VisiteGuidee profil={manager ? "manager" : "salarie"} afficher={!s.utilisateur.entreprise?.demo && !s.utilisateur.visiteVueLe} />}
    </>
  );
}
