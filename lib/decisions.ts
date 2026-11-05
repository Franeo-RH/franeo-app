import { prisma } from "@/lib/prisma";
import { fmtH, NOMS_MOIS } from "@/lib/heures";
import { journaliser } from "@/lib/journal";

type Resultat = { ok: true } | { ok: false; erreur: string; status: number };

/** Valide ou refuse un relevé mensuel envoyé (employeur, manager, dirigeant ou admin) */
export async function deciderReleve(id: string, statut: "Validé" | "Refusé", motif: unknown, auteur: string): Promise<Resultat> {
  const r = await prisma.releveMois.findUnique({ where: { id }, include: { jours: true, salarie: { select: { prenom: true, nom: true } } } });
  if (!r) return { ok: false, erreur: "Introuvable", status: 404 };
  if (r.statut !== "Envoyé") return { ok: false, erreur: "Ce relevé n'est pas en attente de validation.", status: 400 };

  if (statut === "Refusé") {
    await prisma.releveMois.update({ where: { id }, data: { statut, valideePar: auteur, motifRefus: typeof motif === "string" && motif.trim() ? motif.trim().slice(0, 300) : null } });
    return { ok: true };
  }
  const totS = Math.round(r.jours.reduce((a, j) => a + j.heuresSupp, 0) * 100) / 100;
  let variableId: string | null = null;
  if (totS > 0) {
    const v = await prisma.variablePaie.create({
      data: {
        salarieId: r.salarieId, entrepriseId: r.entrepriseId, type: "HEURE_SUPPLEMENTAIRE", valeur: totS, mois: r.mois, annee: r.annee,
        commentaire: `Relevé ${NOMS_MOIS[r.mois - 1]} ${r.annee} (${fmtH(totS)})`,
      },
    });
    variableId = v.id;
    await journaliser(r.entrepriseId, auteur, "Heures supp. (relevé)", `${r.salarie.prenom} ${r.salarie.nom} : ${fmtH(totS)} — ${NOMS_MOIS[r.mois - 1]} ${r.annee}`);
  }
  await prisma.releveMois.update({ where: { id }, data: { statut, valideAt: new Date(), valideePar: auteur, motifRefus: null, variableId } });
  return { ok: true };
}

/** Annule un relevé validé : il est rouvert au salarié et ses heures supp. sont retirées des variables */
export async function annulerReleve(id: string, auteur: string): Promise<Resultat> {
  const r = await prisma.releveMois.findUnique({ where: { id }, include: { salarie: { select: { prenom: true, nom: true } } } });
  if (!r) return { ok: false, erreur: "Introuvable", status: 404 };
  if (r.statut !== "Validé") return { ok: false, erreur: "Seul un relevé validé peut être annulé.", status: 400 };
  if (r.annulationBloquee) return { ok: false, erreur: "La paie de ce mois est faite : FRANEO RH a bloqué l'annulation de ce relevé. Contactez-nous.", status: 403 };
  if (r.variableId) {
    const v = await prisma.variablePaie.findUnique({ where: { id: r.variableId } });
    if (v && v.statut !== "En attente") return { ok: false, erreur: "Les heures supplémentaires de ce relevé ont déjà été traitées en paie : contactez FRANEO RH.", status: 400 };
    if (v) await prisma.variablePaie.delete({ where: { id: v.id } });
  }
  await prisma.releveMois.update({ where: { id }, data: { statut: "Brouillon", valideAt: null, envoyeAt: null, variableId: null, motifRefus: `Relevé annulé par ${auteur} : à corriger puis renvoyer.` } });
  await journaliser(r.entrepriseId, auteur, "Annulation relevé", `${r.salarie.prenom} ${r.salarie.nom} — ${NOMS_MOIS[r.mois - 1]} ${r.annee}`);
  return { ok: true };
}

/** Valide ou refuse une note de frais (une note validée devient une variable de paie) */
export async function deciderFrais(id: string, statut: "Validé" | "Refusé", motif: unknown, auteur: string): Promise<Resultat> {
  const f = await prisma.noteFrais.findUnique({ where: { id }, include: { salarie: { select: { prenom: true, nom: true } } } });
  if (!f) return { ok: false, erreur: "Introuvable", status: 404 };
  if (f.statut !== "En attente") return { ok: false, erreur: "Cette note de frais a déjà été traitée.", status: 400 };
  if (statut === "Refusé") {
    await prisma.noteFrais.update({ where: { id }, data: { statut, traitePar: auteur, motifRefus: typeof motif === "string" && motif.trim() ? motif.trim().slice(0, 300) : null } });
    return { ok: true };
  }
  const d = new Date(f.date);
  const v = await prisma.variablePaie.create({
    data: { salarieId: f.salarieId, entrepriseId: f.entrepriseId, type: "NOTE_FRAIS", valeur: f.montant, mois: d.getMonth() + 1, annee: d.getFullYear(), commentaire: `Note de frais : ${f.motif}`.slice(0, 300) },
  });
  await prisma.noteFrais.update({ where: { id }, data: { statut, traitePar: auteur, variableId: v.id } });
  await journaliser(f.entrepriseId, auteur, "Note de frais", `${f.salarie.prenom} ${f.salarie.nom} : ${f.montant} € (${f.motif})`);
  return { ok: true };
}

/** Valide ou refuse une absence demandée par un salarié */
export async function deciderAbsence(id: string, statut: "Validé" | "Refusé", motif: unknown): Promise<Resultat> {
  const a = await prisma.absence.findUnique({ where: { id } });
  if (!a) return { ok: false, erreur: "Introuvable", status: 404 };
  if (a.statut !== "En attente") return { ok: false, erreur: "Cette absence a déjà été traitée.", status: 400 };
  await prisma.absence.update({ where: { id }, data: { statut, motifRefus: statut === "Refusé" && typeof motif === "string" && motif.trim() ? motif.trim().slice(0, 300) : null } });
  return { ok: true };
}

/** Un relevé validé couvre-t-il cette période ? (dans ce cas, plus aucune suppression possible) */
export async function moisVerrouille(salarieId: string, debut: Date, fin: Date): Promise<boolean> {
  const mois: { mois: number; annee: number }[] = [];
  const d = new Date(debut.getFullYear(), debut.getMonth(), 1);
  while (d <= fin && mois.length < 24) { mois.push({ mois: d.getMonth() + 1, annee: d.getFullYear() }); d.setMonth(d.getMonth() + 1); }
  const n = await prisma.releveMois.count({ where: { salarieId, statut: "Validé", OR: mois } });
  return n > 0;
}
