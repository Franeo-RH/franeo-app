// app/api/buddy/route.ts
// Buddy : assistant virtuel de l'espace client.
// POST { message } → { reponse, suggestions?, liens?, redirection?, humeur? }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { analyser, aPrefixe, aujourdhui, a, matchSalaries, type Msg } from "@/lib/buddy/outils";
import { chargerCtx, sauverCtx, viderFlux } from "@/lib/buddy/contexte";
import { continuerFlux, demarrerFlux, rep } from "@/lib/buddy/moteur";
import { detecter, moduleDe, type Intention } from "@/lib/buddy/intentions";
import { echeanceAjout, echeanceModif, echeanceSuppr, echeanceTraiter, lireEcheances } from "@/lib/buddy/flux-echeances";
import { absenceAjout, absenceModif, absenceSuppr, salarieAjout, salarieModif, salarieSuppr, variableAjout, variableModif, variableSuppr } from "@/lib/buddy/flux-rh";
import {
  evolutionAnnuler,
  evolutionPaie,
  evolutionRH,
  motsFormule,
  recrutementCreation,
  supportCreation,
  supportReponse,
  ticketCreation,
  ticketReponse,
} from "@/lib/buddy/flux-services";
import {
  aAcces,
  aide,
  lireAbonnements,
  lireAbsences,
  chercherDansActus,
  actusInterdites,
  lireActuComplete,
  lireActus,
  lireFacturation,
  lireFaq,
  lireFiche,
  lireFormules,
  lirePaie,
  lireRecrutements,
  lireSalaries,
  lireTicketDetail,
  lireTickets,
  lireVariables,
  navigation,
  numeroDansMessage,
  refusAcces,
  resumerActus,
  salut,
} from "@/lib/buddy/lectures";
import { nomComplet } from "@/lib/buddy/slots";
import { ticketsDuMois } from "@/lib/facturation";
import type { Ctx, Env, Flow, ReponseBuddy } from "@/lib/buddy/types";

export const dynamic = "force-dynamic";

const FLUX: Record<string, Flow> = Object.fromEntries(
  [
    absenceAjout, absenceSuppr, absenceModif,
    echeanceAjout, echeanceSuppr, echeanceModif, echeanceTraiter,
    variableAjout, variableSuppr, variableModif,
    salarieAjout, salarieModif, salarieSuppr,
    ticketCreation, supportCreation, ticketReponse, supportReponse,
    evolutionRH, evolutionPaie, evolutionAnnuler,
    recrutementCreation,
  ].map((f) => [f.id, f])
);

/* ════════════════════════════════════════════════════════════════
   Chargement du contexte de l'entreprise
   ════════════════════════════════════════════════════════════════ */

async function chargerEnv(session: { id: string; prenom: string; entrepriseId: string }, ctx: Ctx): Promise<Env | null> {
  const entreprise = await prisma.entreprise.findUnique({
    where: { id: session.entrepriseId },
    include: { abonnement: true, abonnementPaie: true },
  });
  if (!entreprise) return null;

  const salaries = await prisma.salarie.findMany({
    where: { entrepriseId: entreprise.id },
    orderBy: { nom: "asc" },
    select: {
      id: true, prenom: true, nom: true, poste: true, statut: true, typeContrat: true, dateDebut: true, dateFin: true,
      salaireMensuel: true, salaireAnnuel: true, email: true, telephone: true, heuresHebdomadaires: true,
    },
  });

  const now = new Date();
  return {
    session,
    entreprise: {
      id: entreprise.id,
      nom: entreprise.nom,
      permissions: entreprise.permissions,
      ticketsUtilises: await ticketsDuMois(entreprise.id, new Date().getMonth() + 1, new Date().getFullYear()), // tickets du mois en cours
      bulletinsUtilises: entreprise.bulletinsUtilises,
      abonnementId: entreprise.abonnementId,
      abonnementPaieId: entreprise.abonnementPaieId,
      abonnement: entreprise.abonnement,
      abonnementPaie: entreprise.abonnementPaie,
    },
    salaries,
    today: aujourdhui(now),
    now,
    dernierSalarieId: ctx.dernierSalarieId,
  };
}

