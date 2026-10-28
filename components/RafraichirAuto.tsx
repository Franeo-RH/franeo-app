"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Recharge les données de la page toutes les X secondes (mise à jour en temps réel) */
export default function RafraichirAuto({ secondes = 60 }: { secondes?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, secondes * 1000);
    return () => clearInterval(t);
  }, [router, secondes]);
  return null;
}
