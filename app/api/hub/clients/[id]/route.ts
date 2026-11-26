import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";
import { appelInterne } from "@/lib/hub-interne";
import { lignesFacture, totalLignes } from "@/lib/facturation";
import { MODULES } from "@/lib/droits";

export const dynamic = "force-dynamic";
const refus = () => NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
const masquer = (iban: string | null) => (iban ? `${iban.slice(0, 4)} •••• •••• ${iban.slice(-4)}` : null);

/** GET (portail) : fiche complète d'un client (infos, formules, modules, remises, comptes, factures) */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const { id } = await params;
  const e = await prisma.entreprise.findFirst({
    where: { id, demo: false },
    include: {
      abonnement: { select: { id: true, nom: true, prixMensuel: true } }, abonnementPaie: { select: { id: true, nom: true, prixMensuel: true } },
      cabinet: { select: { nom: true } }, remises: { orderBy: { createdAt: "desc" } },
      utilisateurs: { where: { role: { in: ["CLIENT", "SALARIE"] } }, select: { id: true, prenom: true, email: true, role: true, actif: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!e) return NextResponse.json({ erreur: "Client introuvable" }, { status: 404 });
  const now = new Date();
  const [packs, formules, factures, nbSalaries, lignes, parrain] = await Promise.all([
    prisma.abonnement.findMany({ select: { id: true, nom: true, prixMensuel: true }, orderBy: { prixMensuel: "asc" } }),
    prisma.abonnementPaie.findMany({ select: { id: true, nom: true, prixMensuel: true }, orderBy: { prixMensuel: "asc" } }),
    prisma.facturation.findMany({ where: { entrepriseId: id }, select: { id: true, mois: true, annee: true, montant: true, statut: true, relances: true }, orderBy: [{ annee: "desc" }, { mois: "desc" }], take: 12 }),
    prisma.salarie.count({ where: { entrepriseId: id, OR: [{ dateFin: null }, { dateFin: { gte: now } }] } }),
    lignesFacture(id, now.getMonth() + 1, now.getFullYear()).catch(() => null),
    e.parrainId ? prisma.entreprise.findUnique({ where: { id: e.parrainId }, select: { nom: true } }) : Promise.resolve(null),
  ]);
  return NextResponse.json({
    client: {
      id: e.id, nom: e.nom, siret: e.siret, email: e.email, telephone: e.telephone, siteWeb: e.siteWeb, rue: e.rue, codePostal: e.codePostal, ville: e.ville, pays: e.pays,
      banque: e.banque, iban: masquer(e.iban), bic: e.bic, actif: e.actif, motif: e.motifSuspension, dateSuspension: e.dateSuspension, creeLe: e.createdAt,
      codeParrainage: e.codeParrainage, parrain: parrain?.nom ?? null, remisePct: e.remisePct, cabinet: e.cabinet?.nom ?? null,
      mandat: e.mandatStatut, dateDebutContrat: e.dateDebutContrat,
      packRH: e.abonnement, formulePaie: e.abonnementPaie, salaries: nbSalaries,
      modules: MODULES.map((m) => ({ id: m.id, label: m.label, actif: e.permissions.includes(m.id) })),
      remises: e.remises.map((r) => ({ id: r.id, libelle: r.libelle, motif: r.motif, type: r.type, valeur: r.valeur, portee: r.portee, debut: `${String(r.moisDebut).padStart(2, "0")}/${r.anneeDebut}`, nbMois: r.nbMois })),
      comptes: e.utilisateurs, factures,
      factureMois: lignes ? { lignes: lignes.map((l) => ({ libelle: l.libelle, quantite: l.quantite, total: l.total })), total: totalLignes(lignes) } : null,
    },
    catalogue: { packs, formules },
  });
}

/**
 * POST (portail) { action, email, ... } : modification d'un client par les routes admin existantes (mêmes règles, même journal).
 * actions : infos, formules, modules, statut, remise.ajouter, remise.supprimer, supprimer
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const { id } = await params;
  const b = await request.json().catch(() => ({}));
  const email = typeof b.email === "string" ? b.email : null;
  const e = await prisma.entreprise.findFirst({ where: { id, demo: false } });
  if (!e) return NextResponse.json({ erreur: "Client introuvable" }, { status: 404 });
  const base = `/api/entreprises/${id}`;
  const t = (v: unknown, n = 200) => (typeof v === "string" ? v.trim().slice(0, n) : undefined);
  let appel: { chemin: string; methode: string; corps?: unknown } | null = null;

  switch (b.action) {
    case "infos": {
      // La route attend la fiche complète : on part des valeurs actuelles et on remplace ce qui est envoyé
      const champs = ["nom", "siret", "email", "telephone", "siteWeb", "rue", "codePostal", "ville", "pays", "banque", "bic"] as const;
      const corps: Record<string, unknown> = { abonnementId: e.abonnementId, iban: e.iban };
      for (const c of champs) corps[c] = (c === "email" ? t(b.email_client) : t(b[c])) ?? e[c];
      if (!corps.nom) return NextResponse.json({ erreur: "Le nom est obligatoire." }, { status: 400 });
      if (typeof b.iban === "string" && b.iban.trim() && !b.iban.includes("•")) corps.iban = b.iban.replace(/\s/g, "").toUpperCase();
      if ("remisePct" in b) corps.remisePct = b.remisePct;
      if ("codeParrainage" in b) corps.codeParrainage = b.codeParrainage;
      appel = { chemin: base, methode: "PUT", corps };
      break;
    }
    case "formules": appel = { chemin: `${base}/abonnements`, methode: "PUT", corps: { abonnementId: b.abonnementId || null, abonnementPaieId: b.abonnementPaieId || null, prevenir: b.prevenir !== false } }; break;
    case "modules": {
      const ids = new Set(Array.isArray(b.modules) ? b.modules.map(String) : []);
      const garder = e.permissions.filter((p) => !/^[a-z-]+$/.test(p) || p.startsWith("-") || p.startsWith("@"));
      appel = { chemin: `${base}/permissions`, methode: "PUT", corps: { permissions: [...garder, ...ids] } };
      break;
    }
    case "statut": appel = { chemin: `${base}/statut`, methode: "PUT", corps: { actif: !!b.actif, motif: t(b.motif, 300) } }; break;
    case "remise.ajouter": appel = { chemin: `${base}/remises`, methode: "POST", corps: { libelle: b.libelle, motif: b.motif, type: b.type, valeur: b.valeur, portee: b.portee, debut: b.debut, nbMois: b.nbMois } }; break;
    case "remise.supprimer": appel = { chemin: `${base}/remises?remiseId=${encodeURIComponent(String(b.remiseId || ""))}`, methode: "DELETE" }; break;
    case "supprimer": appel = { chemin: base, methode: "DELETE" }; break;
  }
  if (!appel) return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
  const r = await appelInterne(request, email, appel.chemin, { methode: appel.methode, corps: appel.corps });
  const d = await r.json().catch(() => ({}));
  return NextResponse.json(r.ok ? { succes: true, ...d } : { erreur: d?.erreur ?? `Refusé (${r.status})` }, { status: r.ok ? 200 : r.status });
}
