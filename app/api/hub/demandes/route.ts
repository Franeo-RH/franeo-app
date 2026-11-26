import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";
import { appelInterne } from "@/lib/hub-interne";
import { journaliser } from "@/lib/journal";

export const dynamic = "force-dynamic";

// Demandes des clients gérées depuis le portail : liste (en cours ou traitées), détail complet, actions.
// Préfixes : tk ticket RH · hd helpdesk · q question RH · ds service/livret · dv devis · ep formule paie · er formule RH · rc recrutement · pr prestation
const pasDemo = { entreprise: { demo: false } };
const court = (t: string | null | undefined, n = 220) => { const s = (t || "").replace(/\s+/g, " ").trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };
type Msg = { role: string; auteur: string | null; contenu: string; createdAt: Date };
const fil = (m: Msg[]) => m.map((x) => ({ role: String(x.role), auteur: x.auteur, contenu: x.contenu, date: x.createdAt }));
const LIBELLES_SERVICE: Record<string, string> = { LIVRET: "Livret d'accueil", APP: "App FRANEO", OPTION: "Option", FORMATION: "Formation" };

/** Statuts « ouverts » de chaque type */
const OUVERTS = { tk: ["Ouvert", "En cours"], q: ["OUVERTE", "REPONDUE"], ds: ["EN_ATTENTE", "EN_COURS"], dv: ["EN_ATTENTE"], ep: ["EN_ATTENTE"], er: ["En attente"], rc: ["Reçue", "En cours"], pr: ["A_FAIRE"] };

