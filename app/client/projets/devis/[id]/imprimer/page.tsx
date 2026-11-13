import DocumentImprimable from "@/components/projets/DocumentImprimable";

export default async function ImprimerDevis({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocumentImprimable sorte="devis" id={id} />;
}
