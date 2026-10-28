import { redirect } from "next/navigation";

// Les absences sont maintenant dans l'onglet Salariés
export default function AncienneAdresseAbsences() {
  redirect("/client/salaries/absences");
}
