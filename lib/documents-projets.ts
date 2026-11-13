// Informations communes aux devis et factures imprimables (émetteur, client)
import { prisma } from "@/lib/prisma";
import { coutHoraire } from "@/lib/projets";

export async function emetteur(entrepriseId: string) {
  const e = await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { nom: true, siret: true, rue: true, codePostal: true, ville: true, email: true, telephone: true, iban: true, bic: true, tauxCharges: true } });
  return e;
}

/** Coût horaire chargé des salariés actifs (pour chiffrer la main-d'œuvre d'un devis) */
export async function coutsSalaries(entrepriseId: string) {
  const [e, salaries] = await Promise.all([
    prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { tauxCharges: true } }),
    prisma.salarie.findMany({ where: { entrepriseId, statut: "Actif" }, select: { id: true, prenom: true, nom: true, poste: true, coutHoraireStandard: true, salaireMensuel: true, heuresHebdomadaires: true }, orderBy: [{ nom: "asc" }] }),
  ]);
  const liste = salaries.map((s) => ({ id: s.id, nom: `${s.prenom} ${s.nom}`, poste: s.poste, coutHoraire: coutHoraire(s, e?.tauxCharges) }));
  const connus = liste.filter((s) => s.coutHoraire != null).map((s) => s.coutHoraire!);
  const moyen = connus.length ? Math.round((connus.reduce((t, c) => t + c, 0) / connus.length) * 100) / 100 : null;
  return { salaries: liste, coutMoyen: moyen };
}
