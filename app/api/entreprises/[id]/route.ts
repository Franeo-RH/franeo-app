import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { normaliserCode } from "@/lib/parrainage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const entreprise = await prisma.entreprise.findUnique({ where: { id } });
  if (!entreprise) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });

  return NextResponse.json(entreprise);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const data = await request.json();

  // Code de parrainage : unique (insensible à la casse)
  const code = "codeParrainage" in data ? normaliserCode(typeof data.codeParrainage === "string" ? data.codeParrainage : "") : undefined;
  if (code) {
    const pris = await prisma.entreprise.findFirst({ where: { codeParrainage: { equals: code, mode: "insensitive" }, id: { not: id } }, select: { nom: true } });
    if (pris) return NextResponse.json({ erreur: `Le code ${code} est déjà utilisé par ${pris.nom}.` }, { status: 409 });
  }

  const entreprise = await prisma.entreprise.update({
    where: { id },
    data: {
      nom: data.nom,
      siret: data.siret || null,
      email: data.email || null,
      telephone: data.telephone || null,
      siteWeb: data.siteWeb || null,
      rue: data.rue || null,
      codePostal: data.codePostal || null,
      ville: data.ville || null,
      pays: data.pays || null,
      banque: data.banque || null,
      iban: data.iban || null,
      bic: data.bic || null,
      abonnementId: data.abonnementId || null,
      // Suivi commercial : remise permanente appliquée sur chaque facture (abonnements et options)
      ...("remisePct" in data ? { remisePct: (() => { const n = parseFloat(String(data.remisePct ?? "").replace(",", ".")); return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null; })() } : {}),
      ...(code !== undefined ? { codeParrainage: code || null } : {}),
      ...("dateDebutContrat" in data ? { dateDebutContrat: /^\d{4}-\d{2}-\d{2}$/.test(String(data.dateDebutContrat)) ? new Date(`${data.dateDebutContrat}T12:00:00`) : null } : {}),
    },
  });

  return NextResponse.json({ succes: true, entreprise });
}

// Suppression DÉFINITIVE : l'entreprise et toutes ses données liées
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  const entreprise = await prisma.entreprise.findUnique({ where: { id } });
  if (!entreprise) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  if (entreprise.demo) {
    return NextResponse.json({ erreur: "L'entreprise de démonstration ne peut pas être supprimée." }, { status: 400 });
  }

  try {
    const utilisateurs = await prisma.utilisateur.findMany({ where: { entrepriseId: id }, select: { id: true } });
    const userIds = utilisateurs.map((u) => u.id);

    // Contexte Buddy (selon le schéma) : on tente, sans bloquer si le modèle diffère
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).buddyContexte?.deleteMany({ where: { utilisateurId: { in: userIds } } });
    } catch {}

    await prisma.$transaction([
      prisma.variablePaie.deleteMany({ where: { entrepriseId: id } }),
      prisma.absence.deleteMany({ where: { entrepriseId: id } }),
      prisma.ticket.deleteMany({ where: { entrepriseId: id } }),
      prisma.ticketSupport.deleteMany({ where: { entrepriseId: id } }),
      prisma.facturation.deleteMany({ where: { entrepriseId: id } }),
      prisma.demandeRecrutement.deleteMany({ where: { entrepriseId: id } }),
      prisma.demandeEvolution.deleteMany({ where: { entrepriseId: id } }),
      prisma.demandeEvolutionPaie.deleteMany({ where: { entrepriseId: id } }),
      prisma.salarie.deleteMany({ where: { entrepriseId: id } }),
      prisma.utilisateur.deleteMany({ where: { entrepriseId: id } }),
      prisma.entreprise.delete({ where: { id } }),
    ]);
  } catch (e) {
    console.error("Suppression entreprise :", e);
    return NextResponse.json(
      { erreur: "Suppression impossible : des données liées bloquent encore. Vous pouvez suspendre l'entreprise à la place." },
      { status: 409 }
    );
  }

  return NextResponse.json({ succes: true });
}
