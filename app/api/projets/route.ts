import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesProjets, lireProjet } from "@/lib/projets-serveur";
import { masquerCouts, projetsAvecSynthese, STATUTS_PROJET } from "@/lib/projets";
import { MODELES_METIER } from "@/lib/projets-constantes";

/** GET : liste des projets avec leur synthèse (?statut=EN_COURS,PREVU) ; ?format=csv pour l'export */
export async function GET(request: NextRequest) {
  const a = await accesProjets();
  if (!a.ok) return a.refus;
  const st = request.nextUrl.searchParams.get("statut");
  const statuts = st ? st.split(",").filter((x) => x in STATUTS_PROJET) : [];
  const brut = await projetsAvecSynthese(a.entrepriseId, statuts.length ? { statut: { in: statuts } } : {});
  const projets = brut.map((p) => (a.voitCouts ? p : masquerCouts(p)));

  if (request.nextUrl.searchParams.get("format") === "csv") {
    const e = (x: number | null) => (x == null ? "" : String(x).replace(".", ","));
    const entete = ["Projet", "Code", "Client", "Statut", "Début", "Fin", "Heures prévues", "Heures réelles"];
    if (a.voitCouts) entete.push("Vendu (€)", "Budget (€)", "Coût réel (€)", "Marge réelle (€)", "Marge réelle (%)", "Projection fin (€)", "Marge projetée (%)", "Budget consommé (%)");
    const lignes = [entete, ...projets.map((p) => {
      const s = p.synthese;
      const l = [p.nom, p.code ?? "", p.client ?? "", STATUTS_PROJET[p.statut as keyof typeof STATUTS_PROJET]?.label ?? p.statut,
        p.dateDebut.toLocaleDateString("fr-FR"), p.dateFin?.toLocaleDateString("fr-FR") ?? "", e(s.heuresPrevues), e(s.heuresReelles)];
      if (a.voitCouts) l.push(e(s.vendu), e(s.budgetTotal), e(s.coutReel), e(s.margeReelle), e(s.tauxMargeReelle), e(s.projectionCout), e(s.tauxProjection), e(s.consommation));
      return l;
    })];
    const csv = "﻿" + lignes.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="projets-${new Date().toISOString().slice(0, 10)}.csv"` } });
  }
  return NextResponse.json({ projets, voitCouts: a.voitCouts, peutGerer: a.peutGerer });
}

/** POST : nouveau projet ; avec { modele } : étapes clés du métier préremplies */
export async function POST(request: NextRequest) {
  const a = await accesProjets("projets.gerer");
  if (!a.ok) return a.refus;
  const b = await request.json().catch(() => ({}));
  const { erreurs, data } = lireProjet(b);
  if (erreurs.length) return NextResponse.json({ erreur: erreurs.join(" ") }, { status: 400 });
  if (data.responsableId && !(await prisma.salarie.findFirst({ where: { id: data.responsableId, entrepriseId: a.entrepriseId } }))) data.responsableId = null;
  const modele = typeof b.modele === "string" && MODELES_METIER[b.modele] ? b.modele : null;
  const m = modele ? MODELES_METIER[modele] : null;
  const jour = (n: number) => new Date(data.dateDebut.getTime() + n * 86400000);
  const jalons = m ? m.jalons.map((j) => ({ libelle: j.libelle, date: jour(j.jours) })) : [];
  const p = await prisma.projet.create({ data: { ...data, modele, entrepriseId: a.entrepriseId, ...(jalons.length ? { jalons: { create: jalons } } : {}) } });
  return NextResponse.json({ succes: true, id: p.id });
}
