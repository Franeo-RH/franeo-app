// lib/hub-espace-suivi.ts — espace Franeo RH du portail, onglet « Suivi des salariés » (lecture en base, actions via les routes admin existantes)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chargerEcheances } from "@/lib/rappels-serveur";
import { appelInterne, appelInterneFormulaire } from "@/lib/hub-interne";
import { LIBELLES_ABSENCE } from "@/lib/espace-salarie";
import { STATUTS_AT, TYPES_AT } from "@/lib/accidents";

const JOUR = 86400000;
const nom = (s: { prenom: string; nom: string }) => `${s.prenom} ${s.nom}`;
const STATUT_DEMANDE: Record<string, string> = { EN_ATTENTE: "En attente", VALIDEE: "Validée", REFUSEE: "Refusée" };
const TYPE_DEMANDE: Record<string, string> = { AJOUT: "Ajout", MODIFICATION: "Modification", SUPPRESSION: "Suppression" };
const POINTAGE: Record<string, string> = { ARRIVEE: "Arrivée", PAUSE: "Pause", REPRISE: "Reprise", DEPART: "Départ" };

/** Listes des formulaires et filtres : clients (« Nom::id ») et salariés présents */
async function options(avecSalaries: boolean) {
  const ents = await prisma.entreprise.findMany({ where: { demo: false }, orderBy: { nom: "asc" }, select: { id: true, nom: true } });
  const sal = avecSalaries ? await prisma.salarie.findMany({ where: { entreprise: { demo: false }, anonymiseLe: null, OR: [{ dateFin: null }, { dateFin: { gte: new Date() } }] }, orderBy: [{ nom: "asc" }], take: 2000, select: { id: true, prenom: true, nom: true, entreprise: { select: { nom: true } } } }) : [];
  return { ents, options: { f_entreprise: ents.map((e) => e.nom), entrepriseId: ents.map((e) => `${e.nom}::${e.id}`), ...(avecSalaries ? { salarieId: sal.map((s) => `${nom(s)} · ${s.entreprise.nom}::${s.id}`) } : {}) } };
}
const idEntreprise = (ents: { id: string; nom: string }[], f: string | null) => (f ? ents.find((e) => e.nom === f)?.id ?? "-" : undefined);

