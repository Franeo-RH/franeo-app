// lib/buddy/flux-services.ts
// Conversations guidées : tickets RH, helpdesk, évolutions d'abonnement, recrutement.

import { prisma } from "@/lib/prisma";
import {
  a,
  detecterCategorieSupport,
  detecterContrat,
  CONTRATS,
  eur,
  fmtDate,
  fmtDateCreation,
  LABELS_SUPPORT,
  nettoyer,
  NOMS_MOIS_AFFICHAGE,
  parseNombres,
  versDate,
  type Msg,
} from "./outils";
import { puces, rep } from "./moteur";
import { PAGE } from "./pages";
import { elementChoisi, slotChoix, slotCible, slotDate, slotTexte, type Element } from "./slots";
import type { Data, Env, Flow, Slot } from "./types";

/**
 * Le compteur « tickets utilisés » (Entreprise.ticketsUtilises) sert à facturer les tickets au-delà du forfait.
 * Mettez false si, dans votre app, ce compteur n'est PAS augmenté à la création d'un ticket (par exemple s'il est calculé ailleurs).
 */
export const INCREMENTER_TICKETS_UTILISES = true;

/** Prix d'une demande de recrutement (identique à app/api/recrutement/route.ts). */
export const PRIX_RECRUTEMENT = 400;

/* ════════════════════════════════════════════════════════════════
   Outils
   ════════════════════════════════════════════════════════════════ */

