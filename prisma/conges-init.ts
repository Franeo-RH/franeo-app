// Met un solde de congés de départ à 0 (à la date du jour) pour tous les salariés qui n'en ont pas encore.
// Sans risque à relancer : les salariés qui ont déjà un solde ne sont pas modifiés.
//   npx ts-node --transpile-only -O '{"module":"commonjs","moduleResolution":"node"}' prisma/conges-init.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const d = new Date();
  const aujourdhui = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const r = await prisma.salarie.updateMany({
    where: { congesRepriseDate: null },
    data: { congesRepriseDate: aujourdhui, congesRepriseReste: 0, congesRepriseEnCours: 0, soldeConges: 0 },
  });
  console.log(`✅ Solde de congés à 0 au ${aujourdhui.toLocaleDateString("fr-FR")} pour ${r.count} salarié(s)`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