export async function lireSuivi(vue: string, p: URLSearchParams): Promise<Record<string, unknown> | null> {
  const q = (p.get("q") ?? "").trim().toLowerCase();
  const id = p.get("id");
  switch (vue) {
    case "suivi.echeances": {
      const { ents, options: o } = await options(false);
      const ent = idEntreprise(ents, p.get("f_entreprise"));
      let l = await chargerEcheances({ sansDemo: true, ...(ent ? { entrepriseId: ent } : {}) });
      const f = p.get("f_delai");
      if (f === "En retard") l = l.filter((e) => e.jours < 0); else if (f === "Sous 30 jours") l = l.filter((e) => e.jours >= 0 && e.jours <= 30); else if (f === "Plus tard") l = l.filter((e) => e.jours > 30);
      if (q) l = l.filter((e) => `${e.label} ${e.salarie} ${e.entreprise}`.toLowerCase().includes(q));
      const delai = (j: number) => (j < 0 ? `En retard de ${-j} j` : j === 0 ? "Aujourd'hui" : j <= 30 ? `Dans ${j} j (à traiter)` : `Dans ${j} j`);
      const sel = id ? l.find((e) => e.cle === id) : null;
      return {
        options: o,
        lignes: l.map((e) => ({ id: e.cle, label: `${e.icone} ${e.label}`, salarie: e.salarie, entreprise: e.entreprise, date: e.date, delai: delai(e.jours) })),
        ...(sel ? { fiche: { titre: `${sel.icone} ${sel.label}`, sousTitre: `${sel.salarie} · ${sel.entreprise}`, sections: [{ titre: "Échéance", champs: [{ label: "Date", valeur: new Date(sel.date).toLocaleDateString("fr-FR") }, { label: "Délai", valeur: delai(sel.jours) }, { label: "Origine", valeur: sel.auto ? "Calculée depuis la fiche du salarié (à modifier sur sa fiche)" : "Rappel ajouté à la main" }] }], actions: sel.auto ? [] : ["traiter", "modifier", "supprimer"] } } : {}),
      };
    }
    case "suivi.absences": {
      const { ents, options: o } = await options(true);
      const ent = idEntreprise(ents, p.get("f_entreprise"));
      const l = await prisma.absence.findMany({
        where: { entreprise: { demo: false }, ...(ent ? { entrepriseId: ent } : {}), ...(p.get("f_statut") ? { statut: p.get("f_statut")! } : {}), ...(q ? { OR: [{ salarie: { nom: { contains: q, mode: "insensitive" } } }, { salarie: { prenom: { contains: q, mode: "insensitive" } } }] } : {}) },
        orderBy: { dateDebut: "desc" }, take: 300, include: { salarie: { select: { prenom: true, nom: true } }, entreprise: { select: { nom: true } } },
      });
      return { options: o, lignes: l.map((a) => ({ id: a.id, salarie: nom(a.salarie), entreprise: a.entreprise.nom, type: LIBELLES_ABSENCE[a.type] ?? a.type, debut: a.dateDebut, fin: a.dateFin, statut: a.statut })) };
    }
    case "suivi.accidents": {
      const l = await prisma.accidentTravail.findMany({ where: { entreprise: { demo: false } }, orderBy: { dateAccident: "desc" }, take: 300, include: { salarie: { select: { prenom: true, nom: true } }, entreprise: { select: { nom: true } } } });
      return { lignes: l.filter((a) => !q || `${nom(a.salarie)} ${a.entreprise.nom}`.toLowerCase().includes(q)).map((a) => ({ id: a.id, date: a.dateAccident, salarie: nom(a.salarie), entreprise: a.entreprise.nom, type: TYPES_AT[a.type] ?? a.type, statut: (STATUTS_AT[a.statut]?.label ?? a.statut).replace(/^\S+\s/, "") })) };
    }
    case "suivi.mouvements": {
      const { ents, options: o } = await options(false);
      const ent = idEntreprise(ents, p.get("f_entreprise"));
      const debut = new Date(Date.now() - 90 * JOUR), fin = new Date(Date.now() + 60 * JOUR);
      const l = await prisma.salarie.findMany({ where: { entreprise: { demo: false }, ...(ent ? { entrepriseId: ent } : {}), OR: [{ dateDebut: { gte: debut, lte: fin } }, { dateFin: { gte: debut, lte: fin } }] }, include: { entreprise: { select: { nom: true } } }, take: 500 });
      const m = l.flatMap((s) => [
        ...(s.dateDebut && s.dateDebut >= debut && s.dateDebut <= fin ? [{ id: `${s.id}-a`, date: s.dateDebut, mouvement: "Arrivée", salarie: nom(s), poste: s.poste, contrat: s.typeContrat, entreprise: s.entreprise.nom }] : []),
        ...(s.dateFin && s.dateFin >= debut && s.dateFin <= fin ? [{ id: `${s.id}-d`, date: s.dateFin, mouvement: "Départ", salarie: nom(s), poste: s.poste, contrat: s.typeContrat, entreprise: s.entreprise.nom }] : []),
      ]).filter((x) => (!p.get("f_mouvement") || x.mouvement === p.get("f_mouvement")) && (!q || `${x.salarie} ${x.entreprise} ${x.poste}`.toLowerCase().includes(q)))
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      return { options: o, lignes: m };
    }
    case "suivi.demandes": {
      const f = Object.entries(STATUT_DEMANDE).find(([, v]) => v === p.get("f_statut"))?.[0];
      const l = await prisma.demandeSalarie.findMany({ where: { entreprise: { demo: false }, ...(f ? { statut: f } : {}) }, orderBy: { createdAt: "desc" }, take: 300, include: { entreprise: { select: { nom: true } } } });
      const sel = id ? l.find((d) => d.id === id) : null;
      return {
        lignes: l.filter((d) => !q || `${d.resume} ${d.entreprise.nom}`.toLowerCase().includes(q)).map((d) => ({ id: d.id, date: d.createdAt, type: TYPE_DEMANDE[d.type] ?? d.type, resume: d.resume, entreprise: d.entreprise.nom, statut: STATUT_DEMANDE[d.statut] ?? d.statut })),
        ...(sel ? { fiche: { titre: `${TYPE_DEMANDE[sel.type] ?? sel.type} de salarié`, sousTitre: `${sel.entreprise.nom} · ${sel.createdAt.toLocaleDateString("fr-FR")}${sel.auteur ? ` · ${sel.auteur}` : ""}`, sections: [{ titre: "Demande", champs: [{ label: "Détail", valeur: sel.resume }, { label: "Statut", valeur: STATUT_DEMANDE[sel.statut] ?? sel.statut }, ...(sel.motifRefus ? [{ label: "Motif du refus", valeur: sel.motifRefus }] : [])] }], actions: sel.statut === "EN_ATTENTE" ? ["valider", "refuser"] : [] } } : {}),
      };
    }
    case "suivi.acces": {
      const { ents, options: o } = await options(false);
      const ent = idEntreprise(ents, p.get("f_entreprise"));
      const l = await prisma.salarie.findMany({ where: { entreprise: { demo: false, permissions: { has: "espace-salaries" } }, ...(ent ? { entrepriseId: ent } : {}), anonymiseLe: null, OR: [{ dateFin: null }, { dateFin: { gte: new Date() } }] }, orderBy: { nom: "asc" }, take: 1000, include: { entreprise: { select: { nom: true } }, compte: { select: { actif: true } } } });
      const etat = (s: (typeof l)[number]) => (!s.compte ? "Aucun" : s.compte.actif ? "Actif" : "Coupé");
      return { options: o, lignes: l.filter((s) => (!p.get("f_espace") || etat(s) === p.get("f_espace")) && (!q || `${nom(s)} ${s.entreprise.nom} ${s.email ?? ""}`.toLowerCase().includes(q))).map((s) => ({ id: s.id, salarie: nom(s), entreprise: s.entreprise.nom, email: s.email, espace: etat(s) })) };
    }
    case "suivi.pointages": {
      const { ents, options: o } = await options(false);
      const ent = idEntreprise(ents, p.get("f_entreprise"));
      const l = await prisma.pointage.findMany({ where: { at: { gte: new Date(Date.now() - 14 * JOUR) }, ...(ent ? { entrepriseId: ent } : {}) }, orderBy: { at: "desc" }, take: 500, include: { salarie: { select: { prenom: true, nom: true, entreprise: { select: { nom: true, demo: true } } } } } });
      return { options: o, lignes: l.filter((x) => !x.salarie.entreprise.demo && (!q || nom(x.salarie).toLowerCase().includes(q))).map((x) => ({ id: x.id, quand: x.at.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }), salarie: nom(x.salarie), entreprise: x.salarie.entreprise.nom, type: POINTAGE[x.type] ?? x.type, zone: x.dansZone == null ? "—" : x.dansZone ? "Oui" : `Non${x.motif ? ` (${x.motif})` : ""}` })) };
    }
    case "suivi.contrats": {
      const l = await prisma.demandeContrat.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
      const [ents, sals] = await Promise.all([
        prisma.entreprise.findMany({ where: { id: { in: [...new Set(l.map((c) => c.entrepriseId))] } }, select: { id: true, nom: true, demo: true } }),
        prisma.salarie.findMany({ where: { id: { in: l.map((c) => c.salarieId).filter((x): x is string => !!x) } }, select: { id: true, prenom: true, nom: true } }),
      ]);
      return { lignes: l.filter((c) => !ents.find((e) => e.id === c.entrepriseId)?.demo).map((c) => { const s = sals.find((x) => x.id === c.salarieId); return { id: c.id, date: c.createdAt, intitule: c.intitule, type: c.typeContrat, salarie: s ? nom(s) : "—", entreprise: ents.find((e) => e.id === c.entrepriseId)?.nom ?? "—", auteur: c.auteur }; }).filter((x) => !q || `${x.intitule} ${x.entreprise} ${x.salarie}`.toLowerCase().includes(q)) };
    }
    case "suivi.outils": {
      const { options: o } = await options(false);
      return { options: o };
    }
  }
  return null;
}

