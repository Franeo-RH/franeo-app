// Met en place la grille tarifaire de novembre 2026 (à lancer une seule fois, puis sans risque de le relancer) :
//   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/grille-2026.ts
import { PrismaClient } from "@prisma/client";
import { GRILLE_PAIE, GRILLE_RH } from "../lib/grille";

const prisma = new PrismaClient();

async function main() {
  // ── Abonnements RH : on garde les 4 premières lignes existantes (renommées), sinon on les crée ──
  const anciens = await prisma.abonnement.findMany({ orderBy: { prixMensuel: "asc" } });
  const gardes: string[] = [];
  for (let i = 0; i < GRILLE_RH.length; i++) {
    const g = GRILLE_RH[i];
    const data = {
      nom: g.nom, prixMensuel: g.prixMensuel, salariesInclus: g.salariesInclus, prixSalarieSupp: g.prixSalarieSupp,
      ticketsRH: g.ticketsRH, prixTicketSupp: g.prixTicketSupp, features: [...g.features],
    };
    const existant = anciens.find((a) => a.nom === g.nom) || anciens.filter((a) => !gardes.includes(a.id))[0];
    const r = existant ? await prisma.abonnement.update({ where: { id: existant.id }, data }) : await prisma.abonnement.create({ data });
    gardes.push(r.id);
    console.log(`RH : ${r.nom} ${r.prixMensuel} €`);
  }
  // Formules RH en trop : les clients éventuels passent sur RH Basic, puis on les supprime
  for (const a of anciens.filter((a) => !gardes.includes(a.id))) {
    await prisma.entreprise.updateMany({ where: { abonnementId: a.id }, data: { abonnementId: gardes[0] } });
    await prisma.abonnement.delete({ where: { id: a.id } }).catch(() => console.log(`(non supprimé : ${a.nom})`));
  }

  // ── Formules paie ──
  for (const g of GRILLE_PAIE) {
    const data = {
      nom: g.nom.replace("Paie ", ""), couleur: g.couleur, prixMensuel: g.prixMensuel, bulletinsInclus: g.bulletinsInclus,
      prixBulletinSupp: g.prixBulletinSupp, entreesSortiesIncluses: true, ticketsRHInclus: 0, prixTicketSupp: g.prixTicketSupp,
      accesWebApp: true, ...g.flags,
    };
    await prisma.abonnementPaie.upsert({ where: { code: g.code }, create: { code: g.code, ...data }, update: data });
    console.log(`Paie : ${g.nom} ${g.prixMensuel} €`);
  }
  // Ancienne formule « Entreprise » : les clients passent en Premium, puis elle est supprimée
  const ent = await prisma.abonnementPaie.findUnique({ where: { code: "ENTREPRISE" } });
  if (ent) {
    const premium = await prisma.abonnementPaie.findUnique({ where: { code: "PREMIUM" } });
    await prisma.entreprise.updateMany({ where: { abonnementPaieId: ent.id }, data: { abonnementPaieId: premium!.id } });
    await prisma.demandeEvolutionPaie.deleteMany({ where: { OR: [{ nouvelleFormuleId: ent.id }, { ancienneFormuleId: ent.id }] } });
    await prisma.abonnementPaie.delete({ where: { id: ent.id } });
    console.log("Ancienne formule Entreprise retirée");
  }
  console.log("✅ Grille tarifaire mise à jour");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
