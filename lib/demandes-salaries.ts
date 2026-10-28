// lib/demandes-salaries.ts
// Clients « paie » : ajout, modification et suppression de salariés passent par une demande
// que l'administrateur valide (la modification est alors appliquée) ou refuse.

import { prisma } from "@/lib/prisma";
import { lireRappel } from "@/lib/rappels";
import { matriculeDejaPris, nettoyerMatricule } from "@/lib/matricule";
import { notifierAdmin } from "@/lib/notifications";

export type TypeDemande = "AJOUT" | "MODIFICATION" | "SUPPRESSION";

export const LIBELLES_TYPE: Record<string, string> = {
  AJOUT: "Ajout de salarié",
  MODIFICATION: "Modification",
  SUPPRESSION: "Suppression",
};

const nombre = (v: unknown) => (v === undefined || v === null || v === "" ? null : parseFloat(String(v)));
const date = (v: unknown) => (v ? new Date(String(v)) : null);
const texte = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Champs d'une fiche salarié, tels qu'enregistrés en base (même règle que les formulaires) */
export function champsSalarie(d: Record<string, unknown>) {
  return {
    nom: String(d.nom ?? "").trim(),
    prenom: String(d.prenom ?? "").trim(),
    email: texte(d.email),
    telephone: texte(d.telephone),
    dateNaissance: date(d.dateNaissance),
    lieuNaissance: texte(d.lieuNaissance),
    nationalite: texte(d.nationalite),
    numeroSecuriteSociale: texte(d.numeroSecuriteSociale),
    rue: texte(d.rue),
    codePostal: texte(d.codePostal),
    ville: texte(d.ville),
    pays: texte(d.pays),
    poste: String(d.poste ?? "").trim(),
    typeContrat: texte(d.typeContrat),
    dateDebut: date(d.dateDebut),
    dateFin: date(d.dateFin),
    heuresHebdomadaires: nombre(d.heuresHebdomadaires),
    manager: texte(d.manager),
    conventionCollective: texte(d.conventionCollective),
    categorie: texte(d.categorie),
    coefficient: texte(d.coefficient),
    salaireMensuel: nombre(d.salaireMensuel),
    salaireAnnuel: nombre(d.salaireAnnuel),
    primes: nombre(d.primes),
    avantages: texte(d.avantages),
  };
}

const fr = (d: unknown) => (d ? new Date(String(d)).toLocaleDateString("fr-FR") : "");

/** Résumé lisible d'une demande (affiché au client, à l'admin et dans le mail) */
async function resumer(type: TypeDemande, donnees: Record<string, unknown>, salarieId?: string | null) {
  if (type === "AJOUT") {
    const s = champsSalarie(donnees);
    return `${s.prenom} ${s.nom} — ${s.poste}${s.typeContrat ? `, ${s.typeContrat}` : ""}${s.dateDebut ? `, entrée le ${fr(s.dateDebut)}` : ""}${s.salaireMensuel ? `, ${s.salaireMensuel} € brut/mois` : ""}`;
  }
  const avant = salarieId ? await prisma.salarie.findUnique({ where: { id: salarieId } }) : null;
  const nom = avant ? `${avant.prenom} ${avant.nom}` : "salarié";
  if (type === "SUPPRESSION") return `Supprimer ${nom}`;

  // Modification : on liste ce qui change
  if (!avant) return `Modifier ${nom}`;
  const apres = champsSalarie(donnees);
  const changements: string[] = [];
  const libelles: Record<string, string> = {
    nom: "nom", prenom: "prénom", poste: "poste", typeContrat: "contrat", dateDebut: "date d'entrée", dateFin: "date de sortie",
    salaireMensuel: "salaire mensuel", salaireAnnuel: "salaire annuel", heuresHebdomadaires: "heures hebdo", primes: "primes",
    email: "email", telephone: "téléphone", rue: "adresse", ville: "ville", manager: "manager", categorie: "catégorie", coefficient: "coefficient",
  };
  for (const [cle, label] of Object.entries(libelles)) {
    const a = (avant as Record<string, unknown>)[cle];
    const b = (apres as Record<string, unknown>)[cle];
    const va = a instanceof Date ? fr(a) : a ?? "";
    const vb = b instanceof Date ? fr(b) : b ?? "";
    if (String(va) !== String(vb)) changements.push(`${label} : ${va || "—"} → ${vb || "—"}`);
  }
  if (donnees.matricule !== undefined && nettoyerMatricule(donnees.matricule) !== avant.matricule) {
    changements.push(`matricule : ${avant.matricule || "—"} → ${nettoyerMatricule(donnees.matricule) || "—"}`);
  }
  return `Modifier ${nom} : ${changements.length > 0 ? changements.join(" ; ") : "aucun changement détecté"}`;
}

