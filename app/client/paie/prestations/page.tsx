import { redirect } from "next/navigation";

// Les prestations complémentaires ne sont plus dans la Paie : elles passent par la demande de devis
export default function AnciennesPrestations() {
  redirect("/client/entreprise/devis");
}
