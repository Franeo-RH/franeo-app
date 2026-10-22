/**
 * Thématiques des actualités RH.
 * On reprend la liste de lib/actualites.ts (celle des onglets de la page Actualité RH),
 * quelle que soit sa forme (tableau de textes ou d'objets). Liste de secours si elle est introuvable.
 */
import * as ACTUALITES from "@/lib/actualites";

const PAR_DEFAUT = ["Général", "Paie", "Admin RH", "Entreprises", "Gestion RH", "Recrutement", "Juridique", "Formation"];

function lire(): string[] {
  try {
    const brut = (ACTUALITES as unknown as { THEMATIQUES?: unknown }).THEMATIQUES;
    if (!Array.isArray(brut)) return PAR_DEFAUT;
    const noms = brut
      .map((t: unknown) => {
        if (typeof t === "string") return t;
        const o = t as { nom?: string; label?: string; value?: string; titre?: string } | null;
        return o?.nom ?? o?.label ?? o?.value ?? o?.titre ?? "";
      })
      .filter((t) => typeof t === "string" && t.trim().length > 0);
    return noms.length > 0 ? noms : PAR_DEFAUT;
  } catch {
    return PAR_DEFAUT;
  }
}

export const THEMATIQUES: string[] = lire();