const EXEMPLES: Partial<Record<string, string>> = {
  absence_ajout: "« Marie en congé du 03/11 au 07/11 » ou « Jean malade demain ».",
  absence_suppr: "« Supprime l'absence de Marie ».",
  absence_modif: "« Décale l'absence de Marie du 10 au 14 novembre ».",
  echeance_ajout: "« Ajoute une visite médicale pour Marie le 15/12/2026 » ou « Titre de séjour de Jean le 03/03/2027 ».",
  echeance_traiter: "« La visite médicale de Marie est faite ».",
  echeance_modif: "« Décale la visite médicale de Marie au 15/01/2027 ».",
  echeance_suppr: "« Supprime l'échéance de Marie ».",
  variable_ajout: "« Prime de 500 € pour Jean » ou « 4 heures supp à Marie ».",
  variable_suppr: "« Supprime la prime de Jean ».",
  variable_modif: "« Change la prime de Jean à 600 ».",
  salarie_ajout: "« Ajoute un salarié Paul Lefèvre comme développeur en CDI ».",
  salarie_modif: "« Change le salaire de Jean à 2800 » ou « Marie quitte l'entreprise le 30/11 ».",
  ticket_creer: "« Ouvre un ticket pour… » suivi de votre demande.",
  abo_evolution: "« Je veux passer à la formule Premium ».",
  recrutement_creer: "« Je veux recruter un comptable en CDI ».",
};

/** « Comment… ? », « Puis-je… ? », « Faut-il… ? » : l'utilisateur veut une explication, pas une action. */
function estQuestionProcedure(m: Msg): boolean {
  return (
    m.mots.slice(0, 3).includes("comment") ||
    a(m, "pourquoi", "faut il", "dois je", "puis je", "peut on", "c est quoi", "qu est ce que", "que dois je", "quand sont", "quand est ce", "comment faire", "comment fait on", "a quoi sert")
  );
}

/* ════════════════════════════════════════════════════════════════
   Aides à la décision
   ════════════════════════════════════════════════════════════════ */

/** Dans un flux, ce message est-il plutôt une nouvelle demande qu'une réponse à la question posée ? */
function estNouvelleCommande(m: Msg, env: Env, ctx: Ctx): boolean {
  if (m.mots.length < 3) return false;
  const i = detecter(m, env, { ...ctx, liste: undefined });
  return !["inconnu", "salut", "merci", "aurevoir", "vide", "annuler_rien", "oui_non_seul", "actus_liste"].includes(i.id);
}

async function lancer(flow: Flow, m: Msg, env: Env, ctx: Ctx, initial: Record<string, any> = {}): Promise<ReponseBuddy> {
  if (!aAcces(env, flow.module)) return refusAcces(flow.module);
  return demarrerFlux(flow, m, env, ctx, initial);
}

/** Pour « changer d'abonnement » : de quel service parle-t-on (RH ou paie) ? */
async function canalFormule(m: Msg, canal: Intention["canal"]): Promise<"rh" | "paie" | "ambigu"> {
  if (canal === "rh" || canal === "paie") return canal;
  const [rh, paie] = await Promise.all([prisma.abonnement.findMany(), prisma.abonnementPaie.findMany()]);
  const dansRH = rh.some((f) => a(m, ...motsFormule(f.nom)));
  const dansPaie = paie.some((f) => a(m, ...motsFormule(f.nom), f.code.toLowerCase()));
  if (dansPaie && !dansRH) return "paie";
  if (dansRH && !dansPaie) return "rh";
  return "ambigu";
}

/* ════════════════════════════════════════════════════════════════
   Suivi d'une liste affichée juste avant (« détail du 2 », « résume la 3 »…)
   ════════════════════════════════════════════════════════════════ */

async function suivreListe(m: Msg, env: Env, ctx: Ctx): Promise<ReponseBuddy | null> {
  const liste = ctx.liste;
  if (!liste || m.mots.length > 8) return null;
  const n = numeroDansMessage(m, liste.items.length);
  if (!n) return null;
  if (matchSalaries(m, env.salaries).length > 0) return null;

  if (liste.type === "actus") {
    if (aPrefixe(m, "resum", "simplif", "vulgaris", "synthes", "expliqu") || a(m, "en clair", "en bref", "mots simples")) return resumerActus(m, env, ctx);
    return lireActuComplete(m, env, ctx);
  }

  const rh = liste.type === "tickets";
  const module = rh ? "tickets" : "helpdesk";
  if (aPrefixe(m, "repon", "ecri", "envoy", "relanc", "complet")) {
    const flow = rh ? ticketReponse : supportReponse;
    const element = liste.items[n - 1];
    return lancer(flow, m, env, ctx, { cibleId: element.id, cibleId_liste: [{ id: element.id, label: element.label }] });
  }
  if (!aAcces(env, module)) return refusAcces(module);
  return lireTicketDetail(env, ctx, n);
}

/* ════════════════════════════════════════════════════════════════
   Traitement d'un message
   ════════════════════════════════════════════════════════════════ */

