import { redirect } from "next/navigation";

// La page Indicateurs RH a été retirée
export default function IndicateursRetires() {
  redirect("/client/dashboard");
}
