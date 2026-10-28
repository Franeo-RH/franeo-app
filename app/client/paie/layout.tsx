import { redirect } from "next/navigation";
import { getSessionBrute } from "@/lib/session";
import { aAccesPaie } from "@/lib/droits";

// L'onglet Paie n'existe que pour les clients qui ont une formule paie
export default async function LayoutPaieClient({ children }: { children: React.ReactNode }) {
  const session = await getSessionBrute();
  if (session?.role === "CLIENT" && !aAccesPaie(session.entreprise)) redirect("/client/dashboard");
  return <>{children}</>;
}
