import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";
import { montantsMois } from "@/lib/facturation";
import { TYPES_DEMANDE } from "@/lib/apps-franeo";
import { ACTIONS } from "@/lib/hub-interne";

export const dynamic = "force-dynamic";

const court = (t: string | null | undefined, n = 220) => { const s = (t || "").replace(/\s+/g, " ").trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };
const arr = (n: number) => Math.round(n * 100) / 100;
const PRENDRE = 60;

type MessageFil = { role: string; auteur: string; contenu: string; createdAt: Date };
const fil = (m: MessageFil[]) => [...m].reverse().map((x) => ({ role: String(x.role), auteur: x.auteur, contenu: court(x.contenu, 400), date: x.createdAt }));

type Origine = { canal: "SITE" | "PARRAINAGE" | "CODE_PROMO" | "CABINET" | "ADMIN"; libelle: string; detail?: string };

/**
 * GET (portail admin FRANEO, clé HUB_SECRET) : résumé de Franeo RH au format commun des apps FRANEO
 * (chiffres, éléments à traiter, demandes détaillées, clients avec leur origine, factures impayées).
 */
export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const now = new Date();
  const mois = now.getMonth() + 1, annee = now.getFullYear();
  const pasDemo = { entreprise: { demo: false } };
  const enCours = ["Ouvert", "En cours"];

  const [entreprises, inscriptionsValidees, codesPromo, factures, impayes, inscriptions, tickets, helpdesk, questions, services, devis, evoPaie, evoRh, recrutements, prestations] = await Promise.all([
    prisma.entreprise.findMany({
      where: { demo: false },
      select: {
        id: true, nom: true, siret: true, email: true, telephone: true, ville: true, actif: true, createdAt: true, parrainId: true, permissions: true,
        commissionSource: true, commissionBeneficiaire: true, commissionPct: true,
        cabinet: { select: { nom: true } }, abonnement: { select: { nom: true } }, abonnementPaie: { select: { nom: true } },
        remises: { where: { motif: "CODE_PROMO" }, select: { libelle: true } },
      },
      orderBy: { nom: "asc" },
    }),
    prisma.demandeInscription.findMany({ where: { entrepriseId: { not: null } }, select: { entrepriseId: true, createdAt: true, besoins: true, message: true, codeParrainage: true, effectif: true } }),
    prisma.codePromo.findMany({ select: { code: true, beneficiaire: true } }).catch(() => [] as { code: string; beneficiaire: string | null }[]),
    prisma.facturation.findMany({ where: { mois, annee, ...pasDemo }, select: { entrepriseId: true, montant: true } }),
    prisma.facturation.findMany({ where: { statut: { not: "Payé" }, ...pasDemo }, select: { id: true, entrepriseId: true, mois: true, annee: true, montant: true, statut: true, dateLimitePaie: true, relances: true }, orderBy: [{ annee: "asc" }, { mois: "asc" }] }),
    prisma.demandeInscription.findMany({ where: { statut: "NOUVELLE" }, orderBy: { createdAt: "desc" }, take: PRENDRE }),
    prisma.ticket.findMany({ where: { statut: { in: enCours }, ...pasDemo }, select: { id: true, titre: true, description: true, statut: true, createdAt: true, entrepriseId: true, messages: { orderBy: { createdAt: "desc" as const }, take: 4, select: { role: true, auteur: true, contenu: true, createdAt: true } } }, orderBy: { createdAt: "desc" }, take: PRENDRE }),
    prisma.ticketSupport.findMany({ where: { statut: { in: enCours }, ...pasDemo }, select: { id: true, titre: true, description: true, categorie: true, statut: true, createdAt: true, entrepriseId: true, messages: { orderBy: { createdAt: "desc" as const }, take: 4, select: { role: true, auteur: true, contenu: true, createdAt: true } } }, orderBy: { createdAt: "desc" }, take: PRENDRE }),
    prisma.questionRH.findMany({ where: { statut: "OUVERTE", ...pasDemo }, select: { id: true, sujet: true, auteur: true, statut: true, createdAt: true, entrepriseId: true, messages: { orderBy: { createdAt: "desc" as const }, take: 4, select: { role: true, auteur: true, contenu: true, createdAt: true } } }, orderBy: { createdAt: "desc" }, take: PRENDRE }),
    prisma.demandeService.findMany({ where: { statut: { in: ["EN_ATTENTE", "EN_COURS"] }, ...pasDemo }, select: { id: true, type: true, app: true, options: true, message: true, auteur: true, statut: true, createdAt: true, entrepriseId: true, messages: { orderBy: { createdAt: "desc" as const }, take: 4, select: { role: true, auteur: true, contenu: true, createdAt: true } } }, orderBy: { createdAt: "desc" }, take: PRENDRE }),
    prisma.devis.findMany({ where: { statut: "EN_ATTENTE", ...pasDemo }, select: { id: true, totalIndicatif: true, message: true, auteur: true, statut: true, createdAt: true, entrepriseId: true, messages: { orderBy: { createdAt: "desc" as const }, take: 4, select: { role: true, auteur: true, contenu: true, createdAt: true } } }, orderBy: { createdAt: "desc" }, take: PRENDRE }),
    prisma.demandeEvolutionPaie.findMany({ where: { statut: "EN_ATTENTE", ...pasDemo }, select: { id: true, statut: true, createdAt: true, entrepriseId: true, nouvelleFormule: { select: { nom: true } }, ancienneFormule: { select: { nom: true } } }, orderBy: { createdAt: "desc" }, take: PRENDRE }),
    prisma.demandeEvolution.findMany({ where: { statut: "En attente", ...pasDemo }, select: { id: true, statut: true, message: true, createdAt: true, entrepriseId: true }, orderBy: { createdAt: "desc" }, take: PRENDRE }),
    prisma.demandeRecrutement.findMany({ where: { statut: "Reçue", ...pasDemo }, select: { id: true, poste: true, typeContrat: true, missions: true, statut: true, createdAt: true, entrepriseId: true }, orderBy: { createdAt: "desc" }, take: PRENDRE }),
    prisma.commandePrestation.findMany({ where: { statut: "A_FAIRE", ...pasDemo }, select: { id: true, libelle: true, quantite: true, salarie: true, auteur: true, statut: true, createdAt: true, entrepriseId: true }, orderBy: { createdAt: "desc" }, take: PRENDRE }),
  ]);

  const noms = new Map(entreprises.map((e) => [e.id, e.nom]));
  const inscriptionDe = new Map(inscriptionsValidees.map((i) => [i.entrepriseId!, i]));
  const promoDe = new Map(codesPromo.map((c) => [c.code, c]));

  // ── Origine de chaque client : code promo, parrainage, cabinet, formulaire du site, ou créé dans l'admin ──
  function origine(e: (typeof entreprises)[number]): Origine {
    const ins = inscriptionDe.get(e.id);
    const viaSite = ins ? ` · inscrit via le site le ${ins.createdAt.toLocaleDateString("fr-FR")}` : "";
    const promo = e.remises[0]?.libelle.replace(/^Code promo /, "");
    if (promo) {
      const b = promoDe.get(promo)?.beneficiaire || (e.commissionSource === "CODE_PROMO" ? e.commissionBeneficiaire : null);
      return { canal: "CODE_PROMO", libelle: `Code promo ${promo}`, detail: `${b ? `apporté par ${b}` : "code promo"}${viaSite}` };
    }
    if (e.parrainId) return { canal: "PARRAINAGE", libelle: `Parrainé par ${noms.get(e.parrainId) ?? "un client"}`, detail: `${e.commissionPct ? `commission ${e.commissionPct} %` : "sans commission"}${viaSite}` };
    if (e.cabinet) return { canal: "CABINET", libelle: `Via le cabinet ${e.cabinet.nom}`, detail: viaSite.replace(/^ · /, "") || undefined };
    if (ins) return { canal: "SITE", libelle: "Formulaire d'inscription du site", detail: `le ${ins.createdAt.toLocaleDateString("fr-FR")}${ins.codeParrainage ? ` · code saisi : ${ins.codeParrainage}` : ""}` };
    return { canal: "ADMIN", libelle: "Créé dans l'admin", detail: `le ${e.createdAt.toLocaleDateString("fr-FR")}` };
  }
  const origines = new Map(entreprises.map((e) => [e.id, origine(e)]));
  const client = (id: string) => ({ id, nom: noms.get(id) ?? "—", origine: origines.get(id) });

  // ── CA du mois : factures générées, sinon estimation (même calcul que la facture) ──
  const actifs = entreprises.filter((e) => e.actif);
  const factureDe = new Map<string, number>();
  for (const f of factures) factureDe.set(f.entrepriseId, (factureDe.get(f.entrepriseId) ?? 0) + f.montant);
  const sansFacture = actifs.filter((e) => !factureDe.has(e.id)).map((e) => e.id);
  const estimes = sansFacture.length ? await montantsMois(mois, annee, sansFacture).catch(() => new Map<string, number>()) : new Map<string, number>();
  const caDe = (id: string) => arr(factureDe.get(id) ?? estimes.get(id) ?? 0);
  const impayeDe = new Map<string, number>();
  for (const f of impayes) impayeDe.set(f.entrepriseId, (impayeDe.get(f.entrepriseId) ?? 0) + f.montant);

  // ── Demandes détaillées : qui, quoi, depuis quand ──
  const promoOuParrain = async (code: string | null) => {
    if (!code) return null;
    const p = promoDe.get(code.toUpperCase());
    if (p) return `Code promo ${p.code}${p.beneficiaire ? ` (${p.beneficiaire})` : ""}`;
    const parrain = await prisma.entreprise.findFirst({ where: { codeParrainage: { equals: code, mode: "insensitive" } }, select: { nom: true } });
    return parrain ? `Parrainé par ${parrain.nom}` : `Code saisi : ${code}`;
  };
  const demandes = [
    ...(await Promise.all(inscriptions.map(async (i) => {
      const code = await promoOuParrain(i.codeParrainage);
      return {
        id: `ins-${i.id}`, type: i.type === "CONTACT" ? "CONTACT" : "INSCRIPTION", typeLabel: i.type === "CONTACT" ? "Prise de contact" : "Demande d'inscription",
        objet: i.besoins.length ? `Besoins : ${i.besoins.join(", ")}` : court(i.message, 120) || "Inscription",
        detail: [court(i.message), i.effectif ? `Effectif : ${i.effectif}` : ""].filter(Boolean).join(" · "),
        client: { id: null, nom: i.societe, origine: { canal: code?.startsWith("Code promo") ? "CODE_PROMO" : code?.startsWith("Parrainé") ? "PARRAINAGE" : "SITE", libelle: code ?? "Formulaire d'inscription du site" } },
        contact: `${i.prenom} ${i.nom} · ${i.email}${i.telephone ? ` · ${i.telephone}` : ""}`,
        date: i.createdAt, statut: "Nouvelle", lien: "/admin/entreprises/nouveaux-clients",
      };
    }))),
    ...tickets.map((t) => ({ id: `tk-${t.id}`, type: "TICKET", typeLabel: "Ticket RH", objet: t.titre, detail: court(t.description), client: client(t.entrepriseId), date: t.createdAt, statut: t.statut, lien: `/admin/tickets/${t.id}`, repondre: true, fil: fil(t.messages) })),
    ...helpdesk.map((t) => ({ id: `hd-${t.id}`, type: "SUPPORT", typeLabel: `Support (${String(t.categorie).toLowerCase()})`, objet: t.titre, detail: court(t.description), client: client(t.entrepriseId), date: t.createdAt, statut: t.statut, lien: `/admin/helpdesk/${t.id}`, repondre: true, fil: fil(t.messages) })),
    ...questions.map((q) => ({ id: `q-${q.id}`, type: "QUESTION_RH", typeLabel: "Question RH", objet: q.sujet, detail: `Posée par ${q.auteur}`, client: client(q.entrepriseId), date: q.createdAt, statut: "Ouverte", lien: "/admin/tickets/questions", repondre: true, fil: fil(q.messages) })),
    ...services.map((d) => ({ id: `ds-${d.id}`, type: `SERVICE_${d.type}`, typeLabel: TYPES_DEMANDE[d.type]?.label ?? "Demande", objet: [d.app, ...d.options].filter(Boolean).join(", ") || TYPES_DEMANDE[d.type]?.label || d.type, detail: [court(d.message), d.auteur ? `par ${d.auteur}` : ""].filter(Boolean).join(" · "), client: client(d.entrepriseId), date: d.createdAt, statut: d.statut === "EN_COURS" ? "En cours" : "En attente", lien: "/admin/entreprises/demandes-services", repondre: true, fil: fil(d.messages) })),
    ...devis.map((d) => ({ id: `dv-${d.id}`, type: "DEVIS", typeLabel: "Demande de devis", objet: `Devis (${arr(d.totalIndicatif)} € indicatifs)`, detail: [court(d.message), d.auteur ? `par ${d.auteur}` : ""].filter(Boolean).join(" · "), client: client(d.entrepriseId), date: d.createdAt, statut: "En attente", lien: "/admin/entreprises/devis", repondre: true, fil: fil(d.messages) })),
    ...evoPaie.map((d) => ({ id: `ep-${d.id}`, type: "FORMULE_PAIE", typeLabel: "Changement de formule paie", objet: `${d.ancienneFormule?.nom ?? "Sans formule"} → ${d.nouvelleFormule.nom}`, detail: "", client: client(d.entrepriseId), date: d.createdAt, statut: "En attente", lien: "/admin/entreprises/demandes" })),
    ...evoRh.map((d) => ({ id: `er-${d.id}`, type: "FORMULE_RH", typeLabel: "Changement de formule RH", objet: "Nouvelle formule RH demandée", detail: court(d.message), client: client(d.entrepriseId), date: d.createdAt, statut: "En attente", lien: "/admin/entreprises/demandes" })),
    ...recrutements.map((r) => ({ id: `rc-${r.id}`, type: "RECRUTEMENT", typeLabel: "Recrutement", objet: `${r.poste} (${r.typeContrat})`, detail: court(r.missions), client: client(r.entrepriseId), date: r.createdAt, statut: r.statut, lien: "/admin/recrutement" })),
    ...prestations.map((p) => ({ id: `pr-${p.id}`, type: "PRESTATION", typeLabel: "Prestation commandée", objet: `${p.libelle}${p.quantite > 1 ? ` × ${p.quantite}` : ""}`, detail: [p.salarie ? `Salarié : ${p.salarie}` : "", p.auteur ? `par ${p.auteur}` : ""].filter(Boolean).join(" · "), client: client(p.entrepriseId), date: p.createdAt, statut: "À traiter", lien: "/admin/entreprises/prestations" })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const enCoursDe = new Map<string, number>();
  for (const d of demandes) if (d.client.id) enCoursDe.set(d.client.id, (enCoursDe.get(d.client.id) ?? 0) + 1);
  const OPTIONS: Record<string, string> = { "option-documents": "Documents", "option-medical": "Suivi médical", projets: "Projets" };

  const caMois = arr(actifs.reduce((t, e) => t + caDe(e.id), 0));
  const totalImpayes = arr(impayes.reduce((t, f) => t + f.montant, 0));
  const compte = (type: string) => demandes.filter((d) => d.type === type || d.type.startsWith(`${type}_`)).length;

  return NextResponse.json({
    app: "rh",
    nom: "Franeo RH",
    genereLe: now.toISOString(),
    chiffres: {
      clientsActifs: actifs.length,
      nouveaux30j: entreprises.filter((e) => e.createdAt.getTime() > Date.now() - 30 * 86400000).length,
      caMois,
      caMoisEstime: sansFacture.length > 0,
      impayes: totalImpayes,
      nbImpayes: impayes.length,
    },
    actions: Object.keys(ACTIONS),
    aTraiter: [
      { label: "Nouvelles inscriptions", n: compte("INSCRIPTION") + compte("CONTACT"), lien: "/admin/entreprises/nouveaux-clients" },
      { label: "Tickets RH", n: compte("TICKET"), lien: "/admin/tickets" },
      { label: "Support", n: compte("SUPPORT"), lien: "/admin/helpdesk" },
      { label: "Questions RH", n: compte("QUESTION_RH"), lien: "/admin/tickets/questions" },
      { label: "Demandes de services", n: compte("SERVICE"), lien: "/admin/entreprises/demandes-services" },
      { label: "Devis", n: compte("DEVIS"), lien: "/admin/entreprises/devis" },
      { label: "Changements de formule", n: compte("FORMULE"), lien: "/admin/entreprises/demandes" },
      { label: "Recrutements", n: compte("RECRUTEMENT"), lien: "/admin/recrutement" },
      { label: "Prestations à faire", n: compte("PRESTATION"), lien: "/admin/entreprises/prestations" },
      { label: "Factures impayées", n: impayes.length, lien: "/admin/entreprises/impayes" },
    ].filter((x) => x.n > 0),
    demandes,
    clients: entreprises.map((e) => {
      const ins = inscriptionDe.get(e.id);
      return {
        id: e.id, nom: e.nom, siret: e.siret, email: e.email, telephone: e.telephone, ville: e.ville, actif: e.actif, creeLe: e.createdAt,
        origine: origines.get(e.id),
        offre: [e.abonnementPaie?.nom && `Paie ${e.abonnementPaie.nom}`, e.abonnement?.nom && `RH ${e.abonnement.nom}`, ...e.permissions.filter((p) => OPTIONS[p]).map((p) => OPTIONS[p])].filter(Boolean).join(" · ") || (e.cabinet ? "Client cabinet" : "Sans formule"),
        demandeInitiale: ins ? [ins.besoins.length ? `Besoins : ${ins.besoins.join(", ")}` : "", court(ins.message, 160)].filter(Boolean).join(" · ") : null,
        caMois: e.actif ? caDe(e.id) : 0,
        impaye: arr(impayeDe.get(e.id) ?? 0),
        demandesEnCours: enCoursDe.get(e.id) ?? 0,
        lien: `/admin/entreprises/${e.id}`,
      };
    }),
    factures: impayes.map((f) => ({ id: f.id, client: client(f.entrepriseId), mois: f.mois, annee: f.annee, montant: arr(f.montant), statut: f.statut, echeance: f.dateLimitePaie, relances: f.relances, lien: `/admin/entreprises/${f.entrepriseId}?onglet=facturation` })),
  });
}
