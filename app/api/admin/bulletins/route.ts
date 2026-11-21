import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { lireFichier } from "@/lib/fichiers";
import { enregistrerFichier, ErreurStockage, supprimerFichierStocke } from "@/lib/stockage";
import { envoyerMail, notifierClients } from "@/lib/notifications";
import { MOIS_FR } from "@/lib/bulletins";

const periode = (p: URLSearchParams | FormData) => {
  const mois = Number(p.get("mois")), annee = Number(p.get("annee"));
  return mois >= 1 && mois <= 12 && annee > 2000 && annee < 2100 ? { mois, annee } : null;
};

/** GET ?entrepriseId=&mois=&annee= (admin) : salariés de la période et bulletins déjà déposés */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const p = request.nextUrl.searchParams;
  const entrepriseId = p.get("entrepriseId") || "";
  const per = periode(p);
  if (!entrepriseId || !per) return NextResponse.json({ erreur: "Entreprise et mois obligatoires" }, { status: 400 });
  const debut = new Date(per.annee, per.mois - 1, 1), fin = new Date(per.annee, per.mois, 0, 23, 59, 59);
  const [salaries, bulletins] = await Promise.all([
    prisma.salarie.findMany({
      where: { entrepriseId, dateDebut: { lte: fin }, OR: [{ dateFin: null }, { dateFin: { gte: debut } }] },
      select: { id: true, prenom: true, nom: true, matricule: true, compte: { select: { actif: true } } },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
    prisma.bulletin.findMany({ where: { entrepriseId, ...per }, select: { id: true, salarieId: true, nom: true, vuLe: true, createdAt: true } }),
  ]);
  return NextResponse.json({ salaries: salaries.map(({ compte, ...s }) => ({ ...s, espace: !!compte?.actif })), bulletins });
}

/** POST (formulaire) : entrepriseId, mois, annee, prevenir, puis fichier_0 + salarie_0, fichier_1 + salarie_1… */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ erreur: "Formulaire invalide" }, { status: 400 });
  const entrepriseId = String(form.get("entrepriseId") || "");
  const per = periode(form);
  const entreprise = entrepriseId ? await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { id: true, nom: true, demo: true } }) : null;
  if (!entreprise || !per) return NextResponse.json({ erreur: "Entreprise et mois obligatoires" }, { status: 400 });

  const erreurs: string[] = [];
  const deposes: string[] = [];
  for (let i = 0; i < 300; i++) {
    const f = form.get(`fichier_${i}`);
    if (!f) break;
    const salarieId = String(form.get(`salarie_${i}`) || "");
    const salarie = salarieId ? await prisma.salarie.findFirst({ where: { id: salarieId, entrepriseId }, select: { id: true, prenom: true, nom: true } }) : null;
    const nomFichier = typeof f === "string" ? "?" : f.name;
    if (!salarie) { erreurs.push(`${nomFichier} : salarié non choisi`); continue; }
    const lu = await lireFichier(f, /\.pdf$/i);
    if ("erreur" in lu) { erreurs.push(`${nomFichier} : ${lu.erreur}`); continue; }
    let stocke: { cle: string | null; contenu: Buffer | null };
    try {
      stocke = await enregistrerFichier(`bulletins/${entrepriseId}`, lu.fichier.nom, "application/pdf", lu.fichier.contenu);
    } catch (e) {
      erreurs.push(`${nomFichier} : ${e instanceof ErreurStockage ? e.message : "envoi impossible"}`);
      continue;
    }
    const nom = `Bulletin ${MOIS_FR[per.mois - 1]} ${per.annee} - ${salarie.prenom} ${salarie.nom}.pdf`;
    const ancien = await prisma.bulletin.findUnique({ where: { salarieId_annee_mois: { salarieId: salarie.id, ...per } }, select: { cle: true } });
    await prisma.bulletin.upsert({
      where: { salarieId_annee_mois: { salarieId: salarie.id, ...per } },
      create: { salarieId: salarie.id, entrepriseId, ...per, nom, contenu: stocke.contenu, cle: stocke.cle, taille: lu.fichier.taille },
      update: { nom, contenu: stocke.contenu, cle: stocke.cle, taille: lu.fichier.taille, vuLe: null, createdAt: new Date() },
    });
    if (ancien?.cle && ancien.cle !== stocke.cle) await supprimerFichierStocke(ancien.cle).catch(() => {});
    deposes.push(salarie.id);
  }

  // Un fichier par requête (limite de taille de Vercel) : les e-mails partent ensuite par PUT, une seule fois
  const mails = form.get("prevenir") === "1" && !entreprise.demo ? await prevenir(entrepriseId, entreprise.nom, per, deposes) : 0;
  return NextResponse.json({ succes: true, deposes: deposes.length, mails, erreurs });
}

/** E-mails « bulletin disponible » : chaque salarié qui a son espace, puis l'employeur */
async function prevenir(entrepriseId: string, _nom: string, per: { mois: number; annee: number }, ids: string[]) {
  if (!ids.length) return 0;
  let mails = 0;
  const comptes = await prisma.utilisateur.findMany({ where: { role: "SALARIE", actif: true, salarieId: { in: ids } }, select: { email: true, prenom: true } });
  for (const c of comptes) {
    const ok = await envoyerMail({
      a: c.email, sujet: `Votre bulletin de paie de ${MOIS_FR[per.mois - 1]} ${per.annee} est disponible`,
      titre: "📄 Votre bulletin de paie est disponible",
      lignes: [`Bonjour ${c.prenom},`, `Votre bulletin de paie de ${MOIS_FR[per.mois - 1]} ${per.annee} est disponible dans votre espace salarié, rubrique « Mes bulletins ».`],
      lien: "/salarie?onglet=bulletins", bouton: "Voir mon bulletin",
    });
    if (ok) mails++;
  }
  await notifierClients(entrepriseId, {
    sujet: `Bulletins de paie de ${MOIS_FR[per.mois - 1]} ${per.annee} disponibles`,
    titre: "📄 Les bulletins du mois sont disponibles",
    lignes: [`${ids.length} bulletin(s) de ${MOIS_FR[per.mois - 1]} ${per.annee} ont été déposés par FRANEO RH.`, "Les salariés qui ont leur espace les retrouvent dans « Mes bulletins »."],
    lien: `/client/paie/bulletins?mois=${per.mois}&annee=${per.annee}`,
  }).catch(() => {});
  return mails;
}

/** PUT (admin) { entrepriseId, mois, annee, salarieIds } : prévient les salariés et l'employeur après le dépôt */
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const per = periode(new URLSearchParams({ mois: String(b.mois ?? ""), annee: String(b.annee ?? "") }));
  const entreprise = typeof b.entrepriseId === "string" ? await prisma.entreprise.findUnique({ where: { id: b.entrepriseId }, select: { id: true, nom: true, demo: true } }) : null;
  if (!entreprise || !per) return NextResponse.json({ erreur: "Entreprise et mois obligatoires" }, { status: 400 });
  if (entreprise.demo) return NextResponse.json({ succes: true, mails: 0 });
  const demandes = Array.isArray(b.salarieIds) ? b.salarieIds.filter((x: unknown): x is string => typeof x === "string") : [];
  const ids = (await prisma.bulletin.findMany({ where: { entrepriseId: entreprise.id, ...per, salarieId: { in: demandes } }, select: { salarieId: true } })).map((x) => x.salarieId);
  return NextResponse.json({ succes: true, mails: await prevenir(entreprise.id, entreprise.nom, per, ids) });
}
