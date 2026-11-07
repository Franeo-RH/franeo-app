import CadreClient from "@/components/CadreClient";
import DocumentsSalaries from "@/components/DocumentsSalaries";

export default async function PageDocuments({ searchParams }: { searchParams: Promise<{ salarie?: string }> }) {
  const sp = await searchParams;
  return (
    <CadreClient>
      <DocumentsSalaries salarieInitial={sp.salarie} />
    </CadreClient>
  );
}