async function traiter(m: Msg, env: Env, ctx: Ctx): Promise<ReponseBuddy> {
  /* 1) Une conversation guidée est en cours */
  if (ctx.flow) {
    const flow = FLUX[ctx.flow];
    if (!flow) {
      viderFlux(ctx);
    } else {
      const r = await continuerFlux(flow, m, env, ctx, (x) => estNouvelleCommande(x, env, ctx));
      if (r) return r;
      // sinon : le message est une nouvelle demande, on la traite normalement
    }
  }

  /* 2) Suite d'une liste (« détail du 2 », « résume la 3 ») */
  const suite = await suivreListe(m, env, ctx);
  if (suite) return suite;

  /* 3) Nouvelle demande */
  const i = detecter(m, env, ctx);

  // « Comment déclarer un arrêt maladie ? » : c'est une question de procédure → la FAQ d'abord
  if (estQuestionProcedure(m)) {
    const faq = await lireFaq(m);
    if (faq) return faq;
    const exemple = EXEMPLES[i.id];
    if (exemple) {
      return rep(`C'est très simple, dites-le-moi et je m'en occupe : ${exemple}`, { humeur: "content", suggestions: ["Aide"] });
    }
  }
  const garderListe = i.id === "actus_liste" || i.id === "actus_resume" || i.id === "actus_lire" || i.id === "ticket_liste" || i.id === "ticket_voir";
  if (!garderListe) ctx.liste = undefined;

  const module = moduleDe(i.id, i.canal);
  if (!aAcces(env, module)) return refusAcces(module);

  switch (i.id) {
    case "vide":
      return rep("Je vous écoute ! 🙂", { humeur: "content" });
    case "salut":
      return salut(env);
    case "merci":
      return rep("Avec plaisir ! 😊 N'hésitez pas si vous avez besoin d'autre chose.", { humeur: "content", suggestions: ["Aide"] });
    case "aurevoir":
      return rep("À bientôt ! 👋", { humeur: "content" });
    case "identite":
      return rep("Je suis Buddy, l'assistant virtuel de votre espace Franeo. 🤖\nJe peux gérer vos salariés, absences, variables de paie, tickets, abonnements, vous résumer l'actualité RH ou répondre à vos questions.", {
        humeur: "content",
        suggestions: ["Aide", "Actualités RH"],
      });
    case "aide":
      return aide(env);
    case "annuler_rien":
      return rep("Il n'y a rien à annuler pour le moment. 🙂", { humeur: "neutre", suggestions: ["Aide"] });
    case "oui_non_seul":
      return rep("Je n'ai pas de question en attente. Dites-moi ce que vous souhaitez faire. 🙂", { humeur: "reflechit", suggestions: ["Aide"] });
    case "nav":
      return navigation(m, env);

    /* Actualités */
    case "actus_liste":
      return lireActus(m, env, ctx);
    case "actus_resume":
      return resumerActus(m, env, ctx);
    case "actus_lire":
      return lireActuComplete(m, env, ctx);

    /* Facturation et abonnements */
    case "facturation":
      return lireFacturation(m, env);
    case "abo_info":
      return lireAbonnements(env, i.canal === "support" ? null : i.canal);
    case "abo_formules":
      return lireFormules(env, i.canal === "support" ? null : i.canal);
    case "abo_evolution": {
      const canal = await canalFormule(m, i.canal);
      if (canal === "ambigu") {
        return rep("Voulez-vous changer votre abonnement RH ou votre formule paie ? 🤔", {
          humeur: "reflechit",
          suggestions: ["Changer d'abonnement RH", "Changer de formule paie", "Quelles sont les formules ?"],
        });
      }
      if (canal === "paie" && !aAcces(env, "paie")) return refusAcces("paie");
      if (canal === "rh" && !aAcces(env, "entreprise")) return refusAcces("entreprise");
      return lancer(canal === "paie" ? evolutionPaie : evolutionRH, m, env, ctx);
    }
    case "abo_annuler":
      return lancer(evolutionAnnuler, m, env, ctx, { canal: i.canal === "rh" || i.canal === "paie" ? i.canal : undefined });

    /* Recrutement */
    case "recrutement_creer":
      return lancer(recrutementCreation, m, env, ctx);
    case "recrutement_liste":
      return lireRecrutements(env);

    /* Tickets */
    case "ticket_creer":
      return lancer(i.canal === "support" ? supportCreation : ticketCreation, m, env, ctx);
    case "ticket_liste":
      return lireTickets(env, ctx, i.canal === "support" ? "support" : "rh");
    case "ticket_voir": {
      if (!ctx.liste) {
        await lireTickets(env, ctx, i.canal === "support" ? "support" : "rh");
      }
      const n = ctx.liste ? numeroDansMessage(m, ctx.liste.items.length) : null;
      if (!n) return lireTickets(env, ctx, i.canal === "support" ? "support" : "rh");
      return lireTicketDetail(env, ctx, n);
    }
    case "ticket_repondre": {
      const flow = i.canal === "support" ? supportReponse : ticketReponse;
      const n = ctx.liste ? numeroDansMessage(m, ctx.liste.items.length) : null;
      if (n && ctx.liste) {
        const element = ctx.liste.items[n - 1];
        return lancer(flow, m, env, ctx, { cibleId: element.id, cibleId_liste: [{ id: element.id, label: element.label }] });
      }
      return lancer(flow, m, env, ctx);
    }

    /* Absences */
    case "absence_ajout":
      return lancer(absenceAjout, m, env, ctx);
    case "absence_suppr":
      return lancer(absenceSuppr, m, env, ctx);
    case "absence_modif":
      return lancer(absenceModif, m, env, ctx);
    case "absence_info":
      return lireAbsences(m, env);

    /* Échéances de documents */
    case "echeance_ajout":
      return lancer(echeanceAjout, m, env, ctx);
    case "echeance_traiter":
      return lancer(echeanceTraiter, m, env, ctx);
    case "echeance_modif":
      return lancer(echeanceModif, m, env, ctx);
    case "echeance_suppr":
      return lancer(echeanceSuppr, m, env, ctx);
    case "echeance_info":
      return lireEcheances(m, env);

    /* Variables de paie */
    case "variable_ajout":
      return lancer(variableAjout, m, env, ctx);
    case "variable_suppr":
      return lancer(variableSuppr, m, env, ctx);
    case "variable_modif":
      return lancer(variableModif, m, env, ctx);
    case "variable_info":
      return lireVariables(m, env);
    case "paie_recap":
      return lirePaie(env);

    /* Salariés */
    case "salarie_ajout":
      return lancer(salarieAjout, m, env, ctx);
    case "salarie_modif":
      return lancer(salarieModif, m, env, ctx);
    case "salarie_suppr":
      return lancer(salarieSuppr, m, env, ctx);
    case "salarie_fiche":
      return lireFiche(m, env);
    case "salarie_liste":
      return lireSalaries(m, env);
    case "precision_retrait": {
      const s = matchSalaries(m, env.salaries)[0]?.s;
      const nom = s ? nomComplet(s) : "ce salarié";
      return rep(`Que souhaitez-vous retirer pour ${nom} ?`, {
        humeur: "reflechit",
        suggestions: [`Supprimer une absence de ${s?.prenom ?? ""}`.trim(), `Supprimer une variable de ${s?.prenom ?? ""}`.trim(), `Fin de contrat de ${s?.prenom ?? ""}`.trim()],
      });
    }
  }

  /* 4) Rien de reconnu : la FAQ, puis une réponse d'aide */
  const faq = await lireFaq(m);
  if (faq) return faq;

  // Un sujet RH qui figure dans les actualités : on sort l'actualité complète
  const actu = (await actusInterdites(env)) ? null : await chercherDansActus(m, ctx);
  if (actu) return actu;

  return rep("Je n'ai pas bien compris 🤔 Pouvez-vous reformuler ?\nTapez « aide » pour voir tout ce que je sais faire, ou je peux transmettre votre question à l'équipe via un ticket.", {
    humeur: "triste",
    suggestions: ["Aide", "Ouvrir un ticket", "Actualités RH"],
  });
}

