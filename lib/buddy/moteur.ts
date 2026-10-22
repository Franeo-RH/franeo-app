// lib/buddy/moteur.ts
// Moteur de conversation guidée : Buddy pose les questions manquantes une par une,
// comprend les réponses libres, demande confirmation, puis exécute.

import { a, estPasser, type Msg } from "./outils";
import { viderFlux } from "./contexte";
import type { Ctx, Env, Flow, ReponseBuddy } from "./types";

/* ───────────── Oui / Non / Annuler ───────────── */

const OUI = [
  "oui", "ouais", "ouaip", "ok", "okay", "yes", "yep", "yop", "d accord", "dac", "confirme", "confirmer", "valide", "valider",
  "vas y", "go", "c est bon", "bien sur", "volontiers", "exactement", "parfait", "certainement", "carrement", "avec plaisir",
];
const NON = ["non", "nan", "nope", "pas du tout", "pas maintenant", "annule", "annuler", "stop", "laisse tomber", "abandonne", "finalement non", "jamais"];

export function ouiNon(m: Msg): boolean | null {
  const oui = a(m, ...OUI);
  const non = a(m, ...NON);
  if (oui && !non) return true;
  if (non && !oui) return false;
  return null;
}

export function estAnnulationForte(m: Msg): boolean {
  if (a(m, "laisse tomber", "tant pis", "oublie", "oublie ca", "abandonne", "reinitialise", "reset", "recommence")) return true;
  return m.mots.length <= 3 && a(m, "annule", "annuler", "stop", "quitter");
}

/* ───────────── Fabrication des réponses ───────────── */

export function rep(reponse: string, extra: Omit<ReponseBuddy, "reponse"> = {}): ReponseBuddy {
  return { reponse, ...extra };
}

/* ───────────── Moteur de flux ───────────── */

async function avancer(flow: Flow, ctx: Ctx, env: Env, prefixe?: string, profondeur = 0): Promise<ReponseBuddy> {
  const d = ctx.data;
  const passes: string[] = Array.isArray(d._passes) ? d._passes : [];

  if (typeof d._stop === "string") {
    const message = d._stop;
    viderFlux(ctx);
    return { reponse: message, humeur: "neutre", suggestions: ["Aide"] };
  }

  for (const slot of flow.slots) {
    if (!slot.requis(d, env) || slot.rempli(d)) continue;
    if (slot.optionnel && passes.includes(slot.cle)) continue;
    ctx.etape = slot.cle;
    const note = typeof d._note === "string" ? d._note : undefined;
    delete d._note;
    const q = await slot.question(d, env);
    const sugg = [...(slot.suggestions?.(d, env) ?? [])];
    if (slot.optionnel) sugg.push("Passer");
    sugg.push("Annuler");
    const intro = prefixe ?? note;
    return { reponse: intro ? `${intro}\n\n${q}` : q, suggestions: sugg, humeur: "reflechit" };
  }

  if (flow.verifier && profondeur < 3) {
    const v = await flow.verifier(d, env);
    if (v) {
      if (!v.reset || v.reset.length === 0) {
        viderFlux(ctx);
        return { reponse: v.message, humeur: "triste" };
      }
      for (const k of v.reset) delete d[k];
      return avancer(flow, ctx, env, v.message, profondeur + 1);
    }
  }

  ctx.etape = "confirmer";
  const resume = await flow.confirmation(d, env);
  const intro = prefixe ? `${prefixe}\n\n` : "";
  return {
    reponse: `${intro}${resume}\n\nJe confirme ? (oui / non)`,
    suggestions: ["Oui", "Non"],
    humeur: "reflechit",
  };
}

export async function demarrerFlux(flow: Flow, m: Msg, env: Env, ctx: Ctx, initial: Record<string, any> = {}): Promise<ReponseBuddy> {
  ctx.flow = flow.id;
  ctx.data = { ...initial };
  ctx.echecs = 0;
  ctx.etape = undefined;

  if (flow.demarrer) {
    const arret = await flow.demarrer(m, ctx.data, env);
    if (arret) {
      viderFlux(ctx);
      return arret;
    }
  }
  for (const slot of flow.slots) {
    if (!slot.rempli(ctx.data)) await slot.extraire(m, ctx.data, env, { attendu: false, ecraser: false });
  }
  return avancer(flow, ctx, env);
}

async function corriger(flow: Flow, m: Msg, env: Env, ctx: Ctx): Promise<boolean> {
  let change = false;
  const avant = JSON.stringify(ctx.data);
  for (const slot of flow.slots) {
    if (slot.texteLibre) continue;
    if (await slot.extraire(m, ctx.data, env, { attendu: false, ecraser: true })) change = true;
  }
  return change && JSON.stringify(ctx.data) !== avant;
}