/** Actions de l'onglet « Suivi des salariés » : routes admin existantes de l'app (compte admin de l'utilisateur du portail) */
export async function agirSuivi(request: NextRequest, b: Record<string, unknown>): Promise<NextResponse | null> {
  const email = typeof b.email === "string" ? b.email : null;
  const v = (b.valeurs ?? {}) as Record<string, unknown>;
  const id = /^[\w-]{1,80}$/.test(String(b.id ?? "")) ? String(b.id) : "";
  const appel = async (chemin: string, methode: string, corps?: unknown, ok = "✓ C'est fait") => {
    const r = await appelInterne(request, email, chemin, { methode, corps });
    const d = await r.json().catch(() => ({}));
    return NextResponse.json(r.ok ? { succes: true, message: d?.avertissement ? `${ok} · ${d.avertissement}` : ok, ...(d?.lien ? { lien: d.lien } : {}) } : { erreur: d?.erreur ?? `Refusé (${r.status})` }, { status: r.ok ? 200 : r.status });
  };
  switch (`${b.vue}:${b.action}`) {
    case "suivi.echeances:traiter": return appel("/api/admin/modifier", "POST", { modele: "rappelSalarie", id, data: { traite: true } }, "✓ Échéance traitée");
    case "suivi.echeances:modifier": return appel("/api/admin/modifier", "POST", { modele: "rappelSalarie", id, data: { ...(v.libelle ? { libelle: v.libelle } : {}), ...(v.dateEcheance ? { dateEcheance: v.dateEcheance } : {}), ...(v.commentaire ? { commentaire: v.commentaire } : {}) } }, "✓ Échéance modifiée");
    case "suivi.echeances:supprimer": return appel("/api/admin/supprimer", "POST", { modele: "rappelSalarie", id }, "Échéance supprimée");
    case "suivi.absences:creer": return appel("/api/absences", "POST", { salarieId: v.salarieId, type: v.type, dateDebut: v.dateDebut, dateFin: v.dateFin, commentaire: v.commentaire || null }, "✓ Absence déclarée");
    case "suivi.absences:valider": return appel(`/api/absences/${id}`, "PUT", { statut: "Validé" }, "✓ Absence validée");
    case "suivi.absences:refuser": return appel(`/api/absences/${id}`, "PUT", { statut: "Refusé" }, "Absence refusée");
    case "suivi.absences:supprimer": return appel(`/api/absences/${id}`, "DELETE", undefined, "Absence supprimée");
    case "suivi.accidents:clore": return appel(`/api/accidents/${id}`, "PUT", { clore: true }, "✓ Dossier clos");
    case "suivi.accidents:rouvrir": return appel(`/api/accidents/${id}`, "PUT", { clore: false }, "Dossier rouvert");
    case "suivi.demandes:valider": return appel(`/api/demandes-salaries/${id}`, "POST", { action: "valider" }, "✓ Demande validée et appliquée");
    case "suivi.demandes:refuser": return appel(`/api/demandes-salaries/${id}`, "POST", { action: "refuser", motif: v.motif }, "Demande refusée");
    case "suivi.acces:inviter": return appel(`/api/salaries/${id}/espace`, "POST", {}, "✓ Invitation envoyée");
    case "suivi.acces:couper": return appel(`/api/salaries/${id}/espace`, "DELETE", undefined, "Accès coupé");
    case "suivi.outils:rgpd": return appel("/api/admin/rgpd", "POST", { action: "purger" }, "✓ Purge RGPD lancée");
    case "suivi.outils:importer": {
      const f = Array.isArray(v.fichier) ? (v.fichier[0] as { nom: string; type: string; contenu: string } | undefined) : undefined;
      if (!f || !v.entrepriseId) return NextResponse.json({ erreur: "Choisissez le client et le fichier." }, { status: 400 });
      const form = new FormData();
      form.set("entrepriseId", String(v.entrepriseId));
      form.set("fichier", new Blob([Buffer.from(f.contenu, "base64")], { type: f.type || "application/octet-stream" }), f.nom);
      const r = await appelInterneFormulaire(request, email, "/api/salaries/import", form);
      const d = await r.json().catch(() => ({}));
      return NextResponse.json(r.ok ? { succes: true, message: `✓ Import terminé : ${typeof d?.crees === "number" ? d.crees : Array.isArray(d?.crees) ? d.crees.length : 0} salarié(s) ajouté(s)${Array.isArray(d?.erreurs) && d.erreurs.length ? ` · ${d.erreurs.length} ligne(s) en erreur (lignes ${d.erreurs.slice(0, 8).map((e: { ligne: number }) => e.ligne).join(", ")})` : ""}` } : { erreur: d?.erreur ?? `Refusé (${r.status})` }, { status: r.ok ? 200 : r.status });
    }
  }
  return null;
}
