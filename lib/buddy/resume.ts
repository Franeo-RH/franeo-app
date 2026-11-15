// lib/buddy/resume.ts
// Simplifie des actualités RH en langage clair, sans IA : l'essentiel (premières phrases) de chaque actualité.


export interface ActuLite {
  id: string;
  titre: string;
  contenu: string;
  thematique: string;
  createdAt: Date;
}


function tronquer(texte: string, max: number): string {
  const t = texte.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const coupe = t.slice(0, max);
  const espace = coupe.lastIndexOf(" ");
  return `${coupe.slice(0, espace > max * 0.6 ? espace : max)}…`;
}

function decouperPhrases(texte: string): string[] {
  return texte
    .split(/(?<=[.!?])\s+|\n+/)
    .map((p) => p.replace(/^[\s•*\-–]+/, "").trim())
    .filter((p) => p.length > 20);
}

/** Résumé sans IA : l'essentiel de chaque actualité (premières phrases). */
export function resumeExtractif(actus: ActuLite[]): string {
  return actus
    .map((x) => {
      const phrases = decouperPhrases(x.contenu);
      const essentiel = phrases.length > 0 ? tronquer(phrases.slice(0, 2).join(" "), 320) : tronquer(x.contenu, 320);
      return `📰 ${x.titre}\n${essentiel}`;
    })
    .join("\n\n");
}

export async function simplifierActus(
  actus: ActuLite[],
  opts: { thematique?: string | null; question?: string } = {}
): Promise<{ texte: string; ia: boolean }> {
  void opts; // Buddy fonctionne sans IA : résumé fabriqué à partir des actualités elles-mêmes
  if (actus.length === 0) return { texte: "", ia: false };
  return { texte: resumeExtractif(actus), ia: false };
}