export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const p = request.nextUrl.searchParams;
  if (p.get("id")) return detail(p.get("id")!);
  const traitees = p.get("etat") === "traitees";
  const st = (l: string[]) => (traitees ? { notIn: l } : { in: l });
  const N = traitees ? 60 : 200;
  const ent = { entreprise: { select: { id: true, nom: true } } };
  const [tk, hd, q, ds, dv, ep, er, rc, pr] = await Promise.all([
    prisma.ticket.findMany({ where: { statut: st(OUVERTS.tk), ...pasDemo }, include: { ...ent, _count: { select: { messages: true } } }, orderBy: { createdAt: "desc" }, take: N }),
    prisma.ticketSupport.findMany({ where: { statut: st(OUVERTS.tk), ...pasDemo }, include: { ...ent, _count: { select: { messages: true } } }, orderBy: { createdAt: "desc" }, take: N }),
    prisma.questionRH.findMany({ where: { statut: st(OUVERTS.q), ...pasDemo }, include: { ...ent, _count: { select: { messages: true } } }, orderBy: { createdAt: "desc" }, take: N }),
    prisma.demandeService.findMany({ where: { statut: st(OUVERTS.ds), ...pasDemo }, include: { ...ent, _count: { select: { messages: true } } }, orderBy: { createdAt: "desc" }, take: N }),
    prisma.devis.findMany({ where: { statut: st(OUVERTS.dv), ...pasDemo }, include: { ...ent, _count: { select: { messages: true } } }, orderBy: { createdAt: "desc" }, take: N }),
    prisma.demandeEvolutionPaie.findMany({ where: { statut: st(OUVERTS.ep), ...pasDemo }, include: { ...ent, nouvelleFormule: { select: { nom: true } }, ancienneFormule: { select: { nom: true } } }, orderBy: { createdAt: "desc" }, take: N }),
    traitees ? Promise.resolve([]) : prisma.demandeEvolution.findMany({ where: { statut: { in: OUVERTS.er }, ...pasDemo }, include: ent, orderBy: { createdAt: "desc" }, take: N }),
    prisma.demandeRecrutement.findMany({ where: { statut: st(OUVERTS.rc), ...pasDemo }, include: ent, orderBy: { createdAt: "desc" }, take: N }),
    prisma.commandePrestation.findMany({ where: { statut: st(OUVERTS.pr), ...pasDemo }, include: ent, orderBy: { createdAt: "desc" }, take: N }),
  ]);
  const abos = er.length ? await prisma.abonnement.findMany({ where: { id: { in: er.map((x) => x.abonnementId) } }, select: { id: true, nom: true } }) : [];
  const c = (e: { id: string; nom: string }) => ({ id: e.id, nom: e.nom });
  const demandes = [
    ...tk.map((x) => ({ id: `tk-${x.id}`, type: "TICKET", typeLabel: "Ticket RH", objet: x.titre, detail: court(x.description), client: c(x.entreprise), date: x.createdAt, statut: x.statut, messages: x._count.messages, repondre: true })),
    ...hd.map((x) => ({ id: `hd-${x.id}`, type: "SUPPORT", typeLabel: `Helpdesk (${String(x.categorie).toLowerCase()})`, objet: x.titre, detail: court(x.description), client: c(x.entreprise), date: x.createdAt, statut: x.statut, messages: x._count.messages, repondre: true })),
    ...q.map((x) => ({ id: `q-${x.id}`, type: "QUESTION_RH", typeLabel: "Demande RH ponctuelle", objet: x.sujet, detail: `Posée par ${x.auteur}`, client: c(x.entreprise), date: x.createdAt, statut: x.statut === "OUVERTE" ? "Ouverte" : x.statut === "REPONDUE" ? "Répondue" : "Close", messages: x._count.messages, repondre: true })),
    ...ds.map((x) => ({ id: `ds-${x.id}`, type: "SERVICE", typeLabel: LIBELLES_SERVICE[x.type] ?? "Demande de service", objet: [x.app, ...x.options].filter(Boolean).join(", ") || LIBELLES_SERVICE[x.type] || x.type, detail: court(x.message), client: c(x.entreprise), date: x.createdAt, statut: x.statut === "EN_ATTENTE" ? "En attente" : x.statut === "EN_COURS" ? "En cours" : "Traitée", messages: x._count.messages, repondre: true })),
    ...dv.map((x) => ({ id: `dv-${x.id}`, type: "DEVIS", typeLabel: "Demande de devis", objet: `Devis (${Math.round(x.totalIndicatif)} € indicatifs)`, detail: court(x.message), client: c(x.entreprise), date: x.createdAt, statut: x.statut === "EN_ATTENTE" ? "En attente" : x.statut, messages: x._count.messages, repondre: true })),
    ...ep.map((x) => ({ id: `ep-${x.id}`, type: "FORMULE_PAIE", typeLabel: "Changement de formule paie", objet: `${x.ancienneFormule?.nom ?? "Sans formule"} → ${x.nouvelleFormule.nom}`, detail: "", client: c(x.entreprise), date: x.createdAt, statut: x.statut === "EN_ATTENTE" ? "En attente" : x.statut === "VALIDEE" ? "Validée" : "Refusée", messages: 0, decider: x.statut === "EN_ATTENTE" })),
    ...er.map((x) => ({ id: `er-${x.id}`, type: "FORMULE_RH", typeLabel: "Changement de pack RH", objet: `Nouveau pack : ${abos.find((a) => a.id === x.abonnementId)?.nom ?? "?"}`, detail: court(x.message), client: c(x.entreprise), date: x.createdAt, statut: "En attente", messages: 0, decider: true })),
    ...rc.map((x) => ({ id: `rc-${x.id}`, type: "RECRUTEMENT", typeLabel: "Recrutement", objet: `${x.poste} (${x.typeContrat})`, detail: court(x.missions), client: c(x.entreprise), date: x.createdAt, statut: x.statut, messages: 0, etapes: ["Reçue", "En cours", "Contrat signé", "Terminé", "Annulé"] })),
    ...pr.map((x) => ({ id: `pr-${x.id}`, type: "PRESTATION", typeLabel: "Prestation commandée", objet: `${x.libelle}${x.quantite > 1 ? ` × ${x.quantite}` : ""}`, detail: [x.salarie ? `Salarié : ${x.salarie}` : "", x.auteur ? `par ${x.auteur}` : ""].filter(Boolean).join(" · "), client: c(x.entreprise), date: x.createdAt, statut: x.statut === "A_FAIRE" ? "À faire" : x.statut === "FAITE" ? "Faite" : "Annulée", messages: 0, etapes: ["À faire", "Faite", "Annulée"] })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());
  return NextResponse.json({ demandes });
}