/** Enregistre une demande et prévient l'administrateur par mail */
export async function creerDemande(options: {
  entrepriseId: string;
  type: TypeDemande;
  donnees?: Record<string, unknown>;
  salarieId?: string | null;
  auteur?: string;
}) {
  const donnees = options.donnees || {};
  const resume = await resumer(options.type, donnees, options.salarieId);
  const demande = await prisma.demandeSalarie.create({
    data: {
      entrepriseId: options.entrepriseId,
      type: options.type,
      resume,
      donnees: donnees as object,
      salarieId: options.salarieId || null,
      auteur: options.auteur || null,
    },
    include: { entreprise: { select: { nom: true } } },
  });

  await notifierAdmin({
    sujet: `${LIBELLES_TYPE[options.type]} à valider — ${demande.entreprise.nom}`,
    titre: `${LIBELLES_TYPE[options.type]} à valider`,
    lignes: [`Entreprise : ${demande.entreprise.nom}`, ...(options.auteur ? [`Demandé par : ${options.auteur}`] : []), resume],
    lien: "/admin/salaries/demandes",
    entrepriseId: options.entrepriseId,
  });

  return demande;
}

/** Applique une demande validée. Renvoie un message d'erreur si impossible. */
export async function appliquerDemande(demandeId: string): Promise<{ erreur?: string }> {
  const d = await prisma.demandeSalarie.findUnique({ where: { id: demandeId } });
  if (!d) return { erreur: "Demande introuvable." };
  if (d.statut !== "EN_ATTENTE") return { erreur: "Cette demande a déjà été traitée." };
  const donnees = (d.donnees || {}) as Record<string, unknown>;

  if (d.type === "AJOUT") {
    const champs = champsSalarie(donnees);
    if (!champs.nom || !champs.prenom || !champs.poste) return { erreur: "Nom, prénom et poste sont obligatoires." };
    const matricule = nettoyerMatricule(donnees.matricule);
    if (matricule && (await matriculeDejaPris(d.entrepriseId, matricule))) {
      return { erreur: `Le matricule « ${matricule} » est déjà attribué. Modifiez-le avant de valider.` };
    }
    const rappels = [];
    if (Array.isArray(donnees.rappels)) {
      for (const r of donnees.rappels) {
        const lu = lireRappel(r);
        if (lu.valeur) rappels.push(lu.valeur);
      }
    }
    const cree = await prisma.salarie.create({
      data: { ...champs, matricule, entrepriseId: d.entrepriseId, statut: "Actif", rappels: rappels.length ? { create: rappels } : undefined },
    });
    await prisma.demandeSalarie.update({ where: { id: d.id }, data: { statut: "VALIDEE", traiteAt: new Date(), salarieId: cree.id } });
    return {};
  }

  if (!d.salarieId) return { erreur: "Salarié non précisé." };
  const salarie = await prisma.salarie.findFirst({ where: { id: d.salarieId, entrepriseId: d.entrepriseId } });
  if (!salarie) return { erreur: "Ce salarié n'existe plus." };

  if (d.type === "MODIFICATION") {
    const champs = champsSalarie(donnees);
    if (!champs.nom || !champs.prenom || !champs.poste) return { erreur: "Nom, prénom et poste sont obligatoires." };
    const modifierMatricule = donnees.matricule !== undefined;
    const matricule = nettoyerMatricule(donnees.matricule);
    if (modifierMatricule && matricule && (await matriculeDejaPris(d.entrepriseId, matricule, salarie.id))) {
      return { erreur: `Le matricule « ${matricule} » est déjà attribué.` };
    }
    await prisma.salarie.update({ where: { id: salarie.id }, data: { ...champs, ...(modifierMatricule ? { matricule } : {}) } });
  } else if (d.type === "SUPPRESSION") {
    await prisma.salarie.delete({ where: { id: salarie.id } });
  }

  await prisma.demandeSalarie.update({ where: { id: d.id }, data: { statut: "VALIDEE", traiteAt: new Date() } });
  return {};
}
