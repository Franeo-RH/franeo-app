import { redirect } from "next/navigation";

// Les relevés sont désormais dans Gestion RH › Relevés
export default function AncienneAdresseReleves() {
  redirect("/client/salaries/releves");
}