/**
 * Traite la réponse de l'utilisateur dans un flux en cours.
 * Renvoie `null` si le message est en fait une nouvelle demande (le flux est alors abandonné).
 */
export async function continuerFlux(
  flow: Flow,
  m: Msg,
  env: Env,
  ctx: Ctx,
  estNouvelleCommande: (m: Msg) => boolean
): Promise<ReponseBuddy | null> {
  const d = ctx.data;

  if (estAnnulationForte(m)) {
    viderFlux(ctx);
    return rep(flow.annulation ?? "D'accord, j'annule. Rien n'a été modifié. 👍", { humeur: "neutre", suggestions: ["Aide"] });
  }

  /* ── Étape de confirmation ── */
  if (ctx.etape === "confirmer") {
    const r = ouiNon(m);

    if (r === true && m.mots.length > 2) {
      // "oui mais plutôt demain" : on regarde d'abord s'il y a une correction
      if (await corriger(flow, m, env, ctx)) {
        ctx.echecs = 0;
        return avancer(flow, ctx, env, "C'est noté, j'ai corrigé :");
      }
    }

    if (r === true) {
      try {
        const res = await flow.executer(d, env);
        viderFlux(ctx);
        return res;
      } catch (e) {
        console.error("[Buddy] Erreur d'exécution", flow.id, e);
        viderFlux(ctx);
        return rep("Oups, une erreur est survenue : je n'ai rien enregistré. Pouvez-vous réessayer dans un instant ?", { humeur: "triste" });
      }
    }
    if (r === false) {
      viderFlux(ctx);
      return rep(flow.annulation ?? "D'accord, j'annule. Rien n'a été modifié. 👍", { humeur: "neutre", suggestions: ["Aide"] });
    }

    if (await corriger(flow, m, env, ctx)) {
      ctx.echecs = 0;
      return avancer(flow, ctx, env, "C'est noté, j'ai corrigé :");
    }
    if (estNouvelleCommande(m)) return null;
    ctx.echecs++;
    if (ctx.echecs >= 3) {
      viderFlux(ctx);
      return rep("Je préfère arrêter là pour cette demande, rien n'a été modifié. Dites-moi ce que vous voulez faire. 🙂", { humeur: "neutre", suggestions: ["Aide"] });
    }
    return rep("Répondez par « oui » pour confirmer ou « non » pour annuler (vous pouvez aussi corriger une information : date, montant…).", {
      suggestions: ["Oui", "Non"],
      humeur: "reflechit",
    });
  }

  /* ── Étape de collecte ── */
  const slot = flow.slots.find((s) => s.cle === ctx.etape);
  if (!slot) {
    viderFlux(ctx);
    return null;
  }

  if (slot.optionnel && estPasser(m)) {
    d._passes = [...(Array.isArray(d._passes) ? d._passes : []), slot.cle];
    ctx.echecs = 0;
    return avancer(flow, ctx, env);
  }

  if (!slot.optionnel && m.norm === "non") {
    viderFlux(ctx);
    return rep(flow.annulation ?? "D'accord, j'annule. Rien n'a été modifié. 👍", { humeur: "neutre", suggestions: ["Aide"] });
  }

  const compris = await slot.extraire(m, d, env, { attendu: true, ecraser: false });
  if (compris) {
    if (!slot.texteLibre) {
      for (const autre of flow.slots) {
        if (autre !== slot && !autre.texteLibre && !autre.rempli(d)) await autre.extraire(m, d, env, { attendu: false, ecraser: false });
      }
    }
    ctx.echecs = 0;
    return avancer(flow, ctx, env);
  }

  if (!slot.texteLibre && estNouvelleCommande(m)) {
    viderFlux(ctx);
    return null;
  }

  ctx.echecs++;
  if (ctx.echecs >= 4) {
    viderFlux(ctx);
    return rep("Je n'arrive pas à comprendre, j'arrête cette demande (rien n'a été modifié). Reformulez-moi ce que vous voulez faire. 🙂", {
      humeur: "triste",
      suggestions: ["Aide"],
    });
  }
  const note = typeof d._note === "string" ? d._note : "Je n'ai pas bien compris.";
  delete d._note;
  const q = await slot.question(d, env);
  const sugg = [...(slot.suggestions?.(d, env) ?? [])];
  if (slot.optionnel) sugg.push("Passer");
  sugg.push("Annuler");
  return rep(`${note} ${q}`, { suggestions: sugg, humeur: "reflechit" });
}

/* ───────────── Petits utilitaires de présentation ───────────── */

export function puces(lignes: string[]): string {
  return lignes.map((l) => `• ${l}`).join("\n");
}

export function liste(lignes: string[]): string {
  return lignes.map((l, i) => `${i + 1}. ${l}`).join("\n");
}

export function pluriel(n: number, singulier: string, plur?: string): string {
  return `${n} ${n > 1 ? plur ?? singulier + "s" : singulier}`;
}
