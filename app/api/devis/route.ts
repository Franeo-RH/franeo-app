import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifierAdmin } from "@/lib/notifications";
import { OFFRES } from "@/lib/catalogue";

// GET : devis du client (ou tous pour l'admin, filtrables par ?entrepriseId=&statut=)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const p = request.nextUrl.searchParams;
  const devis = await prisma.devis.findMany({
    where: {
      ...(session.role === "ADMIN" ? (p.get("entrepriseId") ? { entrepriseId: p.get("entrepriseId")! } : { entreprise: { demo: false } }) : { entrepriseId: session.entrepriseId ?? "-" }),
      ...(p.get("statut") ? { statut: p.get("statut")! } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { entreprise: { select: { nom: true } }, messages: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json(devis);
}

// POST (client) { lignes: [{ code, quantite, precision? }], message? }
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const corps = await request.json().catch(() => ({}));
  const brutes: unknown[] = Array.isArray(corps?.lignes) ? corps.lignes.slice(0, 50) : [];
  const lignes = [];
  for (const b of brutes) {
    const x = b as Record<string, unknown>;
    const o = OFFRES.find((y) => y.code === x.code);
    if (!o) continue;
    const quantite = Math.min(Math.max(Math.round(Number(x.quantite) || 1), 1), 999);
    lignes.push({
      code: o.code,
      libelle: o.libelle,
      famille: o.famille,
      quantite,
      prix: o.prix,
      apartir: !!o.apartir,
      total: o.prix === null ? null : o.prix * quantite,
      precision: typeof x.precision === "string" ? x.precision.trim().slice(0, 300) : "",
    });
  }
  const message = typeof corps?.message === "string" ? corps.message.trim().slice(0, 2000) : "";
  if (lignes.length === 0 && !message) return NextResponse.json({ erreur: "Ajoutez au moins une prestation ou décrivez votre besoin." }, { status: 400 });

  const totalIndicatif = lignes.reduce((a, l) => a + (l.total ?? 0), 0);
  const devis = await prisma.devis.create({
    data: { entrepriseId: session.entrepriseId, lignes, totalIndicatif, message: message || null, auteur: `${session.prenom} (${session.email})` },
    include: { entreprise: { select: { nom: true } } },
  });

  await notifierAdmin({
    sujet: `Demande de devis — ${devis.entreprise.nom}`,
    titre: "🧾 Nouvelle demande de devis",
    lignes: [
      `Entreprise : ${devis.entreprise.nom}`,
      ...lignes.map((l) => `• ${l.libelle} × ${l.quantite}${l.total !== null ? ` (${l.apartir ? "dès " : ""}${l.total} €)` : " (sur devis)"}`),
      ...(message ? [`Message : ${message}`] : []),
      `Total indicatif : ${totalIndicatif} €`,
    ],
    lien: "/admin/entreprises/devis",
    entrepriseId: session.entrepriseId,
  });

  return NextResponse.json({ succes: true, devis });
}
