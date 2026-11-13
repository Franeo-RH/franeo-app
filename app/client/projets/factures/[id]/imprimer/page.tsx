import DocumentImprimable from "@/components/projets/DocumentImprimable";

export default async function ImprimerFacture({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocumentImprimable sorte="facture" id={id} />;
}
