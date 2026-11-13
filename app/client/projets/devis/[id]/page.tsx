import CadreClient from "@/components/CadreClient";
import EditeurDevis from "@/components/projets/EditeurDevis";
import { BandeauDev } from "@/components/projets/outils";

export default async function PageEditeurDevis({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <CadreClient>
      <BandeauDev />
      <EditeurDevis id={id} />
    </CadreClient>
  );
}
