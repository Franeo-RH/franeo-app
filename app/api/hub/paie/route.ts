import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";
import { appelInterne, appelInterneFormulaire } from "@/lib/hub-interne";
import { LIBELLES_ABSENCE } from "@/lib/espace-salarie";

export const dynamic = "force-dynamic";
const refus = () => NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
const jour = (d: Date) => d.toISOString().slice(0, 10);
const LIB_VAR: Record<string, string> = { HEURE_SUPPLEMENTAIRE: "Heures supp.", PRIME: "Prime", NOTE_FRAIS: "Note de frais", ACOMPTE: "Acompte" };
const periode = (v: string | null) => { const m = /^(\d{4})-(\d{2})$/.exec(v || ""); const n = new Date(); return m ? { annee: +m[1], mois: +m[2] } : { annee: n.getFullYear(), mois: n.getMonth() + 1 }; };

/**
 * GET ?mois=2027-01 : avancement de la paie de chaque client (variables, absences, bulletins, clôture)
 * GET ?mois=…&entrepriseId=… : détail d'un client (variables, absences, salariés et bulletins)
 */
export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const p = request.nextUrl.searchParams;
  const { annee, mois } = periode(p.get("mois"));
  const debut = new Date(annee, mois - 1, 1), fin = new Date(annee, mois, 0, 23, 59, 59);
  const presents = { dateDebut: { lte: fin }, OR: [{ dateFin: null }, { dateFin: { gte: debut } }] };
  const absMois = { dateDebut: { lte: fin }, dateFin: { gte: debut } };
  const ent = p.get("entrepriseId");

  if (ent) {
    const e = await prisma.entreprise.findFirst({ where: { id: ent, demo: false }, select: { id: true, nom: true } });
    if (!e) return NextResponse.json({ erreur: "Client introuvable" }, { status: 404 });
    const [salaries, variables, absences, bulletins, cloture] = await Promise.all([
      prisma.salarie.findMany({ where: { entrepriseId: ent, ...presents }, select: { id: true, nom: true, prenom: true, poste: true }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
      prisma.variablePaie.findMany({ where: { entrepriseId: ent, mois, annee }, include: { salarie: { select: { nom: true, prenom: true } } }, orderBy: { createdAt: "asc" } }),
      prisma.absence.findMany({ where: { entrepriseId: ent, ...absMois }, include: { salarie: { select: { nom: true, prenom: true } } }, orderBy: { dateDebut: "asc" } }),
      prisma.bulletin.findMany({ where: { entrepriseId: ent, mois, annee }, select: { id: true, salarieId: true, nom: true, vuLe: true } }),
      prisma.clotureMois.findUnique({ where: { entrepriseId_annee_mois: { entrepriseId: ent, annee, mois } } }),
    ]);
    return NextResponse.json({
      entreprise: e, mois: `${annee}-${String(mois).padStart(2, "0")}`, cloture: cloture ? { id: cloture.id, statut: cloture.statut, auteur: cloture.auteur } : null,
      variables: variables.map((v) => ({ id: v.id, salarie: `${v.salarie.prenom} ${v.salarie.nom}`, type: LIB_VAR[v.type] ?? v.type, valeur: v.valeur, unite: v.type === "HEURE_SUPPLEMENTAIRE" ? "h" : "€", commentaire: v.commentaire, statut: v.statut })),
      absences: absences.map((a) => ({ id: a.id, salarie: `${a.salarie.prenom} ${a.salarie.nom}`, type: LIBELLES_ABSENCE[a.type] ?? a.type, debut: jour(a.dateDebut), fin: jour(a.dateFin), statut: a.statut, commentaire: a.commentaire })),
      salaries: salaries.map((s) => ({ ...s, bulletin: bulletins.find((b) => b.salarieId === s.id) ?? null })),
    });
  }

  const entreprises = await prisma.entreprise.findMany({ where: { demo: false, actif: true, OR: [{ abonnementPaieId: { not: null } }, { cabinetId: { not: null } }, { permissions: { has: "paie" } }] }, select: { id: true, nom: true, abonnementPaie: { select: { nom: true } } }, orderBy: { nom: "asc" } });
  const ids = entreprises.map((e) => e.id);
  const [sal, vars, abs, bul, clo] = await Promise.all([
    prisma.salarie.groupBy({ by: ["entrepriseId"], where: { entrepriseId: { in: ids }, ...presents }, _count: { _all: true } }),
    prisma.variablePaie.groupBy({ by: ["entrepriseId", "statut"], where: { entrepriseId: { in: ids }, mois, annee }, _count: { _all: true } }),
    prisma.absence.groupBy({ by: ["entrepriseId", "statut"], where: { entrepriseId: { in: ids }, ...absMois }, _count: { _all: true } }),
    prisma.bulletin.groupBy({ by: ["entrepriseId"], where: { entrepriseId: { in: ids }, mois, annee }, _count: { _all: true } }),
    prisma.clotureMois.findMany({ where: { entrepriseId: { in: ids }, mois, annee } }),
  ]);
  const n = <T extends { entrepriseId: string; _count: { _all: number } }>(l: T[], id: string, f: (x: T) => boolean = () => true) => l.filter((x) => x.entrepriseId === id && f(x)).reduce((t, x) => t + x._count._all, 0);
  return NextResponse.json({
    mois: `${annee}-${String(mois).padStart(2, "0")}`,
    clients: entreprises.map((e) => {
      const c = clo.find((x) => x.entrepriseId === e.id);
      return {
        id: e.id, nom: e.nom, formule: e.abonnementPaie?.nom ?? null, salaries: n(sal, e.id),
        variables: n(vars, e.id), variablesAttente: n(vars, e.id, (x) => x.statut === "En attente"),
        absences: n(abs, e.id), absencesAttente: n(abs, e.id, (x) => x.statut === "En attente"),
        bulletins: n(bul, e.id), cloture: c ? { id: c.id, statut: c.statut } : null,
      };
    }),
  });
}

/**
 * POST (portail) { action, email, … } :
 * variables.valider { entrepriseId, mois } · variable.statut { id, statut } · absence.statut { id, statut, motif } ·
 * cloture.decider { id, decision } · bulletins.deposer { entrepriseId, mois, prevenir, fichiers: [{ salarieId, nom, base64 }] }
 */
export async function POST(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const b = await request.json().catch(() => ({}));
  const email = typeof b.email === "string" ? b.email : null;
  const repondre = async (r: Response) => { const d = await r.json().catch(() => ({})); return NextResponse.json(r.ok ? { succes: true, ...d } : { erreur: d?.erreur ?? `Refusé (${r.status})` }, { status: r.ok ? 200 : r.status }); };
  const sur = (v: unknown) => (/^[\w-]{1,60}$/.test(String(v ?? "")) ? String(v) : "");
  const { annee, mois } = periode(typeof b.mois === "string" ? b.mois : null);

  switch (b.action) {
    case "variables.valider": return repondre(await appelInterne(request, email, "/api/paie/valider", { methode: "POST", corps: { entrepriseId: sur(b.entrepriseId), mois, annee } }));
    case "variable.statut": if (!["Validé", "En attente", "Refusé"].includes(b.statut)) break; return repondre(await appelInterne(request, email, `/api/paie/${sur(b.id)}`, { methode: "PUT", corps: { statut: b.statut } }));
    case "absence.statut": return repondre(await appelInterne(request, email, `/api/absences/${sur(b.id)}`, { methode: "PUT", corps: { statut: b.statut, motif: b.motif } }));
    case "cloture.decider": return repondre(await appelInterne(request, email, "/api/cloture", { methode: "PUT", corps: { id: sur(b.id), decision: b.decision === "accepter" ? "accepter" : "refuser" } }));
    case "bulletins.deposer": {
      const fichiers = Array.isArray(b.fichiers) ? b.fichiers.slice(0, 60) : [];
      if (!fichiers.length) return NextResponse.json({ erreur: "Aucun fichier" }, { status: 400 });
      const form = new FormData();
      form.set("entrepriseId", sur(b.entrepriseId)); form.set("mois", String(mois)); form.set("annee", String(annee)); form.set("prevenir", "0"); // e-mails envoyés à la fin, en une fois (action bulletins.prevenir)
      fichiers.forEach((f: { salarieId?: string; nom?: string; base64?: string }, i: number) => {
        form.set(`fichier_${i}`, new File([Buffer.from(String(f.base64 || ""), "base64")], String(f.nom || "bulletin.pdf"), { type: "application/pdf" }));
        form.set(`salarie_${i}`, sur(f.salarieId));
      });
      return repondre(await appelInterneFormulaire(request, email, "/api/admin/bulletins", form));
    }
    case "bulletins.prevenir": {
      // Une seule série d'e-mails après le dépôt de tous les fichiers
      const ids = Array.isArray(b.salarieIds) ? b.salarieIds.map(sur).filter(Boolean).slice(0, 500) : [];
      return repondre(await appelInterne(request, email, "/api/admin/bulletins", { methode: "PUT", corps: { entrepriseId: sur(b.entrepriseId), mois, annee, salarieIds: ids } }));
    }
  }
  return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
}
