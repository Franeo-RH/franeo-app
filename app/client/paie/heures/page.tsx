import { redirect } from "next/navigation";

// Ancienne adresse : les relevés sont dans Paie › Relevés d'heures
export default function AncienneAdresseReleves() {
  redirect("/client/paie/releves");
}
