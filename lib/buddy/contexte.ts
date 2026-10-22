// lib/buddy/contexte.ts
// Mémoire de la conversation, enregistrée en base (table BuddyContexte).
// Sur Vercel, la mémoire du serveur est effacée entre deux requêtes : une variable en mémoire ne suffit pas.
// Si la table n'existe pas encore (migration oubliée), Buddy continue avec une mémoire de secours.

import { prisma } from "@/lib/prisma";
import type { Ctx } from "./types";

const DUREE_MAX_MS = 20 * 60 * 1000; // la conversation en cours est oubliée après 20 minutes d'inactivité
const secours = new Map<string, string>();
let dejaAverti = false;

export function ctxVide(): Ctx {
  return { data: {}, echecs: 0, maj: Date.now() };
}

function avertir(e: unknown) {
  if (dejaAverti) return;
  dejaAverti = true;
  console.warn(
    "[Buddy] Table BuddyContexte indisponible, mémoire de secours utilisée. Lancez : npx prisma migrate dev --name add_buddy_contexte\n",
    e
  );
}

function lire(brut: string | null | undefined): Ctx {
  if (!brut) return ctxVide();
  try {
    const c = JSON.parse(brut) as Ctx;
    if (!c || typeof c !== "object" || typeof c.maj !== "number") return ctxVide();
    if (Date.now() - c.maj > DUREE_MAX_MS) return ctxVide();
    return { ...c, data: c.data ?? {}, echecs: c.echecs ?? 0 };
  } catch {
    return ctxVide();
  }
}

export async function chargerCtx(userId: string): Promise<Ctx> {
  try {
    const ligne = await prisma.buddyContexte.findUnique({ where: { userId } });
    return lire(ligne?.data);
  } catch (e) {
    avertir(e);
    return lire(secours.get(userId));
  }
}

export async function sauverCtx(userId: string, ctx: Ctx): Promise<void> {
  ctx.maj = Date.now();
  const data = JSON.stringify(ctx);
  try {
    await prisma.buddyContexte.upsert({
      where: { userId },
      create: { userId, data },
      update: { data },
    });
  } catch (e) {
    avertir(e);
    secours.set(userId, data);
  }
}

/** Termine le flux en cours mais garde les petits souvenirs utiles (dernière liste, dernier salarié). */
export function viderFlux(ctx: Ctx): void {
  ctx.flow = undefined;
  ctx.etape = undefined;
  ctx.data = {};
  ctx.echecs = 0;
}
