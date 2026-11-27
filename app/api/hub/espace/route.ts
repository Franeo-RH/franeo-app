import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";

export const dynamic = "force-dynamic";
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const t = (v: unknown, n = 200) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const num = (v: unknown) => { const n = Number(String(v ?? "").replace(",", ".")); return v === "" || v == null || !isFinite(n) ? null : n; };

/** GET (portail) ?vue=<onglet>.<page>&q=&f_<filtre>= : pages de l'espace Franeo RH dans le portail */
export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const p = request.nextUrl.searchParams;
  const q = (p.get("q") ?? "").trim();
  const ilike = { contains: q, mode: "insensitive" as const };
  switch (p.get("vue")) {
    case "bord.accueil": {
      const now = new Date();
      const [clients, salaries, variables, releves, clotures, tickets, recrutements] = await Promise.all([
        prisma.entreprise.count({ where: { actif: true, demo: false } }),
        prisma.salarie.count({ where: { entreprise: { demo: false }, OR: [{ dateFin: null }, { dateFin: { gte: now } }] } }),
        prisma.variablePaie.count({ where: { statut: "En attente", entreprise: { demo: false } } }).catch(() => 0),
        prisma.releveMois.count({ where: { statut: { in: ["Envoyé", "ENVOYE"] }, entreprise: { demo: false } } }).catch(() => 0),
        prisma.clotureMois.count({ where: { statut: { notIn: ["VALIDEE", "Validé", "TRAITEE"] }, entreprise: { demo: false } } }).catch(() => 0),
        prisma.ticket.count({ where: { statut: { in: ["Ouvert", "En cours"] }, entreprise: { demo: false } } }).catch(() => 0),
        prisma.demandeRecrutement.count({ where: { statut: { notIn: ["Terminé", "Annulé"] }, entreprise: { demo: false } } }).catch(() => 0),
      ]);
      return NextResponse.json({
        kpis: [{ label: "Clients actifs", valeur: String(clients) }, { label: "Salariés suivis", valeur: String(salaries) }, { label: "Variables à valider", valeur: String(variables), alerte: variables > 0 }, { label: "Relevés à valider", valeur: String(releves), alerte: releves > 0 }, { label: "Clôtures à traiter", valeur: String(clotures), alerte: clotures > 0 }, { label: "Tickets ouverts", valeur: String(tickets) }, { label: "Recrutements en cours", valeur: String(recrutements) }],
        aTraiter: [
          ...(variables ? [{ titre: `${variables} variable(s) de paie à valider`, lien: "/paie" }] : []),
          ...(clotures ? [{ titre: `${clotures} clôture(s) de paie à traiter`, lien: "/paie" }] : []),
          ...(releves ? [{ titre: `${releves} relevé(s) d'heures envoyé(s)`, vue: "releves.releves" }] : []),
          ...(tickets ? [{ titre: `${tickets} ticket(s) ouvert(s)`, lien: "/demandes?app=rh" }] : []),
        ],
      });
    }
    case "releves.releves": {
      const f = p.get("f_statut");
      const l = await prisma.releveMois.findMany({
        where: { entreprise: { demo: false }, ...(f ? { statut: { in: f === "Envoyé" ? ["Envoyé", "ENVOYE"] : f === "Validé" ? ["Validé", "VALIDEE"] : f === "Refusé" ? ["Refusé", "REFUSEE"] : [f] } } : {}), ...(q ? { OR: [{ salarie: { nom: ilike } }, { salarie: { prenom: ilike } }, { entreprise: { nom: ilike } }] } : {}) },
        orderBy: [{ annee: "desc" }, { mois: "desc" }], take: 200,
        include: { salarie: { select: { prenom: true, nom: true } }, entreprise: { select: { nom: true } } },
      });
      return NextResponse.json({ lignes: l.map((r) => ({ id: r.id, mois: `${MOIS[r.mois - 1]} ${r.annee}`, salarie: `${r.salarie.prenom} ${r.salarie.nom}`, entreprise: r.entreprise.nom, envoye: r.envoyeAt, statut: r.statut.replace("ENVOYE", "Envoyé").replace("VALIDEE", "Validé").replace("REFUSEE", "Refusé") })) });
    }
    case "documentaire.courriers": {
      const f = p.get("f_categorie");
      const l = await prisma.modeleCourrier.findMany({ where: { entrepriseId: null, ...(f ? { categorie: f } : {}), ...(q ? { OR: [{ nom: ilike }, { contenu: ilike }] } : {}) }, orderBy: [{ categorie: "asc" }, { nom: "asc" }] });
      const id = p.get("id"); const sel = id ? l.find((x) => x.id === id) : null;
      return NextResponse.json({ lignes: l.map((m) => ({ id: m.id, nom: m.nom, categorie: m.categorie, format: m.format === "MAIL" ? "E-mail" : "Courrier", maj: m.updatedAt })),
        ...(sel ? { fiche: { titre: sel.nom, sousTitre: `${sel.categorie} · ${sel.format === "MAIL" ? "e-mail" : "courrier"}`, sections: [{ titre: "Contenu", champs: [...(sel.objet ? [{ label: "Objet", valeur: sel.objet }] : []), { label: "Texte", valeur: sel.contenu }] }] } } : {}) });
    }
    case "documentaire.emails": {
      const l = await prisma.modeleEmail.findMany({ where: q ? { OR: [{ nom: ilike }, { sujet: ilike }] } : {}, orderBy: [{ ordre: "asc" }, { nom: "asc" }] });
      const id = p.get("id"); const sel = id ? l.find((x) => x.id === id) : null;
      return NextResponse.json({ lignes: l.map((m) => ({ id: m.id, nom: m.nom, sujet: m.sujet, maj: m.updatedAt })), ...(sel ? { fiche: { titre: sel.nom, sousTitre: sel.sujet, sections: [{ titre: "Texte", champs: [{ label: "Texte", valeur: sel.corps }] }] } } : {}) });
    }
    case "documentaire.contrats": {
      const l = await prisma.trameContrat.findMany({ where: q ? { nom: ilike } : {}, orderBy: { createdAt: "desc" }, select: { id: true, nom: true, champs: true, createdAt: true, entreprise: { select: { nom: true } } } });
      return NextResponse.json({ lignes: l.map((x) => ({ id: x.id, nom: x.nom, client: x.entreprise?.nom ?? "Tous les clients", champs: x.champs.length, date: x.createdAt })) });
    }
    case "cabinets.cabinets": {
      const l = await prisma.cabinet.findMany({ where: { demo: false, ...(q ? { nom: ilike } : {}) }, orderBy: { nom: "asc" }, include: { _count: { select: { entreprises: true } } } });
      return NextResponse.json({ lignes: l.map((c) => ({ id: c.id, nom: c.nom, ville: c.ville, clients: c._count.entreprises, tarif: [c.tarifForfait ? `${c.tarifForfait} €/mois` : "", c.tarifParClient ? `${c.tarifParClient} €/client` : ""].filter(Boolean).join(" + ") || c.tarifNote || "—", statut: c.actif ? "Actif" : "Désactivé" })) });
    }
  }
  return NextResponse.json({ erreur: "Page inconnue" }, { status: 404 });
}

