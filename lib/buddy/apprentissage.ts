import { prisma } from "@/lib/prisma";
import { plain } from "@/lib/buddy/outils";
import { racine } from "@/lib/buddy/catalogue";

// Mots trop courants pour servir de mots-clés
const VIDES = new Set("a au aux avec ce ces c ca cela comment combien d de des du elle en est et etre faire fait il ils je j l la le les leur lui ma mais me mes mon ne ni nous on ou par pas pour qu que quel quelle quelles quels qui sa sans se ses si son sont sur ta te tes toi ton tu un une vos votre vous y est-ce quoi dois peux puis faut bonjour merci svp stp".split(" "));

export function normaliser(texte: string) {
  return plain(texte).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Mots-clés d'une question (sans les mots vides) */
export function motsClesDe(texte: string): string[] {
  return [...new Set(normaliser(texte).split(" ").filter((m) => m.length > 2 && !VIDES.has(m)))].slice(0, 12);
}

export type ReponseApprise = { reponse: string | null; source: string | null; action: string | null };

// Réponses apprises gardées 30 s en mémoire (elles changent rarement, Buddy les consulte souvent)
let memoire: { expire: number; liste: { motsCles: string[]; reponse: string | null; source: string | null; action: string | null }[] } | null = null;
export function oublierReponsesApprises() { memoire = null; }

/**
 * Réponse apprise : la question doit contenir au moins 60 % des mots-clés d'une réponse rédigée par l'admin
 * (comparaison sur les racines : « absences » = « absence »). À score égal, la réponse la plus précise gagne.
 * `source` : chercher l'information dans l'app (lib/buddy/sources.ts) ; `action` : exécuter une action de Buddy.
 */
export async function reponseApprise(texte: string): Promise<ReponseApprise | null> {
  const mots = new Set(normaliser(texte).split(" ").map(racine));
  if (!memoire || memoire.expire < Date.now()) {
    const liste = await prisma.buddyQuestion.findMany({
      where: { statut: "REPONDUE", OR: [{ reponse: { not: null } }, { source: { not: null } }, { action: { not: null } }] },
      select: { motsCles: true, reponse: true, source: true, action: true },
    });
    memoire = { expire: Date.now() + 30_000, liste };
  }
  let meilleure: { score: number; n: number; r: ReponseApprise } | null = null;
  for (const a of memoire.liste) {
    if (a.motsCles.length === 0 || (!a.reponse?.trim() && !a.source && !a.action)) continue;
    const trouves = a.motsCles.filter((m) => mots.has(racine(m))).length;
    const score = trouves / a.motsCles.length;
    const mieux = !meilleure || score > meilleure.score || (score === meilleure.score && trouves > meilleure.n);
    if (trouves >= 1 && score >= 0.6 && mieux) meilleure = { score, n: trouves, r: { reponse: a.reponse?.trim() || null, source: a.source, action: a.action } };
  }
  return meilleure?.r ?? null;
}

/** Note une question restée sans réponse (regroupée si elle a déjà été posée) */
export async function noterQuestion(texte: string, entrepriseId: string) {
  const normalisee = normaliser(texte).slice(0, 300);
  if (normalisee.split(" ").length < 2) return; // « ok », « hein »… : rien à apprendre
  try {
    const existe = await prisma.buddyQuestion.findUnique({ where: { normalisee } });
    if (existe) {
      await prisma.buddyQuestion.update({
        where: { id: existe.id },
        data: { occurrences: { increment: 1 }, ...(existe.entreprises.includes(entrepriseId) ? {} : { entreprises: { push: entrepriseId } }) },
      });
    } else {
      await prisma.buddyQuestion.create({ data: { question: texte.slice(0, 500), normalisee, motsCles: motsClesDe(texte), entreprises: [entrepriseId] } });
    }
  } catch (e) {
    console.error("[Buddy] question non notée", e);
  }
}