/** Détail complet d'une demande : texte intégral et tous les messages */
async function detail(cle: string) {
  const [pre, ...r] = cle.split("-"); const id = r.join("-");
  const sel = { entreprise: { select: { id: true, nom: true, email: true, telephone: true } } };
  const msgs = { orderBy: { createdAt: "asc" as const }, select: { role: true, auteur: true, contenu: true, createdAt: true } };
  let d: Record<string, unknown> | null = null;
  if (pre === "tk") { const x = await prisma.ticket.findUnique({ where: { id }, include: { ...sel, messages: msgs } }); if (x) d = { objet: x.titre, texte: x.description, statut: x.statut, entreprise: x.entreprise, date: x.createdAt, fil: fil(x.messages) }; }
  if (pre === "hd") { const x = await prisma.ticketSupport.findUnique({ where: { id }, include: { ...sel, messages: msgs } }); if (x) d = { objet: x.titre, texte: x.description, statut: x.statut, entreprise: x.entreprise, date: x.createdAt, fil: fil(x.messages) }; }
  if (pre === "q") { const x = await prisma.questionRH.findUnique({ where: { id }, include: { ...sel, messages: msgs } }); if (x) d = { objet: x.sujet, texte: `Posée par ${x.auteur}`, statut: x.statut, entreprise: x.entreprise, date: x.createdAt, fil: fil(x.messages) }; }
  if (pre === "ds") { const x = await prisma.demandeService.findUnique({ where: { id }, include: { ...sel, messages: msgs } }); if (x) d = { objet: [LIBELLES_SERVICE[x.type] ?? x.type, x.app, ...x.options].filter(Boolean).join(" · "), texte: x.message ?? "", statut: x.statut, entreprise: x.entreprise, date: x.createdAt, fil: fil(x.messages) }; }
  if (pre === "dv") { const x = await prisma.devis.findUnique({ where: { id }, include: { ...sel, messages: msgs } }); if (x) d = { objet: `Devis (${Math.round(x.totalIndicatif)} € indicatifs)`, texte: [x.message, ...(Array.isArray(x.lignes) ? (x.lignes as { libelle?: string; quantite?: number }[]).map((l) => `• ${l.libelle ?? ""}${l.quantite ? ` × ${l.quantite}` : ""}`) : [])].filter(Boolean).join("\n"), statut: x.statut, entreprise: x.entreprise, date: x.createdAt, fil: fil(x.messages) }; }
  if (pre === "rc") { const x = await prisma.demandeRecrutement.findUnique({ where: { id }, include: sel }); if (x) d = { objet: `${x.poste} (${x.typeContrat})`, texte: x.missions, statut: x.statut, entreprise: x.entreprise, date: x.createdAt, fil: [] }; }
  if (pre === "pr") { const x = await prisma.commandePrestation.findUnique({ where: { id }, include: sel }); if (x) d = { objet: x.libelle, texte: [x.salarie ? `Salarié : ${x.salarie}` : "", x.auteur ? `Commandée par ${x.auteur}` : ""].filter(Boolean).join("\n"), statut: x.statut, entreprise: x.entreprise, date: x.createdAt, fil: [] }; }
  if (pre === "ep") { const x = await prisma.demandeEvolutionPaie.findUnique({ where: { id }, include: { ...sel, nouvelleFormule: { select: { nom: true, prixMensuel: true } }, ancienneFormule: { select: { nom: true, prixMensuel: true } } } }); if (x) d = { objet: `${x.ancienneFormule?.nom ?? "Sans formule"} → ${x.nouvelleFormule.nom}`, texte: `Nouvelle formule : ${x.nouvelleFormule.nom} (${x.nouvelleFormule.prixMensuel} €/mois)${x.ancienneFormule ? `\nFormule actuelle : ${x.ancienneFormule.nom} (${x.ancienneFormule.prixMensuel} €/mois)` : ""}`, statut: x.statut, entreprise: x.entreprise, date: x.createdAt, fil: [] }; }
  if (pre === "er") { const x = await prisma.demandeEvolution.findUnique({ where: { id }, include: sel }); if (x) { const a = await prisma.abonnement.findUnique({ where: { id: x.abonnementId }, select: { nom: true, prixMensuel: true } }); d = { objet: `Nouveau pack RH : ${a?.nom ?? "?"}`, texte: [a ? `${a.nom} (${a.prixMensuel} €/mois)` : "", x.message ?? ""].filter(Boolean).join("\n"), statut: x.statut, entreprise: x.entreprise, date: x.createdAt, fil: [] }; } }
  return d ? NextResponse.json({ demande: { id: cle, ...d } }) : NextResponse.json({ erreur: "Demande introuvable" }, { status: 404 });
}

