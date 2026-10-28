import { redirect } from "next/navigation";

// Ancienne adresse : les relevés sont maintenant dans l'onglet « Relevés »
export default function AncienneRubriqueHeures() {
  redirect("/client/releves");
}
