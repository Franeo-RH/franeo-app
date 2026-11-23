import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";
import { notifierClients } from "@/lib/notifications";
import { journaliser } from "@/lib/journal";

export const dynamic = "force-dynamic";

/**
 * POST (portail admin FRANEO) { id: "tk-…" | "hd-…" | "q-…" | "ds-…" | "dv-…", message, cloturer?, auteur? }
 * Répond au client depuis le portail : message signé « FRANEO RH », e-mail au client, statut mis à jour.
 */
export async function POST(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const [prefixe, ...reste] = String(b.id || "").split("-");
  const id = reste.join("-");
  const contenu = typeof b.message === "string" ? b.message.trim().slice(0, 5000) : "";
  const cloturer = b.cloturer === true;
  const auteurPortail = typeof b.auteur === "string" ? b.auteur.slice(0, 80) : "Portail admin";
  if (!id || (!contenu && !cloturer)) return NextResponse.json({ erreur: "Message vide" }, { status: 400 });
  const extrait = contenu.length > 300 ? `${contenu.slice(0, 297)}…` : contenu;
  const auteur = "FRANEO RH";

  if (prefixe === "tk" || prefixe === "hd") {
    const support = prefixe === "hd";
    const t = support ? await prisma.ticketSupport.findUnique({ where: { id }, select: { entrepriseId: true, titre: true } }) : await prisma.ticket.findUnique({ where: { id }, select: { entrepriseId: true, titre: true } });
    if (!t) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
    if (contenu) {
      if (support) await prisma.messageTicketSupport.create({ data: { contenu, auteur, role: "ADMIN", ticketId: id } });
      else await prisma.messageTicket.create({ data: { contenu, auteur, role: "ADMIN", ticketId: id } });
    }
    const statut = cloturer ? "Clôturé" : "En cours";
    if (support) await prisma.ticketSupport.update({ where: { id }, data: { statut } });
    else await prisma.ticket.update({ where: { id }, data: { statut } });
    const lien = support ? `/client/helpdesk/${id}` : `/client/tickets/${id}`;
    if (contenu) await notifierClients(t.entrepriseId, { sujet: `Réponse à votre ${support ? "demande d'assistance" : "ticket"} : ${t.titre}`, titre: "💬 Réponse de FRANEO RH", lignes: [extrait, ...(cloturer ? ["La demande est maintenant clôturée."] : [])], lien });
    await journaliser(t.entrepriseId, `${auteurPortail} (portail)`, support ? "Support" : "Ticket", `${contenu ? "Réponse" : "Clôture"} : ${t.titre}${cloturer ? " (clôturé)" : ""}`);
    return NextResponse.json({ succes: true });
  }
  if (prefixe === "q") {
    const q = await prisma.questionRH.findUnique({ where: { id }, select: { entrepriseId: true, sujet: true } });
    if (!q) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
    if (contenu) await prisma.messageQuestionRH.create({ data: { questionId: id, role: "ADMIN", auteur, contenu } });
    await prisma.questionRH.update({ where: { id }, data: { statut: cloturer ? "CLOSE" : "REPONDUE" } });
    if (contenu) await notifierClients(q.entrepriseId, { sujet: `Réponse à votre demande : ${q.sujet}`, titre: "💬 Réponse de FRANEO RH", lignes: [extrait], lien: "/client/tickets/questions" });
    await journaliser(q.entrepriseId, `${auteurPortail} (portail)`, "Question RH", `${contenu ? "Réponse" : "Clôture"} : ${q.sujet}`);
    return NextResponse.json({ succes: true });
  }
  if (prefixe === "ds") {
    const d = await prisma.demandeService.findUnique({ where: { id }, select: { entrepriseId: true, type: true } });
    if (!d) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
    if (contenu) await prisma.messageDemandeService.create({ data: { demandeId: id, role: "ADMIN", auteur, contenu } });
    await prisma.demandeService.update({ where: { id }, data: { statut: cloturer ? "TRAITEE" : "EN_COURS", ...(cloturer ? { traiteeAt: new Date() } : {}) } });
    const lien = d.type === "LIVRET" ? "/client/salaries/livret-accueil" : "/client/entreprise/devis";
    if (contenu) await notifierClients(d.entrepriseId, { sujet: "Nouveau message sur votre demande", titre: "💬 Message de FRANEO RH", lignes: [extrait], lien });
    await journaliser(d.entrepriseId, `${auteurPortail} (portail)`, "Demande", `${contenu ? "Message" : "Traitée"}${cloturer ? " (traitée)" : ""}`);
    return NextResponse.json({ succes: true });
  }
  if (prefixe === "dv") {
    const d = await prisma.devis.findUnique({ where: { id }, select: { entrepriseId: true } });
    if (!d) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
    if (!contenu) return NextResponse.json({ erreur: "Pour un devis, proposez le montant dans l'admin de l'app." }, { status: 400 });
    await prisma.messageDevis.create({ data: { devisId: id, role: "ADMIN", auteur, contenu } });
    await notifierClients(d.entrepriseId, { sujet: "Nouveau message sur votre demande de devis", titre: "💬 Message de FRANEO RH", lignes: [extrait], lien: "/client/entreprise/devis" });
    await journaliser(d.entrepriseId, `${auteurPortail} (portail)`, "Devis", "Message envoyé");
    return NextResponse.json({ succes: true });
  }
  return NextResponse.json({ erreur: "Cette demande se traite dans l'admin de l'app." }, { status: 400 });
}
