import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifierAdmin } from "@/lib/notifications";
import { BESOINS } from "@/lib/inscriptions";
import { estBloque, ipDe, noterEchec } from "@/lib/securite";

// Limite : 5 demandes par adresse IP et par heure, comptées en base (valable sur tous les serveurs Vercel)
const MAX_ENVOIS = 5;
const FENETRE_MS = 3600_000;

// POST (public) : demande d'inscription ou de contact depuis la démo ou la page de connexion
export async function POST(request: NextRequest) {
  const b = await request.json().catch(() => ({}));
  if (b.siteWeb) return NextResponse.json({ succes: true }); // champ piège anti-robots
  const cle = `inscription:ip:${ipDe(request)}`;
  if (await estBloque(cle, MAX_ENVOIS, FENETRE_MS)) return NextResponse.json({ erreur: "Trop de demandes, réessayez plus tard." }, { status: 429 });

  const t = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const societe = t(b.societe), prenom = t(b.prenom, 80), nom = t(b.nom, 80), email = t(b.email, 160).toLowerCase();
  if (!societe || !prenom || !nom || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ erreur: "Société, prénom, nom et un email valide sont obligatoires." }, { status: 400 });
  }
  const besoins = Array.isArray(b.besoins) ? b.besoins.filter((x: unknown) => (BESOINS as readonly string[]).includes(String(x))) : [];
  const type = b.type === "CONTACT" ? "CONTACT" : "INSCRIPTION";
  const demande = await prisma.demandeInscription.create({
    data: { societe, prenom, nom, email, telephone: t(b.telephone, 30) || null, effectif: t(b.effectif, 30) || null, besoins, message: t(b.message, 2000) || null, type },
  });
  await noterEchec(cle, MAX_ENVOIS, FENETRE_MS);

  const session = await getSession().catch(() => null);
  await notifierAdmin({
    sujet: `${type === "CONTACT" ? "Demande de contact" : "Demande d'inscription"} — ${societe}`,
    titre: type === "CONTACT" ? "✉️ Nouvelle demande de contact" : "🆕 Nouvelle demande d'inscription",
    lignes: [
      `${prenom} ${nom} · ${email}${demande.telephone ? ` · ${demande.telephone}` : ""}`,
      `Société : ${societe}${demande.effectif ? ` (${demande.effectif} salariés)` : ""}`,
      ...(besoins.length ? [`Besoins : ${besoins.join(", ")}`] : []),
      ...(demande.message ? [`Message : ${demande.message}`] : []),
      ...(session?.entreprise?.demo ? ["Envoyée depuis la démo"] : []),
    ],
    lien: "/admin/entreprises/nouveaux-clients",
  });
  return NextResponse.json({ succes: true });
}

// GET (admin) : liste des demandes
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const statut = request.nextUrl.searchParams.get("statut");
  const demandes = await prisma.demandeInscription.findMany({ where: statut ? { statut } : {}, orderBy: { createdAt: "desc" }, take: 300 });
  return NextResponse.json(demandes);
}
