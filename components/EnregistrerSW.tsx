"use client";

import { useEffect } from "react";

// Active le service worker (nécessaire pour installer l'app sur le téléphone)
export default function EnregistrerSW() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return; // pas en local, pour ne pas gêner le développement
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
