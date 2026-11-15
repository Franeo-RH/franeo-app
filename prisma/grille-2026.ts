// Grille tarifaire (lib/grille.ts).
//   Sans option : crée seulement les formules manquantes. Les prix modifiés dans Admin › Abonnements sont conservés.
//   Avec --forcer : remet TOUTES les formules aux prix de lib/grille.ts (et retire les formules RH en trop).
//   npx ts-node --transpile-only -O '{"module":"commonjs","moduleResolution":"node"}' prisma/grille-2026.ts [--forcer]
import { PrismaClient } from "@prisma/client";
import { GRILLE_PAIE, GRILLE_RH } from "../lib/grille";

const prisma = new PrismaClient();
const FORCER = process.argv.includes("--forcer");

async function main() {
  // ── Abonnements RH : on garde les 4 premières lignes existantes (renommées), sinon on les crée ──
  const anciens = await prisma.abonnement.findMany({ orderBy: { prixMensuel: "asc" } });
  const gardes: string[] = [];
  // Sans --forcer, des formules RH existent déjà : elles sont gérées dans l'admin, on n'y touche pas
  for (let i = 0; i < (FORCER || anciens.length === 0 ? GRILLE_RH.length : 0); i++) {
    const g = GRILLE_RH[i];
    const data = {
      nom: g.nom, prixMensuel: g.prixMensuel, salariesInclus: g.salariesInclus, prixSalarieSupp: g.prixSalarieSupp,
      ticketsRH: g.ticketsRH, prixTicketSupp: g.prixTicketSupp, features: [...g.features],
    };
    const existant = anciens.find((a) => a.nom === g.nom) || (FORCER ? anciens.filter((a) => !gardes.includes(a.id))[0] : undefined);
    if (existant && !FORCER) { gardes.push(existant.id); continue; } // prix réglés par l'admin : on n'y touche pas
    const r = existant ? await prisma.abonnement.update({ where: { id: existant.id }, data }) : await prisma.abonnement.create({ data });
    gardes.push(r.id);
    console.log(`RH : ${r.nom} ${r.prixMensuel} €`);
  }
  // Formules RH en trop : les clients éventuels passent sur RH Basic, puis on les supprime
  for (const a of FORCER ? anciens.filter((a) => !gardes.includes(a.id)) : []) {
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
    await prisma.abonnementPaie.upsert({ where: { code: g.code }, create: { code: g.code, ...data }, update: FORCER ? data : {} });
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
  // L'espace salarié est inclus dans toutes les formules : on l'active pour tous les clients
  const sans = await prisma.entreprise.findMany({ where: { NOT: { permissions: { has: "espace-salaries" } } }, select: { id: true, permissions: true } });
  for (const e of sans) await prisma.entreprise.update({ where: { id: e.id }, data: { permissions: [...e.permissions, "espace-salaries"] } });
  if (sans.length) console.log(`Espace salarié activé pour ${sans.length} client(s)`);
  console.log(FORCER ? "✅ Grille tarifaire appliquée (tous les prix remis à jour)" : "✅ Formules vérifiées (prix réglés dans l'admin conservés)");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
