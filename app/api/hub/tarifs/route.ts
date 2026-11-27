import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";
import { appelInterne } from "@/lib/hub-interne";
import { textesModifies, texteRH, textePaie, texteMention, cleRH, clePaie, CLE_MENTION } from "@/lib/textes-formules";

export const dynamic = "force-dynamic";

/** GET (portail) : formules RH et paie avec leurs prix et leurs textes, et la mention affichée aux clients */
export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const [rh, paie, modifs, nbRH, nbPaie] = await Promise.all([
    prisma.abonnement.findMany({ orderBy: { prixMensuel: "asc" } }),
    prisma.abonnementPaie.findMany({ orderBy: { prixMensuel: "asc" } }),
    textesModifies(),
    prisma.entreprise.groupBy({ by: ["abonnementId"], _count: true }),
    prisma.entreprise.groupBy({ by: ["abonnementPaieId"], _count: true }),
  ]);
  const mention = texteMention(modifs);
  return NextResponse.json({
    groupes: [
      { id: "rh", titre: "Formules RH", offres: rh.map((f) => { const t = texteRH(modifs, f); return {
        id: f.id, nom: f.nom, clients: nbRH.find((x) => x.abonnementId === f.id)?._count ?? 0,
        champs: [{ cle: "nom", label: "Nom", type: "texte", valeur: f.nom }, { cle: "prixMensuel", label: "Prix par mois", type: "euro", valeur: f.prixMensuel }, { cle: "inclus", label: "Salariés inclus", type: "nombre", valeur: f.salariesInclus }, { cle: "prixSupp", label: "Par salarié en plus", type: "euro", valeur: f.prixSalarieSupp }, { cle: "tickets", label: "Tickets RH inclus / mois", type: "nombre", valeur: f.ticketsRH }, { cle: "prixTicket", label: "Ticket RH en plus", type: "euro", valeur: f.prixTicketSupp }],
        texte: { cle: cleRH(f.nom), message: t.message, lignes: t.lignes, modifie: t.modifie } }; }) },
      { id: "paie", titre: "Formules paie", offres: paie.map((f) => { const t = textePaie(modifs, f.code); return {
        id: f.id, nom: `Paie ${f.nom}`, couleur: f.couleur, clients: nbPaie.find((x) => x.abonnementPaieId === f.id)?._count ?? 0,
        champs: [{ cle: "nom", label: "Nom", type: "texte", valeur: f.nom }, { cle: "prixMensuel", label: "Prix par mois", type: "euro", valeur: f.prixMensuel }, { cle: "inclus", label: "Bulletins inclus", type: "nombre", valeur: f.bulletinsInclus }, { cle: "prixSupp", label: "Par bulletin en plus", type: "euro", valeur: f.prixBulletinSupp }, { cle: "prixTicket", label: "Ticket RH en plus", type: "euro", valeur: f.prixTicketSupp }],
        texte: { cle: clePaie(f.code), message: t.message, lignes: t.lignes, modifie: t.modifie } }; }) },
    ],
    mentions: [{ cle: CLE_MENTION, label: "Mention affichée sous les formules", texte: mention.message }],
    note: "Une nouvelle formule RH se crée dans l'admin de l'app. Un changement de prix s'applique aux prochaines factures.",
  });
}

/** POST (portail) : offre { groupe: rh|paie, id, valeurs } · texte { cle, message, lignes } · texte.defaut { cle } · mention { cle, texte } */
export async function POST(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const email = typeof b.email === "string" ? b.email : null;
  const appel = async (chemin: string, methode: string, corps?: unknown) => { const r = await appelInterne(request, email, chemin, { methode, corps }); const d = await r.json().catch(() => ({})); return NextResponse.json(r.ok ? { succes: true } : { erreur: d?.erreur ?? `Refusé (${r.status})` }, { status: r.ok ? 200 : r.status }); };
  const v = (b.valeurs ?? {}) as Record<string, unknown>;
  switch (b.action) {
    case "offre": return appel("/api/admin/formules", "PUT", { type: b.groupe === "paie" ? "paie" : "rh", id: String(b.id ?? ""), nom: v.nom, prixMensuel: v.prixMensuel, inclus: v.inclus, prixSupp: v.prixSupp, tickets: v.tickets ?? 0, prixTicket: v.prixTicket });
    case "texte": return appel("/api/admin/textes-formules", "PUT", { cle: b.cle, message: b.message, lignes: b.lignes });
    case "texte.defaut": return appel(`/api/admin/textes-formules?cle=${encodeURIComponent(String(b.cle ?? ""))}`, "DELETE");
    case "mention": return appel("/api/admin/textes-formules", "PUT", { cle: CLE_MENTION, message: b.texte, lignes: [] });
  }
  return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
}
