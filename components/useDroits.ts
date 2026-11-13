"use client";

import { useEffect, useState } from "react";

type Moi = { role: string; permissions: string[]; aPaie: boolean; prenom: string };
let cache: Moi | null = null;
let enCours: Promise<Moi | null> | null = null;

/** Droits de l'utilisateur connecté (lus une seule fois par visite, partagés entre la barre du haut, la barre latérale et les gardes de pages) */
export function useDroits(): Moi | null {
  const [moi, setMoi] = useState<Moi | null>(cache);
  useEffect(() => {
    let actif = true;
    if (!enCours) {
      enCours = fetch("/api/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => (d ? { role: d.role, permissions: d.permissions || [], aPaie: !!d.aPaie, prenom: d.prenom || "" } : null))
        .catch(() => null);
    }
    enCours.then((d) => {
      cache = d;
      if (actif) setMoi(d);
    });
    return () => { actif = false; };
  }, []);
  return moi;
}

/** À appeler à la déconnexion */
export function oublierDroits() {
  cache = null;
  enCours = null;
}
