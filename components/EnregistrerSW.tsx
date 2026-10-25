"use client";

import { useEffect, useState } from "react";

/** Vide les pages gardées pour le hors-ligne (à appeler à la déconnexion) */
export async function viderCacheHorsLigne() {
  try {
    navigator.serviceWorker?.controller?.postMessage("vider-cache");
    const cles = await caches.keys();
    await Promise.all(cles.filter((k) => k.startsWith("franeo-pages")).map((k) => caches.delete(k)));
  } catch {}
}

// Active le service worker et affiche un bandeau quand il n'y a plus de réseau
export default function EnregistrerSW() {
  const [horsLigne, setHorsLigne] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const maj = () => {
      const hl = !navigator.onLine;
      setHorsLigne(hl);
      document.documentElement.classList.toggle("fr-hors-ligne", hl);
    };
    maj();
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);

  if (!horsLigne) return null;
  return (
    <div role="status" className="fr-bandeau-hors-ligne">
      📴 Hors connexion — consultation seule des pages déjà ouvertes. Les modifications reviendront avec le réseau.
    </div>
  );
}