/** POST (portail) { vue, action, id?, valeurs } : modèles, trames et cabinets */
export async function POST(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const v = (b.valeurs ?? {}) as Record<string, unknown>;
  const id = /^[\w-]{1,60}$/.test(String(b.id ?? "")) ? String(b.id) : "";
  const ok = (message: string) => NextResponse.json({ succes: true, message });
  const ko = (erreur: string, status = 400) => NextResponse.json({ erreur }, { status });
  try {
    switch (`${b.vue}:${b.action}`) {
      case "documentaire.courriers:creer":
        if (!t(v.nom) || !t(v.contenu, 50000)) return ko("Nom et contenu obligatoires.");
        await prisma.modeleCourrier.create({ data: { nom: t(v.nom), categorie: t(v.categorie) || "Mes modèles", format: v.format === "MAIL" ? "MAIL" : "COURRIER", objet: t(v.objet) || null, contenu: t(v.contenu, 50000), auteur: "FRANEO RH" } });
        return ok("✓ Modèle créé");
      case "documentaire.courriers:modifier":
        await prisma.modeleCourrier.update({ where: { id }, data: { ...(t(v.nom) ? { nom: t(v.nom) } : {}), ...(t(v.categorie) ? { categorie: t(v.categorie) } : {}), ...("objet" in v ? { objet: t(v.objet) || null } : {}), ...(t(v.contenu, 50000) ? { contenu: t(v.contenu, 50000) } : {}) } });
        return ok("✓ Modèle modifié");
      case "documentaire.courriers:supprimer":
        await prisma.modeleCourrier.delete({ where: { id } }); return ok("Modèle supprimé");
      case "documentaire.emails:creer":
        if (!t(v.nom) || !t(v.sujet) || !t(v.corps, 20000)) return ko("Nom, objet et texte obligatoires.");
        await prisma.modeleEmail.create({ data: { nom: t(v.nom), sujet: t(v.sujet), corps: t(v.corps, 20000) } });
        return ok("✓ Modèle d'e-mail créé");
      case "documentaire.emails:modifier":
        await prisma.modeleEmail.update({ where: { id }, data: { ...(t(v.nom) ? { nom: t(v.nom) } : {}), ...(t(v.sujet) ? { sujet: t(v.sujet) } : {}), ...(t(v.corps, 20000) ? { corps: t(v.corps, 20000) } : {}) } });
        return ok("✓ Modèle d'e-mail modifié");
      case "documentaire.emails:supprimer":
        await prisma.modeleEmail.delete({ where: { id } }); return ok("Modèle d'e-mail supprimé");
      case "documentaire.contrats:supprimer":
        await prisma.trameContrat.delete({ where: { id } }); return ok("Trame supprimée");
      case "cabinets.cabinets:creer":
        if (!t(v.nom)) return ko("Le nom du cabinet est obligatoire.");
        await prisma.cabinet.create({ data: { nom: t(v.nom), siret: t(v.siret) || null, ville: t(v.ville) || null, email: t(v.email) || null, telephone: t(v.telephone, 30) || null, tarifForfait: num(v.tarifForfait), tarifParClient: num(v.tarifParClient) } });
        return ok("✓ Cabinet créé");
      case "cabinets.cabinets:modifier":
        await prisma.cabinet.update({ where: { id }, data: { ...(t(v.nom) ? { nom: t(v.nom) } : {}), ...("email" in v ? { email: t(v.email) || null } : {}), ...("telephone" in v ? { telephone: t(v.telephone, 30) || null } : {}), ...("tarifForfait" in v ? { tarifForfait: num(v.tarifForfait) } : {}), ...("tarifParClient" in v ? { tarifParClient: num(v.tarifParClient) } : {}), ...("tarifNote" in v ? { tarifNote: t(v.tarifNote) || null } : {}) } });
        return ok("✓ Cabinet modifié");
      case "cabinets.cabinets:actif": {
        const c = await prisma.cabinet.findUnique({ where: { id }, select: { actif: true } });
        if (!c) return ko("Cabinet introuvable", 404);
        await prisma.cabinet.update({ where: { id }, data: { actif: !c.actif } });
        return ok(c.actif ? "Cabinet désactivé" : "Cabinet activé");
      }
    }
  } catch {
    return ko("Opération impossible (élément introuvable ou encore utilisé).");
  }
  return ko("Action pas encore reliée", 404);
}