/* ════════════════════════════════════════════════════════════════
   Point d'entrée
   ════════════════════════════════════════════════════════════════ */

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ reponse: "Vous devez être connecté pour discuter avec moi." });
  }
  if (session.role !== "CLIENT" || !session.entrepriseId) {
    return NextResponse.json({ reponse: "Buddy est réservé à l'espace client." });
  }

  let message = "";
  try {
    const body = await request.json();
    message = typeof body?.message === "string" ? body.message.trim().slice(0, 1000) : "";
  } catch {
    // corps invalide : on répond poliment ci-dessous
  }
  if (!message) return NextResponse.json({ reponse: "Je vous écoute ! 🙂" });

  try {
    const ctx = await chargerCtx(session.id);
    const env = await chargerEnv({ id: session.id, prenom: session.prenom, entrepriseId: session.entrepriseId }, ctx);
    if (!env) return NextResponse.json({ reponse: "Je ne retrouve pas votre entreprise. Reconnectez-vous puis réessayez." });

    const reponse = await traiter(analyser(message), env, ctx);

    ctx.dernierSalarieId = env.dernierSalarieId ?? ctx.dernierSalarieId;
    await sauverCtx(session.id, ctx);
    return NextResponse.json(reponse);
  } catch (e) {
    console.error("[Buddy] Erreur", e);
    return NextResponse.json({
      reponse: "Oups, j'ai rencontré un problème technique. Réessayez dans un instant — si cela continue, ouvrez un ticket helpdesk. 🙏",
      humeur: "triste",
      suggestions: ["Aide"],
    });
  }
}