/**
 * POST { id, action, message?, statut?, email } :
 * repondre / cloturer (tickets, helpdesk, questions, services, devis) · rouvrir · accepter / refuser (formules) · statut (recrutement, prestation)
 */
export async function POST(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const cle = String(b.id || ""); const [pre, ...r] = cle.split("-"); const id = r.join("-");
  const email = typeof b.email === "string" ? b.email : null;
  const ok = () => NextResponse.json({ succes: true });
  const viaRoute = async (chemin: string, methode: string, corps?: unknown) => {
    const x = await appelInterne(request, email, chemin, { methode, corps });
    const d = await x.json().catch(() => ({}));
    return x.ok ? ok() : NextResponse.json({ erreur: d?.erreur ?? `Refusé (${x.status})` }, { status: x.status });
  };

  if (b.action === "repondre" || b.action === "cloturer") {
    // Même traitement que la réponse rapide du portail (message signé FRANEO RH, e-mail au client, statut)
    const base = (process.env.HUB_URL_INTERNE || request.nextUrl.origin).replace(/\/$/, "");
    const x = await fetch(`${base}/api/hub/repondre`, { method: "POST", headers: { authorization: request.headers.get("authorization") || "", "Content-Type": "application/json" }, body: JSON.stringify({ id: cle, message: typeof b.message === "string" ? b.message : "", cloturer: b.action === "cloturer" || b.cloturer === true, auteur: b.auteur }), cache: "no-store" });
    const d = await x.json().catch(() => ({}));
    return x.ok ? ok() : NextResponse.json({ erreur: d?.erreur ?? `Refusé (${x.status})` }, { status: x.status });
  }
  if (b.action === "rouvrir") {
    if (pre === "tk") await prisma.ticket.update({ where: { id }, data: { statut: "En cours" } });
    else if (pre === "hd") await prisma.ticketSupport.update({ where: { id }, data: { statut: "En cours" } });
    else if (pre === "q") await prisma.questionRH.update({ where: { id }, data: { statut: "OUVERTE" } });
    else if (pre === "ds") await prisma.demandeService.update({ where: { id }, data: { statut: "EN_COURS", traiteeAt: null } });
    else return NextResponse.json({ erreur: "Cette demande ne se rouvre pas." }, { status: 400 });
    return ok();
  }
  if (b.action === "accepter" || b.action === "refuser") {
    const accepte = b.action === "accepter";
    if (pre === "ep") return viaRoute(`/api/demande-evolution-paie/${id}`, "PUT", { action: accepte ? "VALIDER" : "REFUSER" });
    if (pre === "er") {
      const x = await prisma.demandeEvolution.findUnique({ where: { id } });
      if (!x) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
      const rep = await viaRoute(`/api/demandes-evolution/${id}`, "PUT", { decision: accepte ? "Acceptée" : "Refusée", entrepriseId: x.entrepriseId, abonnementId: x.abonnementId });
      if (rep.ok) await journaliser(x.entrepriseId, "Portail admin", "Abonnement", `Changement de pack RH ${accepte ? "accepté" : "refusé"}`).catch(() => undefined);
      return rep;
    }
    return NextResponse.json({ erreur: "Pas de décision pour ce type de demande." }, { status: 400 });
  }
  if (b.action === "statut") {
    const s = String(b.statut || "");
    if (pre === "pr") { const v = ({ "À faire": "A_FAIRE", "Faite": "FAITE", "Annulée": "ANNULEE" } as Record<string, string>)[s]; if (!v) return NextResponse.json({ erreur: "Statut invalide" }, { status: 400 }); return viaRoute(`/api/prestations/${id}`, "PATCH", { statut: v }); }
    if (pre === "rc") { if (!["Reçue", "En cours", "Contrat signé", "Terminé", "Annulé"].includes(s)) return NextResponse.json({ erreur: "Statut invalide" }, { status: 400 }); return viaRoute(`/api/recrutement/${id}`, "PUT", { action: "statut", statut: s }); }
    return NextResponse.json({ erreur: "Statut non modifiable ici." }, { status: 400 });
  }
  return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
}
