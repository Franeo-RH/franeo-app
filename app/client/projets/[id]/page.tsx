import CadreClient from "@/components/CadreClient";
import FicheProjet from "@/components/projets/FicheProjet";
import { BandeauDev } from "@/components/projets/outils";

export default async function PageProjet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <CadreClient>
      <BandeauDev />
      <FicheProjet id={id} />
    </CadreClient>
  );
}
