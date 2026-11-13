import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesProjets } from "@/lib/projets-serveur";
import { arrondi, joursOuvres, projetsAvecSynthese } from "@/lib/projets";

/**
 * GET ?annee=2026 : rentabilité globale.
 * - par client (vendu, coût réel, marge, projection) ;
 * - par salarié : heures sur projets, heures facturables (projets non internes) et taux d'occupation
 *   par rapport à la capacité du contrat depuis le 1er janvier (ou l'entrée du salarié).
 * Les montants portent sur les projets démarrés dans l'année.
 */
export async function GET(request: NextRequest) {
  const a = await accesProjets("projets.couts");
  if (!a.ok) return a.refus;
  const annee = Number(request.nextUrl.searchParams.get("annee")) || new Date().getFullYear();
  const debut = new Date(Date.UTC(annee, 0, 1)), finAnnee = new Date(Date.UTC(annee, 11, 31, 23, 59, 59));
  const projets = (await projetsAvecSynthese(a.entrepriseId)).filter((p) => p.dateDebut <= finAnnee && (p.dateFin ?? p.dateDebut) >= debut && p.statut !== "ANNULE");

  const clients = new Map<string, { client: string; projets: number; vendu: number; coutReel: number; marge: number; projection: number; heures: number }>();
  const salaries = new Map<string, { salarieId: string; salarie: string; heures: number; heuresFacturables: number; cout: number; projets: Set<string> }>();
  for (const p of projets) {
    const s = p.synthese;
    const nom = p.modeVente === "INTERNE" ? "🏠 Projets internes" : p.client || "Sans client";
    const c = clients.get(nom) ?? { client: nom, projets: 0, vendu: 0, coutReel: 0, marge: 0, projection: 0, heures: 0 };
    c.projets++; c.vendu += s.vendu; c.coutReel += s.coutReel; c.marge += s.margeReelle; c.projection += s.projectionMarge; c.heures += s.heuresReelles;
    clients.set(nom, c);
    for (const l of s.parSalarie) {
      const x = salaries.get(l.salarieId) ?? { salarieId: l.salarieId, salarie: l.salarie, heures: 0, heuresFacturables: 0, cout: 0, projets: new Set<string>() };
      x.heures += l.heuresReelles; x.cout += l.coutReel; if (p.modeVente !== "INTERNE") x.heuresFacturables += l.heuresReelles;
      if (l.heuresReelles > 0) x.projets.add(p.nom);
      salaries.set(l.salarieId, x);
    }
  }
  const fiches = await prisma.salarie.findMany({ where: { id: { in: [...salaries.keys()] } }, select: { id: true, heuresHebdomadaires: true, dateDebut: true } });
  const auj = new Date();
  const finPeriode = auj < finAnnee ? auj : finAnnee;

  const tot = projets.reduce((t, p) => ({ vendu: t.vendu + p.synthese.vendu, cout: t.cout + p.synthese.coutReel, projection: t.projection + p.synthese.projectionCout }), { vendu: 0, cout: 0, projection: 0 });
  return NextResponse.json({
    annee,
    total: { projets: projets.length, vendu: arrondi(tot.vendu), coutReel: arrondi(tot.cout), marge: arrondi(tot.vendu - tot.cout), tauxMarge: tot.vendu > 0 ? arrondi(((tot.vendu - tot.cout) / tot.vendu) * 100, 1) : null, projectionMarge: arrondi(tot.vendu - tot.projection) },
    clients: [...clients.values()].map((c) => ({ ...c, vendu: arrondi(c.vendu), coutReel: arrondi(c.coutReel), marge: arrondi(c.marge), projection: arrondi(c.projection), heures: arrondi(c.heures), tauxMarge: c.vendu > 0 ? arrondi((c.marge / c.vendu) * 100, 1) : null })).sort((x, y) => y.marge - x.marge),
    salaries: [...salaries.values()].map((x) => {
      const f = fiches.find((y) => y.id === x.salarieId);
      const depuis = f?.dateDebut && f.dateDebut > debut ? f.dateDebut : debut;
      const capacite = finPeriode > depuis ? ((f?.heuresHebdomadaires || 35) * joursOuvres(depuis, finPeriode)) / 5 : 0;
      return { salarieId: x.salarieId, salarie: x.salarie, heures: arrondi(x.heures), heuresFacturables: arrondi(x.heuresFacturables), cout: arrondi(x.cout), projets: [...x.projets], capacite: arrondi(capacite), occupation: capacite > 0 ? arrondi((x.heuresFacturables / capacite) * 100, 1) : null };
    }).sort((x, y) => y.heures - x.heures),
    projets: projets.map((p) => ({ id: p.id, nom: p.nom, client: p.client, couleur: p.couleur, statut: p.statut, vendu: p.synthese.vendu, coutReel: p.synthese.coutReel, margeReelle: p.synthese.margeReelle, tauxMargeReelle: p.synthese.tauxMargeReelle, tauxProjection: p.synthese.tauxProjection })),
  });
}
