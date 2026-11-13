import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";
import { notifierClients } from "@/lib/notifications";
import { fmtH, joursDuMois, jourUTC, lireHeures, NOMS_MOIS } from "@/lib/heures";
import { chargerReleve, lireMoisAnnee } from "@/lib/releves";
import { aDroit } from "@/lib/droits";
import { lireRepartition, projetCouvreJour, projetsPourReleve, synchroniserTempsReleve, type PartProjet } from "@/lib/releves-projets";

const MODIFIABLE = ["Brouillon", "Refusé"];

// GET ?mois=&annee= : relevé du mois (jours saisis + absences)
export async function GET(request: NextRequest) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  if (!aDroit(s.utilisateur.entreprise?.permissions, "espace.heures")) return NextResponse.json({ erreur: "Fonction non activée par votre employeur." }, { status: 403 });
  const p = request.nextUrl.searchParams;
  const ma = lireMoisAnnee(p.get("mois"), p.get("annee"));
  if (!ma) return NextResponse.json({ erreur: "Mois invalide" }, { status: 400 });
  // Option Projets : liste des projets du mois pour choisir le projet de chaque journée
  const avecProjets = aDroit(s.utilisateur.entreprise?.permissions, "espace.projets");
  const [releve, projets] = await Promise.all([
    chargerReleve(s.salarie.id, ma.mois, ma.annee),
    avecProjets ? projetsPourReleve(s.utilisateur.entrepriseId!, s.salarie.id, ma.mois, ma.annee) : Promise.resolve([]),
  ]);
  return NextResponse.json({ ...releve, projets });
}

/**
 * PUT { mois, annee, jours: [{ date, heures, heuresSupp, commentaire }], envoyer?: boolean }
 * Enregistre le brouillon du mois (remplace toutes les lignes). Avec envoyer=true, le relevé est
 * transmis à l'employeur et n'est plus modifiable.
 */
export async function PUT(request: NextRequest) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  if (!aDroit(s.utilisateur.entreprise?.permissions, "espace.heures")) return NextResponse.json({ erreur: "Fonction non activée par votre employeur." }, { status: 403 });
  const corps = await request.json().catch(() => ({}));
  const ma = lireMoisAnnee(corps?.mois, corps?.annee);
  if (!ma) return NextResponse.json({ erreur: "Mois invalide" }, { status: 400 });
  const { mois, annee } = ma;

  const existant = await prisma.releveMois.findUnique({ where: { salarieId_annee_mois: { salarieId: s.salarie.id, annee, mois } } });
  if (existant && !MODIFIABLE.includes(existant.statut)) {
    return NextResponse.json({ erreur: "Ce relevé a déjà été envoyé : il n'est plus modifiable." }, { status: 400 });
  }

  const joursValides = new Set(joursDuMois(mois, annee));
  const avecProjets = aDroit(s.utilisateur.entreprise?.permissions, "espace.projets");
  // Seuls les projets où le salarié est affecté, et seulement les jours de son affectation
  const projetsDuMois = avecProjets ? await projetsPourReleve(s.utilisateur.entrepriseId!, s.salarie.id, mois, annee) : [];
  const lignes: { date: Date; heures: number | null; heuresSupp: number; commentaire: string | null; teletravail: boolean; projets?: PartProjet[] }[] = [];
  for (const brut of Array.isArray(corps?.jours) ? corps.jours.slice(0, 31) : []) {
    const j = brut as Record<string, unknown>;
    const iso = String(j.date ?? "");
    const date = jourUTC(iso);
    if (!date || !joursValides.has(iso)) return NextResponse.json({ erreur: "Un jour ne fait pas partie du mois." }, { status: 400 });
    const heures = lireHeures(j.heures);
    const supp = lireHeures(j.heuresSupp) ?? 0;
    if (Number.isNaN(heures) || Number.isNaN(supp)) {
      return NextResponse.json({ erreur: `Heures invalides le ${date.toLocaleDateString("fr-FR", { timeZone: "UTC" })} (ex : 7, 7,5 ou 7h30).` }, { status: 400 });
    }
    const commentaire = typeof j.commentaire === "string" && j.commentaire.trim() ? j.commentaire.trim().slice(0, 300) : null;
    const teletravail = j.teletravail === true;
    if (heures === null && supp === 0 && !commentaire && !teletravail) continue;
    const projets = avecProjets ? lireRepartition(j.projets, new Set(projetsDuMois.filter((p) => projetCouvreJour(p, iso)).map((p) => p.id))) : [];
    const reparties = projets.reduce((t, p) => t + (p.heures ?? 0), 0);
    if (heures !== null && reparties > heures + 0.01) {
      return NextResponse.json({ erreur: `Le ${date.toLocaleDateString("fr-FR", { timeZone: "UTC" })}, les heures réparties sur les projets (${fmtH(reparties)}) dépassent les heures de la journée (${fmtH(heures)}).` }, { status: 400 });
    }
    lignes.push({ date, heures, heuresSupp: supp, commentaire, teletravail, ...(projets.length ? { projets } : {}) });
  }

  const envoyer = corps?.envoyer === true;
  const commentaire = typeof corps?.commentaire === "string" && corps.commentaire.trim() ? corps.commentaire.trim().slice(0, 1000) : null;
  if (envoyer && lignes.length === 0) return NextResponse.json({ erreur: "Le relevé est vide : saisissez au moins un jour avant de l'envoyer." }, { status: 400 });

  const entrepriseId = s.utilisateur.entrepriseId!;
  const releve = await prisma.$transaction(async (tx) => {
    const r = await tx.releveMois.upsert({
      where: { salarieId_annee_mois: { salarieId: s.salarie.id, annee, mois } },
      create: { salarieId: s.salarie.id, entrepriseId, mois, annee },
      update: {},
    });
    await tx.releveJour.deleteMany({ where: { releveId: r.id } });
    if (lignes.length) await tx.releveJour.createMany({ data: lignes.map((l) => ({ ...l, releveId: r.id })) });
    return tx.releveMois.update({
      where: { id: r.id },
      data: envoyer ? { statut: "Envoyé", envoyeAt: new Date(), motifRefus: null, commentaire } : { statut: "Brouillon", commentaire },
    });
  });

  // Les heures réparties sur les projets deviennent des temps passés (option Projets)
  if (avecProjets) await synchroniserTempsReleve(releve.id);

  if (envoyer) {
    const totH = lignes.reduce((a, l) => a + (l.heures || 0), 0);
    const totS = lignes.reduce((a, l) => a + l.heuresSupp, 0);
    await notifierClients(entrepriseId, {
      sujet: `Relevé d'heures de ${s.salarie.prenom} ${s.salarie.nom} — ${NOMS_MOIS[mois - 1]} ${annee}`,
      titre: "⏱️ Relevé d'heures à valider",
      lignes: [
        `${s.salarie.prenom} ${s.salarie.nom} a envoyé son relevé de ${NOMS_MOIS[mois - 1]} ${annee}.`,
        `Total : ${fmtH(totH)}${totS > 0 ? `, dont ${fmtH(totS)} supplémentaire(s)` : ""}.`,
      ],
      lien: "/client/salaries/releves",
    });
  }

  return NextResponse.json({
    succes: true,
    statut: releve.statut,
    message: envoyer ? "📤 Relevé envoyé à votre employeur. Il n'est plus modifiable." : "💾 Brouillon enregistré. Vous pouvez continuer plus tard.",
  });
}
