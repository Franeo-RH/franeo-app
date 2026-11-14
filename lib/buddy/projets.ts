// lib/buddy/projets.ts
// Buddy et l'option Projets : « mes projets », « projets en retard », « rentabilité », « projet Dupont ».
// Les montants ne sont donnés qu'avec le droit « projets.couts ».

import { projetsAvecSynthese } from "@/lib/projets";
import { STATUTS_PROJET } from "@/lib/projets-constantes";
import { aDroit } from "@/lib/droits";
import { a, aPrefixe, eur, plain, type Msg } from "./outils";
import { rep } from "./moteur";
import type { Env, ReponseBuddy } from "./types";

const PAGE_PROJETS = "/client/projets";
const PAGE_RENTABILITE = "/client/projets/rentabilite";
const pct = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n)} %`);

export async function lireProjets(m: Msg, env: Env): Promise<ReponseBuddy> {
  const couts = aDroit(env.entreprise.permissions, "projets.couts");
  const tous = await projetsAvecSynthese(env.entreprise.id, { statut: { in: ["PREVU", "EN_COURS", "TERMINE"] } });
  if (tous.length === 0) {
    return rep("Vous n'avez encore aucun projet. Créez-en un depuis la page Projets : planning, budget et rentabilité sont calculés automatiquement. 🙂", {
      humeur: "neutre",
      liens: [{ label: "Ouvrir les projets", href: PAGE_PROJETS }],
    });
  }

  // Un projet précis : son nom (ou une partie) figure dans la question
  const question = ` ${plain(m.brut)} `;
  const cible = tous
    .map((p) => ({ p, mots: plain(p.nom).split(/[^a-z0-9]+/).filter((x) => x.length > 3) }))
    .filter((x) => x.mots.length > 0 && x.mots.some((mot) => question.includes(` ${mot} `)))
    .sort((x, y) => y.mots.filter((mot) => question.includes(` ${mot} `)).length - x.mots.filter((mot) => question.includes(` ${mot} `)).length)[0]?.p;

  if (cible) {
    const s = cible.synthese;
    const lignes = [
      `📁 ${cible.nom} — ${STATUTS_PROJET[cible.statut as keyof typeof STATUTS_PROJET]?.label ?? cible.statut}`,
      `• Heures : ${Math.round(s.heuresReelles)} h réalisées sur ${Math.round(s.heuresPrevues)} h prévues${s.avancementTemps != null ? ` (${s.avancementTemps} % du calendrier écoulé)` : ""}`,
    ];
    if (couts) {
      lignes.push(`• Vendu : ${eur(s.venduContrat)} · coût à date : ${eur(s.coutReel)}${s.consommation != null ? ` (${s.consommation} % du budget)` : ""}`);
      lignes.push(`• Marge à date : ${eur(s.margeReelle)} (${pct(s.tauxMargeReelle)}) · projection fin de projet : ${eur(s.projectionMarge)} (${pct(s.tauxProjection)})`);
    }
    for (const al of s.alertes.slice(0, 3)) lignes.push(`${al.niveau === "danger" ? "🔴" : al.niveau === "attention" ? "🟠" : "ℹ️"} ${al.texte}`);
    return rep(lignes.join("\n"), { humeur: s.alertes.some((x) => x.niveau === "danger") ? "reflechit" : "content", liens: [{ label: "Voir le projet", href: `${PAGE_PROJETS}/${cible.id}` }] });
  }

  const actifs = tous.filter((p) => p.statut !== "TERMINE");
  const enAlerte = actifs.filter((p) => p.synthese.alertes.some((x) => x.niveau !== "info"));

  // « Rentabilité », « marge », « projets rentables » : classement
  if (couts && (aPrefixe(m, "rentab", "marge", "benefic", "gagn", "perte", "perd") || a(m, "cout", "couts"))) {
    const tries = [...tous].sort((x, y) => (y.synthese.tauxProjection ?? -999) - (x.synthese.tauxProjection ?? -999));
    const total = tous.reduce((acc, p) => ({ vendu: acc.vendu + p.synthese.venduContrat, marge: acc.marge + p.synthese.projectionMarge }), { vendu: 0, marge: 0 });
    const lignes = tries.slice(0, 8).map((p) => `• ${p.nom} : marge prévue ${eur(p.synthese.projectionMarge)} (${pct(p.synthese.tauxProjection)})`);
    return rep(
      `💶 Rentabilité de vos ${tous.length} projet(s)\nTotal vendu : ${eur(total.vendu)} · marge projetée : ${eur(total.marge)}${total.vendu > 0 ? ` (${pct((total.marge / total.vendu) * 100)})` : ""}\n\n${lignes.join("\n")}${tries.length > 8 ? `\n… et ${tries.length - 8} autre(s)` : ""}`,
      { humeur: total.marge >= 0 ? "content" : "reflechit", liens: [{ label: "Tableau de rentabilité", href: PAGE_RENTABILITE }] }
    );
  }

  // « Projets en retard / en alerte / à risque »
  if (aPrefixe(m, "retard", "alert", "risqu", "problem", "depass", "derap")) {
    if (enAlerte.length === 0) return rep("Bonne nouvelle : aucun projet en cours n'est en alerte. ✅", { humeur: "content", liens: [{ label: "Ouvrir les projets", href: PAGE_PROJETS }] });
    const lignes = enAlerte.slice(0, 8).map((p) => `• ${p.nom} : ${p.synthese.alertes.filter((x) => x.niveau !== "info").map((x) => x.texte).slice(0, 2).join(" · ")}`);
    return rep(`⚠️ ${enAlerte.length} projet(s) à surveiller :\n${lignes.join("\n")}`, { humeur: "reflechit", liens: [{ label: "Ouvrir les projets", href: PAGE_PROJETS }] });
  }

  // Liste des projets en cours
  const lignes = actifs.slice(0, 10).map((p) => {
    const st = STATUTS_PROJET[p.statut as keyof typeof STATUTS_PROJET]?.label ?? p.statut;
    const conso = couts && p.synthese.consommation != null ? ` · ${p.synthese.consommation} % du budget` : "";
    const alerte = p.synthese.alertes.some((x) => x.niveau === "danger") ? " 🔴" : p.synthese.alertes.some((x) => x.niveau === "attention") ? " 🟠" : "";
    return `• ${p.nom} (${st}) : ${Math.round(p.synthese.heuresReelles)} h / ${Math.round(p.synthese.heuresPrevues)} h${conso}${alerte}`;
  });
  return rep(
    `📁 ${actifs.length} projet(s) prévu(s) ou en cours${enAlerte.length ? `, dont ${enAlerte.length} à surveiller` : ""} :\n${lignes.join("\n")}${actifs.length > 10 ? `\n… et ${actifs.length - 10} autre(s)` : ""}`,
    {
      humeur: "content",
      liens: [{ label: "Ouvrir les projets", href: PAGE_PROJETS }, ...(couts ? [{ label: "Rentabilité", href: PAGE_RENTABILITE }] : [])],
      suggestions: couts ? ["Projets en alerte", "Rentabilité des projets"] : ["Projets en alerte"],
    }
  );
}
