import { redirect } from "next/navigation";

// Les droits se gèrent maintenant directement dans la fiche client (bloc « Accès & droits »)
export default async function AnciennesPermissions({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/entreprises/${id}#acces-droits`);
}
