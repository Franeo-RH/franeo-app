import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { destinataireN1 } from "@/lib/hierarchie";
import { notifierAdmin } from "@/lib/notifications";

/**
 * POST :
 *  { contenu } : répondre ;
 *  { rerouter: "N+1" | "FRANEO" } : le destinataire transfère la question à son propre N+1 ou à FRANEO RH ;
 *  { statut: "CLOSE" | "OUVERTE" } : clore / rouvrir.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  if (!aDroit(s.utilisateur.entreprise?.permissions, "espace.questions")) return NextResponse.json({ erreur: "Les questions ne sont pas activées par votre employeur." }, { status: 403 });
  const { id } = await params;
  const q = await prisma.questionInterne.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  if (!q || (q.auteurId !== s.salarie.id && q.destinataireId !== s.salarie.id)) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const moi = `${s.salarie.prenom} ${s.salarie.nom}`;
  const corps = await request.json().catch(() => ({}));

  if (corps?.statut === "CLOSE" || corps?.statut === "OUVERTE") {
    await prisma.questionInterne.update({ where: { id }, data: { statut: corps.statut } });
    return NextResponse.json({ succes: true });
  }

  if (corps?.rerouter === "N+1" || corps?.rerouter === "FRANEO") {
    if (q.destinataireId !== s.salarie.id) return NextResponse.json({ erreur: "Seul le destinataire peut transférer la question." }, { status: 403 });
    if (corps.rerouter === "N+1") {
      const n1 = await destinataireN1(s.salarie.id);
      if (!n1 || n1 === s.salarie.id) return NextResponse.json({ erreur: "Vous n'avez pas de N+1 : transférez à FRANEO RH." }, { status: 400 });
      await prisma.questionInterne.update({ where: { id }, data: { destinataireId: n1, messages: { create: { auteur: moi, contenu: "↪️ Question transférée à mon N+1." } } } });
      return NextResponse.json({ succes: true });
    }
    // Vers FRANEO RH : une demande RH ponctuelle est ouverte pour l'entreprise avec tout l'échange
    const ent = await prisma.entreprise.findUnique({ where: { id: q.entrepriseId }, select: { nom: true } });
    const fil = q.messages.map((m) => `${m.auteur} : ${m.contenu}`).join("\n\n");
    await prisma.questionRH.create({
      data: {
        entrepriseId: q.entrepriseId, sujet: `[Salarié] ${q.sujet}`.slice(0, 120), auteur: moi,
        messages: { create: { role: "CLIENT", auteur: moi, contenu: `Question transférée par ${moi} (espace salarié) :\n\n${fil}`.slice(0, 3000) } },
      },
    });
    await prisma.questionInterne.update({ where: { id }, data: { versFraneo: true, messages: { create: { auteur: moi, contenu: "↪️ Question transférée à FRANEO RH. La réponse vous sera communiquée." } } } });
    await notifierAdmin({ sujet: `Question transférée — ${ent?.nom ?? ""}`, titre: "💬 Question d'un salarié transférée", lignes: [`${moi} : ${q.sujet}`], lien: "/admin/tickets/questions", entrepriseId: q.entrepriseId });
    return NextResponse.json({ succes: true });
  }

  const contenu = typeof corps?.contenu === "string" ? corps.contenu.trim() : "";
  if (!contenu) return NextResponse.json({ erreur: "Message vide" }, { status: 400 });
  await prisma.questionInterne.update({
    where: { id },
    data: { statut: q.auteurId === s.salarie.id ? "OUVERTE" : "REPONDUE", messages: { create: { auteur: moi, contenu: contenu.slice(0, 3000) } } },
  });
  return NextResponse.json({ succes: true });
}
