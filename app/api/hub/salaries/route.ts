import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";
import { appelInterne } from "@/lib/hub-interne";
import { LIBELLES_ABSENCE } from "@/lib/espace-salarie";

export const dynamic = "force-dynamic";
const refus = () => NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
const jour = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
const masquer = (v: string | null | undefined, garde = 4) => (v ? `${"•".repeat(Math.max(0, v.replace(/\s/g, "").length - garde))}${v.replace(/\s/g, "").slice(-garde)}` : "");

/** GET (portail) : salariés de tous les clients (?entrepriseId=&statut=presents|sortis|tous) ou fiche d'un salarié (?id=) */
export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const p = request.nextUrl.searchParams;
  const now = new Date();
  const id = p.get("id");
  if (id) {
    const s = await prisma.salarie.findFirst({ where: { id, entreprise: { demo: false } }, include: { entreprise: { select: { id: true, nom: true } }, compte: { select: { actif: true, email: true } } } });
    if (!s) return NextResponse.json({ erreur: "Salarié introuvable" }, { status: 404 });
    const [absences, variables, bulletins] = await Promise.all([
      prisma.absence.findMany({ where: { salarieId: id }, orderBy: { dateDebut: "desc" }, take: 15 }),
      prisma.variablePaie.findMany({ where: { salarieId: id }, orderBy: [{ annee: "desc" }, { mois: "desc" }], take: 15 }),
      prisma.bulletin.findMany({ where: { salarieId: id }, select: { id: true, mois: true, annee: true, nom: true, vuLe: true }, orderBy: [{ annee: "desc" }, { mois: "desc" }], take: 12 }),
    ]);
    return NextResponse.json({
      salarie: {
        id: s.id, entreprise: s.entreprise, nom: s.nom, prenom: s.prenom, email: s.email, telephone: s.telephone, dateNaissance: jour(s.dateNaissance), lieuNaissance: s.lieuNaissance, nationalite: s.nationalite,
        nss: masquer(s.numeroSecuriteSociale), rue: s.rue, codePostal: s.codePostal, ville: s.ville, poste: s.poste, typeContrat: s.typeContrat, dateDebut: jour(s.dateDebut), dateFin: jour(s.dateFin),
        heuresHebdomadaires: s.heuresHebdomadaires, conventionCollective: s.conventionCollective, categorie: s.categorie, coefficient: s.coefficient, salaireMensuel: s.salaireMensuel, iban: masquer(s.iban),
        espace: s.compte ? { actif: s.compte.actif, email: s.compte.email } : null, sorti: !!s.dateFin && s.dateFin < now,
      },
      absences: absences.map((a) => ({ id: a.id, type: LIBELLES_ABSENCE[a.type] ?? a.type, debut: jour(a.dateDebut), fin: jour(a.dateFin), statut: a.statut })),
      variables: variables.map((v) => ({ id: v.id, type: v.type, valeur: v.valeur, mois: v.mois, annee: v.annee, statut: v.statut, commentaire: v.commentaire })),
      bulletins,
    });
  }
  const statut = p.get("statut") ?? "presents";
  const ent = p.get("entrepriseId");
  const salaries = await prisma.salarie.findMany({
    where: { entreprise: { demo: false }, ...(ent ? { entrepriseId: ent } : {}), anonymiseLe: null,
      ...(statut === "presents" ? { OR: [{ dateFin: null }, { dateFin: { gte: now } }] } : statut === "sortis" ? { dateFin: { lt: now } } : {}) },
    select: { id: true, nom: true, prenom: true, poste: true, typeContrat: true, dateDebut: true, dateFin: true, email: true, entreprise: { select: { id: true, nom: true } }, compte: { select: { actif: true } } },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }], take: 2000,
  });
  return NextResponse.json({ salaries: salaries.map((s) => ({ id: s.id, nom: s.nom, prenom: s.prenom, poste: s.poste, contrat: s.typeContrat, debut: jour(s.dateDebut), fin: jour(s.dateFin), email: s.email, entreprise: s.entreprise, espace: !!s.compte?.actif })) });
}

/** POST (portail) { id, action: "infos", email, ...champs } : fiche salarié modifiée par la route admin existante */
export async function POST(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const b = await request.json().catch(() => ({}));
  const s = await prisma.salarie.findFirst({ where: { id: String(b.id || ""), entreprise: { demo: false } } });
  if (!s) return NextResponse.json({ erreur: "Salarié introuvable" }, { status: 404 });
  if (b.action !== "infos") return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
  const t = (k: string) => (typeof b[k] === "string" ? b[k].trim().slice(0, 200) : undefined);
  // La route attend la fiche complète : valeurs actuelles + champs envoyés
  const corps: Record<string, unknown> = {
    nom: s.nom, prenom: s.prenom, email: s.email, telephone: s.telephone, dateNaissance: jour(s.dateNaissance), lieuNaissance: s.lieuNaissance, nationalite: s.nationalite,
    numeroSecuriteSociale: s.numeroSecuriteSociale, rue: s.rue, codePostal: s.codePostal, ville: s.ville, pays: s.pays, poste: s.poste, typeContrat: s.typeContrat,
    dateDebut: jour(s.dateDebut), dateFin: jour(s.dateFin), heuresHebdomadaires: s.heuresHebdomadaires, manager: s.manager, etablissement: s.etablissement, service: s.service,
    conventionCollective: s.conventionCollective, categorie: s.categorie, coefficient: s.coefficient, salaireMensuel: s.salaireMensuel, salaireAnnuel: s.salaireAnnuel,
  };
  for (const k of ["nom", "prenom", "email_salarie", "telephone", "dateNaissance", "lieuNaissance", "nationalite", "rue", "codePostal", "ville", "poste", "typeContrat", "dateDebut", "dateFin", "heuresHebdomadaires", "conventionCollective", "categorie", "coefficient", "salaireMensuel"]) {
    const v = t(k);
    if (v !== undefined) corps[k === "email_salarie" ? "email" : k] = v;
  }
  if (!corps.nom || !corps.prenom || !corps.poste) return NextResponse.json({ erreur: "Nom, prénom et poste obligatoires." }, { status: 400 });
  const r = await appelInterne(request, typeof b.email === "string" ? b.email : null, `/api/salaries/${s.id}`, { methode: "PUT", corps });
  const d = await r.json().catch(() => ({}));
  return NextResponse.json(r.ok ? { succes: true } : { erreur: d?.erreur ?? `Refusé (${r.status})` }, { status: r.ok ? 200 : r.status });
}
