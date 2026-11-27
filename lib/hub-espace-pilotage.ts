// lib/hub-espace-pilotage.ts — espace Franeo RH du portail, onglet « Pilotage » (recrutement, impayés, historique de paie, entretiens, chiffres)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelInterne } from "@/lib/hub-interne";
import { categorieRecrutement } from "@/lib/recrutement";
import { TYPES_ENTRETIEN } from "@/lib/entretiens";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const eur = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
const nom = (s: { prenom: string; nom: string }) => `${s.prenom} ${s.nom}`;
const TYPES_VAR: Record<string, string> = { HEURE_SUPPLEMENTAIRE: "Heures supplémentaires", PRIME: "Prime", NOTE_FRAIS: "Note de frais", ACOMPTE: "Acompte" };

export async function lirePilotage(vue: string, p: URLSearchParams): Promise<Record<string, unknown> | null> {
  const q = (p.get("q") ?? "").trim().toLowerCase();
  const id = p.get("id");
  switch (vue) {
    case "pilotage.chiffres": {
      const now = new Date();
      const debut = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const f = await prisma.facturation.findMany({ where: { entreprise: { demo: false }, OR: [{ annee: { gt: debut.getFullYear() } }, { annee: debut.getFullYear(), mois: { gte: debut.getMonth() + 1 } }] }, select: { mois: true, annee: true, montant: true, statut: true, dateLimitePaie: true } });
      const mois = Array.from({ length: 12 }, (_, i) => { const d = new Date(debut.getFullYear(), debut.getMonth() + i, 1); return { m: d.getMonth() + 1, a: d.getFullYear() }; });
      const ca = mois.map((x) => ({ label: `${MOIS[x.m - 1]} ${String(x.a).slice(2)}`, valeur: Math.round(f.filter((y) => y.mois === x.m && y.annee === x.a).reduce((t, y) => t + y.montant, 0)) }));
      const nonPaye = f.filter((y) => y.statut !== "Payé");
      const retard = nonPaye.filter((y) => y.dateLimitePaie && y.dateLimitePaie < now);
      const [clients, salaries, recrutements] = await Promise.all([
        prisma.entreprise.count({ where: { actif: true, demo: false } }),
        prisma.salarie.count({ where: { entreprise: { demo: false }, OR: [{ dateFin: null }, { dateFin: { gte: now } }] } }),
        prisma.demandeRecrutement.count({ where: { entreprise: { demo: false }, statut: { notIn: ["Terminé", "Clôturée", "Annulé"] } } }),
      ]);
      return {
        kpis: [{ label: "Facturé ce mois", valeur: eur(ca[11].valeur) }, { label: "Facturé sur 12 mois", valeur: eur(ca.reduce((t, x) => t + x.valeur, 0)) }, { label: "En attente de paiement", valeur: eur(nonPaye.reduce((t, y) => t + y.montant, 0)) }, { label: "En retard", valeur: eur(retard.reduce((t, y) => t + y.montant, 0)), alerte: retard.length > 0 }, { label: "Clients actifs", valeur: String(clients) }, { label: "Salariés suivis", valeur: String(salaries) }, { label: "Recrutements en cours", valeur: String(recrutements) }],
        graphiques: [{ titre: "Facturé par mois (12 derniers mois)", barres: ca }],
        aTraiter: retard.length ? [{ titre: `${retard.length} facture(s) en retard de paiement`, vue: "pilotage.impayes" }] : [],
      };
    }
    case "pilotage.recrutement": {
      const ents = await prisma.entreprise.findMany({ where: { demo: false }, select: { id: true, nom: true }, orderBy: { nom: "asc" } });
      const ent = p.get("f_entreprise") ? ents.find((e) => e.nom === p.get("f_entreprise"))?.id ?? "-" : undefined;
      const l = await prisma.demandeRecrutement.findMany({ where: { entreprise: { demo: false }, ...(ent ? { entrepriseId: ent } : {}) }, orderBy: { createdAt: "desc" }, take: 300, include: { entreprise: { select: { nom: true } } } });
      const sel = id ? l.find((r) => r.id === id) : null;
      const etape = (s: string) => (["Clôturée"].includes(s) ? "Terminé" : s);
      return {
        options: { f_entreprise: ents.map((e) => e.nom) },
        lignes: l.filter((r) => !q || `${r.poste} ${r.entreprise.nom} ${r.candidat ?? ""}`.toLowerCase().includes(q)).map((r) => ({ id: r.id, titre: r.poste, detail: `${r.entreprise.nom} · ${r.typeContrat}${r.candidat ? ` · ${r.candidat}` : ""}`, etape: etape(r.statut) })),
        ...(sel ? { fiche: { titre: sel.poste, sousTitre: `${sel.entreprise.nom} · demandé le ${sel.createdAt.toLocaleDateString("fr-FR")}`, sections: [
          { titre: "Poste", champs: [{ label: "Contrat", valeur: sel.typeContrat }, { label: "Début souhaité", valeur: sel.dateDebut ? sel.dateDebut.toLocaleDateString("fr-FR") : "—" }, { label: "Salaire", valeur: sel.salaireMini || sel.salaireMaxi ? `${sel.salaireMini ?? "?"} à ${sel.salaireMaxi ?? "?"} €` : "—" }, { label: "Catégorie", valeur: categorieRecrutement(sel.categorie)?.label ?? sel.categorie }, { label: "Statut", valeur: sel.statut }, { label: "Candidat retenu", valeur: sel.candidat ?? "—" }] },
          { titre: "Besoin", champs: [{ label: "Missions", valeur: sel.missions }, { label: "Profil", valeur: sel.profil }, ...(sel.experience ? [{ label: "Expérience", valeur: sel.experience }] : []), ...(sel.formation ? [{ label: "Formation", valeur: sel.formation }] : []), ...(sel.primes ? [{ label: "Primes", valeur: sel.primes }] : []), ...(sel.commentaire ? [{ label: "Commentaire", valeur: sel.commentaire }] : [])] },
        ] } } : {}),
      };
    }
    case "pilotage.impayes": {
      const now = new Date();
      const l = await prisma.facturation.findMany({ where: { statut: { not: "Payé" }, entreprise: { demo: false } }, orderBy: [{ annee: "desc" }, { mois: "desc" }], include: { entreprise: { select: { nom: true } } } });
      const ret = l.filter((f) => f.dateLimitePaie && f.dateLimitePaie < now);
      const tot = (x: typeof l) => eur(x.reduce((t, f) => t + f.montant, 0));
      return {
        kpis: [{ label: "En attente de paiement", valeur: tot(l), detail: `${l.length} facture(s)` }, { label: "En retard", valeur: tot(ret), detail: `${ret.length} facture(s)`, alerte: ret.length > 0 }, { label: "Après 3 relances", valeur: tot(l.filter((f) => f.relances >= 3)), alerte: l.some((f) => f.relances >= 3) }],
        lignes: l.filter((f) => !q || f.entreprise.nom.toLowerCase().includes(q)).map((f) => ({ id: f.id, entreprise: f.entreprise.nom, mois: `${MOIS[f.mois - 1]} ${f.annee}`, montant: f.montant, limite: f.dateLimitePaie, relances: f.relances ? `${f.relances}${f.derniereRelance ? ` · ${f.derniereRelance.toLocaleDateString("fr-FR")}` : ""}` : "0", statut: f.dateLimitePaie && f.dateLimitePaie < now ? "En retard" : f.statut })),
      };
    }
    case "pilotage.historique": {
      const ents = await prisma.entreprise.findMany({ where: { demo: false }, select: { id: true, nom: true }, orderBy: { nom: "asc" } });
      const ent = p.get("f_entreprise") ? ents.find((e) => e.nom === p.get("f_entreprise"))?.id ?? "-" : undefined;
      const now = new Date();
      const choix = Array.from({ length: 12 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); return `${MOIS[d.getMonth()]} ${d.getFullYear()}`; });
      const [mm, aa] = (() => { const c = p.get("f_mois"); const i = c ? choix.indexOf(c) : -1; if (i < 0) return [null, null]; const d = new Date(now.getFullYear(), now.getMonth() - i, 1); return [d.getMonth() + 1, d.getFullYear()]; })();
      const l = await prisma.variablePaie.findMany({ where: { entreprise: { demo: false }, ...(ent ? { entrepriseId: ent } : {}), ...(mm ? { mois: mm, annee: aa! } : {}) }, orderBy: [{ annee: "desc" }, { mois: "desc" }], take: 400, include: { salarie: { select: { prenom: true, nom: true } }, entreprise: { select: { nom: true } } } });
      return {
        options: { f_entreprise: ents.map((e) => e.nom), f_mois: choix },
        lignes: l.filter((v) => !q || `${nom(v.salarie)} ${v.entreprise.nom}`.toLowerCase().includes(q)).map((v) => ({ id: v.id, mois: `${MOIS[v.mois - 1]} ${v.annee}`, salarie: nom(v.salarie), entreprise: v.entreprise.nom, type: TYPES_VAR[v.type] ?? v.type, valeur: v.valeur, statut: v.statut })),
      };
    }
    case "pilotage.entretiens": {
      const l = await prisma.entretien.findMany({ where: { salarie: { entreprise: { demo: false } } }, orderBy: { date: "desc" }, take: 300, include: { salarie: { select: { prenom: true, nom: true, entreprise: { select: { nom: true } } } } } });
      return { lignes: l.filter((e) => !q || nom(e.salarie).toLowerCase().includes(q)).map((e) => ({ id: e.id, date: e.date, type: TYPES_ENTRETIEN[e.type]?.court ?? e.type, salarie: nom(e.salarie), entreprise: e.salarie.entreprise.nom, responsable: e.responsable, statut: e.statut === "REALISE" ? "Réalisé" : "Planifié" })) };
    }
  }
  return null;
}

