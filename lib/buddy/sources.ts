// lib/buddy/sources.ts
// Exécute une réponse paramétrée « chercher dans l'app » : Buddy lit l'information dans l'application
// (avec les droits et le périmètre de la personne connectée) au lieu de donner un texte figé.

import { prisma } from "@/lib/prisma";
import { aDroit } from "@/lib/droits";
import { congesDe } from "@/lib/conges-serveur";
import { prochaineEtape, TYPES_AT } from "@/lib/accidents";
import { a as contient, matchSalaries, type Msg } from "./outils";
import { puces, rep } from "./moteur";
import { NAVIGATION, PAGE } from "./pages";
import { nomComplet } from "./slots";
import { lireProjets } from "./projets";
import { lireEcheances } from "./flux-echeances";
import {
  aAcces, chercherDansActus, lireAbonnements, lireAbsences, lireFacturation, lireFaq, lireFiche, lirePaie, lireSalaries, lireTickets, lireVariables, refusAcces,
} from "./lectures";
import type { Ctx, Env, ModuleBuddy, ReponseBuddy } from "./types";

const MODULES: Record<string, ModuleBuddy> = {
  conges: "absences", absences: "absences", salaries: "salaries", echeances: "salaries", accidents: "salaries",
  variables: "paie", paie: "paie", facturation: "entreprise", abonnements: "entreprise", tickets: "tickets", projets: "projets",
};

const j = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} j`;
const fr = (d: Date) => d.toLocaleDateString("fr-FR");

/** Soldes de congés (calculés par l'application) : du salarié cité, sinon de l'équipe */
async function lireConges(m: Msg, env: Env): Promise<ReponseBuddy> {
  const cites = matchSalaries(m, env.salaries).map((x) => x.s);
  const cibles = (cites.length ? cites : env.salaries.filter((s) => s.statut === "Actif")).slice(0, 40);
  if (cibles.length === 0) return rep("Je n'ai trouvé aucun salarié.", { humeur: "reflechit" });
  const soldes = await congesDe(cibles.map((s) => s.id));
  if (cibles.length === 1) {
    const s = cibles[0];
    const c = soldes.get(s.id);
    if (!c) return rep(`Je n'ai pas pu calculer les congés de ${nomComplet(s)}.`, { humeur: "triste" });
    return rep(
      `🌴 Congés de ${nomComplet(s)}\n${puces([
        `${j(c.reste)} à prendre (jusqu'au ${fr(c.priseAu)})`,
        `${j(c.enCours.acquis)} en cours d'acquisition`,
        ...(c.enAttente ? [`${j(c.enAttente)} demandé(s), en attente de validation`] : []),
        ...(c.regle.caisse ? ["Congés payés par la caisse de congés du BTP"] : []),
      ])}`,
      { humeur: "content", liens: [{ label: "Soldes de congés", href: PAGE.conges }] }
    );
  }
  const lignes = cibles.map((s) => { const c = soldes.get(s.id); return c ? `${nomComplet(s)} : ${j(c.reste)} à prendre${c.enCours.acquis ? ` + ${j(c.enCours.acquis)} en cours` : ""}` : null; }).filter((x): x is string => !!x);
  return rep(`🌴 Soldes de congés\n${puces(lignes.slice(0, 15))}${lignes.length > 15 ? `\n… et ${lignes.length - 15} autre(s)` : ""}`, { humeur: "content", liens: [{ label: "Soldes de congés", href: PAGE.conges }] });
}

/** Accidents du travail en cours et prochaine échéance */
async function lireAccidents(env: Env): Promise<ReponseBuddy> {
  if (!aDroit(env.entreprise.permissions, "rh.accidents")) return refusAcces("salaries");
  const l = await prisma.accidentTravail.findMany({
    where: { entrepriseId: env.entreprise.id, statut: { not: "CLOS" }, ...(env.perimetre ? { salarieId: { in: env.perimetre } } : {}) },
    include: { salarie: { select: { prenom: true, nom: true } } },
    orderBy: { dateAccident: "desc" },
    take: 10,
  });
  if (l.length === 0) return rep("Aucun accident du travail en cours. ✅", { humeur: "content", liens: [{ label: "Accidents du travail", href: PAGE.accidents }] });
  const lignes = l.map((x) => {
    const e = prochaineEtape(x);
    return `${nomComplet(x.salarie)} — ${TYPES_AT[x.type] ?? "accident"} du ${fr(x.dateAccident)}${e ? ` : ${e.texte.toLowerCase()}${e.limite ? ` avant le ${fr(e.limite)}` : ""}` : ""}`;
  });
  return rep(`🩹 ${l.length} accident(s) en cours\n${puces(lignes)}`, { humeur: "reflechit", liens: [{ label: "Accidents du travail", href: PAGE.accidents }] });
}

/** Recherche générale : une page de l'app, puis la FAQ, puis les actualités */
async function rechercher(m: Msg, env: Env, ctx: Ctx): Promise<ReponseBuddy | null> {
  // La page dont l'expression reconnue est la plus longue (« solde de conges » plutôt que « conges »)
  let meilleure: { n: (typeof NAVIGATION)[number]; taille: number } | null = null;
  for (const n of NAVIGATION) for (const mot of n.mots) if (contient(m, mot) && (!meilleure || mot.length > meilleure.taille)) meilleure = { n, taille: mot.length };
  const page = meilleure?.n ?? null;
  const faq = await lireFaq(m, env.entreprise.id);
  if (faq) return page && aAcces(env, page.module as ModuleBuddy) ? { ...faq, liens: [...(faq.liens ?? []), { label: page.label, href: PAGE[page.cle] }] } : faq;
  if (page && aAcces(env, page.module as ModuleBuddy)) return rep(`Vous trouverez cela dans « ${page.label} ». 👉`, { humeur: "content", liens: [{ label: page.label, href: PAGE[page.cle] }] });
  return chercherDansActus(m, ctx);
}

/**
 * Réponse d'une source. `null` si rien n'a été trouvé (Buddy donne alors le texte de l'admin, s'il y en a un).
 */
export async function executerSource(source: string, m: Msg, env: Env, ctx: Ctx): Promise<ReponseBuddy | null> {
  const module = MODULES[source];
  if (module && !aAcces(env, module)) return refusAcces(module);
  switch (source) {
    case "recherche": return rechercher(m, env, ctx);
    case "conges": return lireConges(m, env);
    case "absences": return lireAbsences(m, env);
    case "salaries": return matchSalaries(m, env.salaries).length === 1 ? lireFiche(m, env) : lireSalaries(m, env);
    case "echeances": return lireEcheances(m, env);
    case "variables": return lireVariables(m, env);
    case "paie": return lirePaie(env);
    case "accidents": return lireAccidents(env);
    case "facturation": return lireFacturation(m, env);
    case "abonnements": return lireAbonnements(env, null);
    case "tickets": return lireTickets(env, ctx, "rh");
    case "projets": return lireProjets(m, env);
    case "actus": return chercherDansActus(m, ctx);
    case "faq": return lireFaq(m, env.entreprise.id);
    default: return null;
  }
}
