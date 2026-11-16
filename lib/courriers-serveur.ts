// lib/courriers-serveur.ts
// Accès aux modèles de courriers : le client (droit « rh.courriers ») ou FRANEO RH (admin).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { CATEGORIES, MODELES_DEFAUT, type ModeleCourrierVue } from "@/lib/courriers";

export async function accesCourriers() {
  const session = await getSession();
  if (!session) return { ok: false as const, refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  if (session.role === "ADMIN") return { ok: true as const, session, admin: true, entrepriseId: null as string | null };
  if (session.role !== "CLIENT" || !session.entrepriseId) return { ok: false as const, refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  if (!aDroit(session.entreprise?.permissions, "rh.courriers")) return { ok: false as const, refus: NextResponse.json({ erreur: "Fonction non activée pour votre compte." }, { status: 403 }) };
  return { ok: true as const, session, admin: false, entrepriseId: session.entrepriseId as string | null };
}

/** Modèles visibles : fournis avec l'app, ajoutés par FRANEO RH, puis ceux du client */
export async function modelesVisibles(entrepriseId: string | null): Promise<ModeleCourrierVue[]> {
  const enBase = await prisma.modeleCourrier.findMany({
    where: entrepriseId ? { OR: [{ entrepriseId: null }, { entrepriseId }] } : { entrepriseId: null },
    orderBy: [{ categorie: "asc" }, { nom: "asc" }],
  });
  return [
    ...MODELES_DEFAUT,
    ...enBase.map((m) => ({
      id: m.id, nom: m.nom, categorie: m.categorie, format: (m.format === "MAIL" ? "MAIL" : "COURRIER") as "MAIL" | "COURRIER",
      objet: m.objet, contenu: m.contenu, origine: (m.entrepriseId ? "ENTREPRISE" : "FRANEO") as "ENTREPRISE" | "FRANEO",
    })),
  ];
}

/** Données d'un modèle envoyées par le formulaire */
export function lireModele(b: Record<string, unknown>) {
  const nom = String(b.nom ?? "").trim().slice(0, 120);
  const contenu = String(b.contenu ?? "").trim().slice(0, 20000);
  if (!nom || !contenu) return { erreur: "Le nom et le texte du modèle sont obligatoires." } as const;
  const categorie = String(b.categorie ?? "").trim().slice(0, 60) || CATEGORIES[CATEGORIES.length - 1];
  return {
    data: {
      nom, contenu, categorie,
      format: b.format === "MAIL" ? "MAIL" : "COURRIER",
      objet: String(b.objet ?? "").trim().slice(0, 200) || null,
    },
  } as const;
}