export function titreDepuis(texte: string): string {
  const propre = nettoyer(texte, 400);
  const phrase = propre.split(/(?<=[.!?])\s|\n/)[0] || propre;
  let t = phrase.replace(/[.!?]+$/, "");
  if (t.length > 70) {
    t = t.slice(0, 70);
    const dernierEspace = t.lastIndexOf(" ");
    if (dernierEspace > 40) t = t.slice(0, dernierEspace);
    t += "…";
  }
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Texte situé après le mot « ticket » ("ouvre un ticket pour un souci de contrat" → "un souci de contrat"). */
export function texteApresTicket(m: Msg): string | null {
  const idx = m.brut.search(/\btickets?\b/i);
  let reste = idx >= 0 ? m.brut.slice(idx).replace(/^tickets?\b/i, "") : "";
  reste = reste
    .trim()
    .replace(/^(?:rh|helpdesk|support|technique)\b\s*/i, "")
    .replace(/^(?:pour|sur|concernant|au sujet (?:de|d')|à propos (?:de|d')|a propos (?:de|d')|à cause de|:|-|–|,)\s*/i, "")
    .trim();
  return reste.length >= 8 ? reste : null;
}

/** Pour le helpdesk, une phrase comme « j'ai un bug sur la page paie » est déjà la description. */
export function texteSupport(m: Msg): string | null {
  const apres = texteApresTicket(m);
  if (apres) return apres;
  if (/\bticket/i.test(m.brut)) return null;
  const brut = nettoyer(m.brut, 1000);
  return brut.length >= 12 ? brut : null;
}

function noteQuota(env: Env): string {
  const ab = env.entreprise.abonnement;
  if (!ab) return "";
  const utilises = env.entreprise.ticketsUtilises;
  if (utilises >= ab.ticketsRH) {
    return ab.prixTicketSupp > 0
      ? `\n\n💳 Vos ${ab.ticketsRH} tickets inclus sont déjà utilisés : ce ticket sera facturé ${eur(ab.prixTicketSupp)}. En confirmant, vous acceptez ce supplément.\n💡 Une formule avec plus de tickets peut revenir moins cher : page « Mon entreprise › Abonnement RH ».`
      : `\n\nℹ️ Vos ${ab.ticketsRH} tickets inclus sont déjà utilisés.`;
  }
  const restants = ab.ticketsRH - utilises;
  return `\n\nℹ️ Il vous restera ${restants - 1} ticket(s) inclus après celui-ci (${utilises + 1}/${ab.ticketsRH}).`;
}

/* ════════════════════════════════════════════════════════════════
   TICKET RH : création
   ════════════════════════════════════════════════════════════════ */

export const ticketCreation: Flow = {
  id: "ticket_creation",
  module: "tickets",
  slots: [
    slotTexte({
      cle: "description",
      min: 8,
      max: 1500,
      majuscule: true,
      question: "Quel est l'objet de votre demande ? Décrivez-la en une ou deux phrases.",
      etiquettes: ["objet", "description", "demande"],
      depuisPhrase: texteApresTicket,
    }),
  ],
  confirmation(d, env) {
    const titre = titreDepuis(d.description);
    const lignes = [`Objet : ${titre}`];
    if (d.description.length > titre.length + 5) lignes.push(`Détail : ${d.description}`);
    return `Je vais ouvrir ce ticket RH :\n${puces(lignes)}${noteQuota(env)}`;
  },
  async executer(d, env) {
    const titre = titreDepuis(d.description);
    const operations: any[] = [prisma.ticket.create({ data: { titre, description: d.description, entrepriseId: env.entreprise.id } })];
    if (INCREMENTER_TICKETS_UTILISES) {
      operations.push(prisma.entreprise.update({ where: { id: env.entreprise.id }, data: { ticketsUtilises: { increment: 1 } } }));
    }
    await prisma.$transaction(operations);
    env.entreprise.ticketsUtilises += INCREMENTER_TICKETS_UTILISES ? 1 : 0;
    return rep(`✅ Ticket RH créé : « ${titre} ».\nNotre équipe vous répond dès que possible.`, {
      humeur: "content",
      liens: [{ label: "Voir mes tickets", href: PAGE.tickets }],
      suggestions: ["Mes tickets", "Aide"],
    });
  },
};

/* ════════════════════════════════════════════════════════════════
   TICKET HELPDESK : création
   ════════════════════════════════════════════════════════════════ */

export const supportCreation: Flow = {
  id: "support_creation",
  module: "helpdesk",
  slots: [
    slotTexte({
      cle: "description",
      min: 8,
      max: 1500,
      majuscule: true,
      question: "Quel est le problème ou la question ? Décrivez-le en une ou deux phrases.",
      etiquettes: ["objet", "description", "probleme"],
      depuisPhrase: texteSupport,
    }),
    slotChoix({
      cle: "categorie",
      options: Object.entries(LABELS_SUPPORT).map(([code, label]) => ({ code, label })),
      detecter: detecterCategorieSupport,
      question: "De quel type de demande s'agit-il ?",
    }),
  ],
  confirmation(d) {
    const titre = titreDepuis(d.description);
    const lignes = [`Type : ${LABELS_SUPPORT[d.categorie]}`, `Objet : ${titre}`];
    if (d.description.length > titre.length + 5) lignes.push(`Détail : ${d.description}`);
    return `Je vais ouvrir ce ticket helpdesk :\n${puces(lignes)}`;
  },
  async executer(d, env) {
    const titre = titreDepuis(d.description);
    await prisma.ticketSupport.create({
      data: { titre, description: d.description, categorie: d.categorie, entrepriseId: env.entreprise.id },
    });
    return rep(`✅ Ticket helpdesk créé : « ${titre} ».\nL'équipe technique reviendra vers vous.`, {
      humeur: "content",
      liens: [{ label: "Voir le helpdesk", href: PAGE.helpdesk }],
      suggestions: ["Mes tickets helpdesk", "Aide"],
    });
  },
};

/* ════════════════════════════════════════════════════════════════
   TICKETS : répondre à un ticket existant
   ════════════════════════════════════════════════════════════════ */

function fabriquerReponse(canal: "rh" | "support"): Flow {
  const rh = canal === "rh";
  return {
    id: rh ? "ticket_reponse" : "support_reponse",
    module: rh ? "tickets" : "helpdesk",
    slots: [
      slotCible({
        cle: "cibleId",
        titre: "À quel ticket voulez-vous répondre ?",
        charger: async (_d, env) => {
          const where = { entrepriseId: env.entreprise.id, statut: { not: "Clôturé" } };
          const tickets = rh
            ? await prisma.ticket.findMany({ where, orderBy: { updatedAt: "desc" }, take: 10 })
            : await prisma.ticketSupport.findMany({ where, orderBy: { updatedAt: "desc" }, take: 10 });
          return tickets.map((t: any) => ({ id: t.id, statut: t.statut as string, label: `${t.titre} — ${t.statut} (${fmtDateCreation(t.createdAt)})` }));
        },
        filtrer: (m, items) => {
          const mots = m.mots.filter((w) => w.length > 3);
          const f = items.filter((i) => mots.some((w) => i.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(w)));
          return f.length > 0 ? f : null;
        },
        vide: () => `Aucun ticket ouvert auquel répondre. Un ticket clôturé ne peut plus recevoir de message : ouvrez-en un nouveau.`,
      }),
      slotTexte({ cle: "contenu", min: 2, max: 2000, majuscule: true, question: "Quel message voulez-vous envoyer ?" }),
    ],
    confirmation(d) {
      const e = elementChoisi(d, "cibleId");
      return `Je vais envoyer ce message sur le ticket « ${e?.label ?? "—"} » :\n${puces([d.contenu])}`;
    },
    async executer(d, env) {
      const base = { entrepriseId: env.entreprise.id };
      const ticket: any = rh
        ? await prisma.ticket.findFirst({ where: { id: d.cibleId, ...base } })
        : await prisma.ticketSupport.findFirst({ where: { id: d.cibleId, ...base } });
      if (!ticket) return rep("Je ne retrouve plus ce ticket, rien n'a été envoyé.", { humeur: "triste" });
      if (ticket.statut === "Clôturé") return rep("Ce ticket vient d'être clôturé, je n'ai pas pu envoyer le message. Ouvrez-en un nouveau si besoin.", { humeur: "triste" });
      const donnees = { ticketId: ticket.id, contenu: d.contenu, auteur: env.session.prenom, role: "CLIENT" as any };
      if (rh) {
        await prisma.messageTicket.create({ data: donnees });
        await prisma.ticket.updateMany({ where: { id: ticket.id, ...base }, data: { updatedAt: new Date() } });
      } else {
        await prisma.messageTicketSupport.create({ data: donnees });
        await prisma.ticketSupport.updateMany({ where: { id: ticket.id, ...base }, data: { updatedAt: new Date() } });
      }
      return rep(`✅ Message envoyé sur « ${ticket.titre} ».`, {
        humeur: "content",
        liens: [{ label: rh ? "Voir mes tickets" : "Voir le helpdesk", href: rh ? PAGE.tickets : PAGE.helpdesk }],
      });
    },
  };
}

export const ticketReponse = fabriquerReponse("rh");
export const supportReponse = fabriquerReponse("support");

/* ════════════════════════════════════════════════════════════════
   ÉVOLUTION D'ABONNEMENT RH
   ════════════════════════════════════════════════════════════════ */

function filtreFormule(champNom: string) {
  return (m: Msg, items: Element[]): Element[] | null => {
    const f = items.filter((i) => a(m, ...(i[champNom] as string[])));
    return f.length > 0 ? f : null;
  };
}

/** Mots du nom de formule qui l'identifient dans une phrase ("premium", "essentielle"…). */
export function motsFormule(nom: string): string[] {
  const n = nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const mots = n.split(" ").filter((w) => w.length > 3 && !["pack", "formule", "offre", "abonnement", "paie"].includes(w));
  return [n, ...mots];
}

export const evolutionRH: Flow = {
  id: "evolution_rh",
  module: "entreprise",
  slots: [
    slotCible({
      cle: "formuleId",
      titre: "Vers quelle formule RH voulez-vous évoluer ?",
      charger: async (_d, env) => {
        const formules = await prisma.abonnement.findMany({ orderBy: { prixMensuel: "asc" } });
        return formules
          .filter((f) => f.id !== env.entreprise.abonnementId)
          .map((f) => ({
            id: f.id,
            nom: f.nom,
            mots: motsFormule(f.nom),
            label: `${f.nom} — ${eur(f.prixMensuel)}/mois — ${f.ticketsRH} tickets RH, ${f.salariesInclus} salariés inclus`,
          }));
      },
      filtrer: filtreFormule("mots"),
      vide: () => "Aucune autre formule RH n'est disponible pour le moment.",
    }),
  ],
  async demarrer(m, d, env) {
    const encours = await prisma.demandeEvolution.findFirst({ where: { entrepriseId: env.entreprise.id, statut: "En attente" } });
    if (encours) {
      const cible = await prisma.abonnement.findUnique({ where: { id: encours.abonnementId } });
      return rep(
        `Vous avez déjà une demande d'évolution RH en attente${cible ? ` vers « ${cible.nom} »` : ""} (envoyée le ${fmtDateCreation(encours.createdAt)}).\nNotre équipe la traite ; si vous voulez en faire une autre, annulez-la d'abord.`,
        { humeur: "neutre", suggestions: ["Annuler ma demande d'évolution"], liens: [{ label: "Mon abonnement", href: PAGE.abonnement }] }
      );
    }
    const actuel = env.entreprise.abonnement;
    if (actuel && a(m, ...motsFormule(actuel.nom)) && !/\bpaie\b/i.test(m.brut)) {
      const autres = await prisma.abonnement.findMany({ where: { id: { not: actuel.id } } });
      const nommeUneAutre = autres.some((f) => a(m, ...motsFormule(f.nom)));
      if (!nommeUneAutre) {
        return rep(`Vous êtes déjà sur la formule RH « ${actuel.nom} » ✅. Voulez-vous voir les autres formules ?`, { suggestions: ["Quelles sont les formules RH ?"], humeur: "neutre" });
      }
    }
    return null;
  },
  confirmation(d, env) {
    const e = elementChoisi(d, "formuleId");
    const actuel = env.entreprise.abonnement;
    return `Je vais envoyer cette demande d'évolution de l'abonnement RH :\n${puces([`Actuellement : ${actuel ? actuel.nom : "aucune formule"}`, `Demandée : ${e?.label ?? "—"}`])}\n\nNotre équipe doit la valider avant qu'elle ne soit appliquée.`;
  },
  async executer(d, env) {
    const deja = await prisma.demandeEvolution.findFirst({ where: { entrepriseId: env.entreprise.id, statut: "En attente" } });
    if (deja) return rep("Une demande est déjà en attente, je n'en ai pas créé de seconde.", { humeur: "triste" });
    const formule = await prisma.abonnement.findUnique({ where: { id: d.formuleId } });
    if (!formule) return rep("Cette formule n'existe plus, rien n'a été envoyé.", { humeur: "triste" });
    await prisma.demandeEvolution.create({ data: { entrepriseId: env.entreprise.id, abonnementId: formule.id } });
    return rep(`✅ Demande envoyée : passage à la formule RH « ${formule.nom} ».\nVous serez prévenu dès qu'elle est validée par notre équipe.`, {
      humeur: "content",
      liens: [{ label: "Mon abonnement", href: PAGE.abonnement }],
    });
  },
};

/* ════════════════════════════════════════════════════════════════
   ÉVOLUTION D'ABONNEMENT PAIE
   ════════════════════════════════════════════════════════════════ */

export const evolutionPaie: Flow = {
  id: "evolution_paie",
  module: "paie",
  slots: [
    slotCible({
      cle: "formuleId",
      titre: "Quelle formule paie voulez-vous souscrire ?",
      charger: async (_d, env) => {
        const formules = await prisma.abonnementPaie.findMany({ orderBy: { prixMensuel: "asc" } });
        return formules
          .filter((f) => f.id !== env.entreprise.abonnementPaieId)
          .map((f) => ({
            id: f.id,
            nom: f.nom,
            mots: [...motsFormule(f.nom), f.code.toLowerCase()],
            label: `${f.nom} — ${eur(f.prixMensuel)}/mois — ${f.bulletinsInclus} bulletins inclus (puis ${eur(f.prixBulletinSupp)}/bulletin)`,
          }));
      },
      filtrer: filtreFormule("mots"),
      vide: () => "Aucune autre formule paie n'est disponible pour le moment.",
    }),
  ],
  async demarrer(m, d, env) {
    const encours = await prisma.demandeEvolutionPaie.findFirst({
      where: { entrepriseId: env.entreprise.id, statut: "EN_ATTENTE" },
      include: { nouvelleFormule: true },
    });
    if (encours) {
      return rep(
        `Vous avez déjà une demande de formule paie en attente (vers « ${encours.nouvelleFormule.nom} », envoyée le ${fmtDateCreation(encours.createdAt)}).\nNotre équipe la traite ; si vous voulez en faire une autre, annulez-la d'abord.`,
        { humeur: "neutre", suggestions: ["Annuler ma demande d'évolution"], liens: [{ label: "Abonnement paie", href: PAGE.abonnementPaie }] }
      );
    }
    const actuel = env.entreprise.abonnementPaie;
    if (actuel && a(m, ...motsFormule(actuel.nom), actuel.code.toLowerCase())) {
      const autres = await prisma.abonnementPaie.findMany({ where: { id: { not: actuel.id } } });
      const nommeUneAutre = autres.some((f) => a(m, ...motsFormule(f.nom), f.code.toLowerCase()));
      if (!nommeUneAutre) {
        return rep(`Vous êtes déjà sur la formule paie « ${actuel.nom} » ✅. Voulez-vous voir les autres formules ?`, { suggestions: ["Quelles sont les formules paie ?"], humeur: "neutre" });
      }
    }
    return null;
  },
  confirmation(d, env) {
    const e = elementChoisi(d, "formuleId");
    const actuel = env.entreprise.abonnementPaie;
    return `Je vais envoyer cette demande de formule paie :\n${puces([`Actuellement : ${actuel ? actuel.nom : "aucune formule paie"}`, `Demandée : ${e?.label ?? "—"}`])}\n\nNotre équipe doit la valider avant qu'elle ne soit appliquée.`;
  },
  async executer(d, env) {
    const deja = await prisma.demandeEvolutionPaie.findFirst({ where: { entrepriseId: env.entreprise.id, statut: "EN_ATTENTE" } });
    if (deja) return rep("Une demande est déjà en attente, je n'en ai pas créé de seconde.", { humeur: "triste" });
    const formule = await prisma.abonnementPaie.findUnique({ where: { id: d.formuleId } });
    if (!formule) return rep("Cette formule n'existe plus, rien n'a été envoyé.", { humeur: "triste" });
    await prisma.demandeEvolutionPaie.create({
      data: { entrepriseId: env.entreprise.id, ancienneFormuleId: env.entreprise.abonnementPaieId, nouvelleFormuleId: formule.id },
    });
    return rep(`✅ Demande envoyée : formule paie « ${formule.nom} ».\nVous serez prévenu dès qu'elle est validée par notre équipe.`, {
      humeur: "content",
      liens: [{ label: "Abonnement paie", href: PAGE.abonnementPaie }],
    });
  },
};

/* ════════════════════════════════════════════════════════════════
   ANNULER UNE DEMANDE D'ÉVOLUTION EN ATTENTE
   ════════════════════════════════════════════════════════════════ */

export const evolutionAnnuler: Flow = {
  id: "evolution_annuler",
  module: "entreprise",
  slots: [],
  async demarrer(m, d, env) {
    const veutRH = d.canal !== "paie";
    const veutPaie = d.canal !== "rh";
    const lignes: string[] = [];
    if (veutRH) {
      const r = await prisma.demandeEvolution.findFirst({ where: { entrepriseId: env.entreprise.id, statut: "En attente" } });
      if (r) {
        const f = await prisma.abonnement.findUnique({ where: { id: r.abonnementId } });
        d.rhId = r.id;
        lignes.push(`Abonnement RH → ${f?.nom ?? "?"} (demandé le ${fmtDateCreation(r.createdAt)})`);
      }
    }
    if (veutPaie) {
      const r = await prisma.demandeEvolutionPaie.findFirst({
        where: { entrepriseId: env.entreprise.id, statut: "EN_ATTENTE" },
        include: { nouvelleFormule: true },
      });
      if (r) {
        d.paieId = r.id;
        lignes.push(`Formule paie → ${r.nouvelleFormule.nom} (demandée le ${fmtDateCreation(r.createdAt)})`);
      }
    }
    if (lignes.length === 0) return rep("Vous n'avez aucune demande d'évolution en attente. 👍", { humeur: "neutre", suggestions: ["Mon abonnement"] });
    d.lignes = lignes;
    return null;
  },
  confirmation: (d) => `Je vais annuler ${d.lignes.length > 1 ? "ces demandes" : "cette demande"} d'évolution en attente :\n${puces(d.lignes)}`,
  async executer(d, env) {
    let n = 0;
    if (d.rhId) n += (await prisma.demandeEvolution.deleteMany({ where: { id: d.rhId, entrepriseId: env.entreprise.id, statut: "En attente" } })).count;
    if (d.paieId) n += (await prisma.demandeEvolutionPaie.deleteMany({ where: { id: d.paieId, entrepriseId: env.entreprise.id, statut: "EN_ATTENTE" } })).count;
    if (n === 0) return rep("Cette demande a déjà été traitée par notre équipe, je n'ai rien annulé.", { humeur: "triste" });
    return rep(`✅ Demande${n > 1 ? "s" : ""} annulée${n > 1 ? "s" : ""}.`, { humeur: "content", suggestions: ["Mon abonnement"] });
  },
};

/* ════════════════════════════════════════════════════════════════
   RECRUTEMENT
   ════════════════════════════════════════════════════════════════ */

const slotSalaires: Slot = {
  cle: "salaires",
  optionnel: true,
  requis: () => true,
  rempli: (d) => typeof d.salaireMini === "number",
  async extraire(m, d, env, mode) {
    if (mode.ecraser) return false;
    if (!mode.attendu && !(a(m, "salaire", "brut", "euros", "euro", "remuneration") || m.brut.includes("€"))) return false;
    if (!mode.attendu && typeof d.salaireMini === "number") return false;
    const nombres = parseNombres(m.brut).filter((n) => n >= 500 && n <= 1_000_000);
    if (nombres.length === 0) return false;
    d.salaireMini = Math.min(...nombres);
    d.salaireMaxi = Math.max(...nombres);
    return true;
  },
  question: () => "Quelle fourchette de salaire brut proposez-vous ? (ex : 2200 à 2800, ou « passer »)",
};

export const recrutementCreation: Flow = {
  id: "recrutement_creation",
  module: "tickets",
  slots: [
    slotTexte({
      cle: "poste",
      min: 3,
      max: 80,
      majuscule: true,
      question: "Quel poste souhaitez-vous pourvoir ? (ex : Comptable)",
      etiquettes: ["poste", "metier"],
      depuisPhrase: (m) => {
        const mm = m.brut.match(
          /\b(?:recruter|recrute|embaucher|embauche|chercher|cherche|recherche|rechercher|trouver|besoin d')\s+(?:un|une|des|1)?\s*(.+?)(?=\s+(?:en|à|a|dès|des|pour|avec|cdi|cdd|stage|alternance|intérim|interim)\s|[,.;]|$)/i
        );
        return mm && mm[1].length >= 3 && !/^(?:de l'aide|aide|quelqu)/i.test(mm[1]) ? mm[1] : null;
      },
    }),
    slotChoix({
      cle: "typeContrat",
      options: CONTRATS.map((c) => ({ code: c, label: c })),
      detecter: detecterContrat,
      question: "Quel type de contrat ?",
    }),
    slotTexte({ cle: "missions", min: 5, max: 1500, majuscule: true, question: "Quelles seront ses missions principales ?", etiquettes: ["missions", "mission"] }),
    slotTexte({ cle: "profil", min: 5, max: 1500, majuscule: true, question: "Quel profil recherchez-vous ? (compétences, expérience, formation…)", etiquettes: ["profil"] }),
    slotDate({ cle: "dateDebut", optionnel: true, question: "Pour quelle date de prise de poste ? (ex : 01/01/2027, ou « passer »)" }),
    slotSalaires,
  ],

  confirmation(d, env) {
    const lignes = [`Poste : ${d.poste} (${d.typeContrat})`, `Missions : ${d.missions}`, `Profil : ${d.profil}`];
    if (d.dateDebut) lignes.push(`Prise de poste : ${fmtDate(d.dateDebut)}`);
    if (typeof d.salaireMini === "number") lignes.push(d.salaireMini === d.salaireMaxi ? `Salaire brut : ${eur(d.salaireMini)}` : `Salaire brut : de ${eur(d.salaireMini)} à ${eur(d.salaireMaxi)}`);
    return `Je vais créer cette demande de recrutement :\n${puces(lignes)}\n\n💳 Une demande de recrutement est facturée ${eur(PRIX_RECRUTEMENT)} (ajoutés à votre facture de ${NOMS_MOIS_AFFICHAGE[env.today.m - 1]}). En confirmant, vous acceptez les conditions de vente.`;
  },

  async executer(d, env) {
    const entrepriseId = env.entreprise.id;
    const demande = await prisma.demandeRecrutement.create({
      data: {
        entrepriseId,
        poste: d.poste,
        typeContrat: d.typeContrat,
        dateDebut: d.dateDebut ? versDate(d.dateDebut) : null,
        salaireMini: typeof d.salaireMini === "number" ? d.salaireMini : null,
        salaireMaxi: typeof d.salaireMaxi === "number" ? d.salaireMaxi : null,
        missions: d.missions,
        profil: d.profil,
        cgvAcceptees: true,
      },
    });

    const ligne = `Recrutement du ${fmtDateCreation(demande.createdAt)} (${demande.poste}) : ${PRIX_RECRUTEMENT} €`;
    const existante = await prisma.facturation.findFirst({
      where: { entrepriseId, mois: env.today.m, annee: env.today.y, statut: "En attente" },
    });
    if (existante) {
      const ancien = (existante.commentaire || "").replace(/ \| /g, "\n");
      await prisma.facturation.update({
        where: { id: existante.id },
        data: { montant: existante.montant + PRIX_RECRUTEMENT, commentaire: ancien ? `${ancien}\n${ligne}` : ligne },
      });
    } else {
      await prisma.facturation.create({
        data: { entrepriseId, mois: env.today.m, annee: env.today.y, montant: PRIX_RECRUTEMENT, commentaire: ligne },
      });
    }

    return rep(`✅ Demande de recrutement « ${demande.poste} » enregistrée. Notre équipe vous recontacte rapidement.\n${eur(PRIX_RECRUTEMENT)} ont été ajoutés à votre facture du mois.`, {
      humeur: "content",
      liens: [{ label: "Historique des recrutements", href: PAGE.recrutementHisto }],
      suggestions: ["Mes demandes de recrutement", "Ma facture du mois"],
    });
  },
};

export type { Data };
