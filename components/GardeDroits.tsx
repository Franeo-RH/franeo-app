"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { aDroit, droitPourChemin } from "@/lib/droits";
import { useDroits } from "@/components/useDroits";

/** Masque une page client si l'admin a retiré le droit correspondant (Accès & droits) */
export default function GardeDroits({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();
  const moi = useDroits();
  const droit = droitPourChemin(chemin);
  if (!droit || !moi || moi.role !== "CLIENT" || aDroit(moi.permissions, droit)) return <>{children}</>;
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
        <p className="text-4xl mb-3">🔒</p>
        <h1 className="text-xl font-bold mb-2">Accès non autorisé</h1>
        <p className="text-gray-500 mb-5">Cette fonction n&apos;est pas activée pour votre compte. Contactez FRANEO RH si vous en avez besoin.</p>
        <Link href="/client/dashboard" className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold">Retour au tableau de bord</Link>
      </div>
    </div>
  );
}