export async function agirPilotage(request: NextRequest, b: Record<string, unknown>): Promise<NextResponse | null> {
  const email = typeof b.email === "string" ? b.email : null;
  const v = (b.valeurs ?? {}) as Record<string, unknown>;
  const id = /^[\w-]{1,80}$/.test(String(b.id ?? "")) ? String(b.id) : "";
  const appel = async (chemin: string, methode: string, corps: unknown, ok: string) => {
    const r = await appelInterne(request, email, chemin, { methode, corps });
    const d = await r.json().catch(() => ({}));
    return NextResponse.json(r.ok ? { succes: true, message: ok } : { erreur: d?.erreur ?? `Refusé (${r.status})` }, { status: r.ok ? 200 : r.status });
  };
  switch (`${b.vue}:${b.action}`) {
    case "pilotage.recrutement:etape": return appel("/api/admin/modifier", "POST", { modele: "demandeRecrutement", id, data: { statut: String(v.etape ?? "") } }, "✓ Étape modifiée");
    case "pilotage.recrutement:candidat": return appel("/api/admin/modifier", "POST", { modele: "demandeRecrutement", id, data: { candidat: String(v.candidat ?? "") } }, "✓ Candidat enregistré");
    case "pilotage.recrutement:supprimer": return appel("/api/admin/supprimer", "POST", { modele: "demandeRecrutement", id }, "Recrutement supprimé");
    case "pilotage.impayes:relancer": return appel("/api/admin/relances", "POST", { facturationId: id }, "✓ Relance envoyée");
    case "pilotage.impayes:payee": return appel("/api/admin/modifier", "POST", { modele: "facturation", id, data: { statut: "Payé" } }, "✓ Facture marquée payée");
  }
  return null;
}
