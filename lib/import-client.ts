// Import admin « nouveau client » : un seul fichier Excel avec l'entreprise (feuille 1) et ses salariés (feuille 2)
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { permissionsFormule, niveauRH } from "@/lib/droits";

const ENTREPRISE: [string, string][] = [
  ["Nom de l'entreprise *", "Ma Société SAS"], ["SIRET", "12345678900012"], ["E-mail", "contact@masociete.fr"], ["Téléphone", "03 83 00 00 00"],
  ["Site web", "www.masociete.fr"], ["Rue", "12 rue de la Paix"], ["Code postal", "54000"], ["Ville", "Nancy"], ["Pays", "France"],
  ["Formule RH", "RH Sérénité"], ["Formule paie", ""], ["Convention collective", "Syntec"], ["Secteur", "Conseil"], ["Taux de charges patronales (%)", "42"],
  ["IBAN", ""], ["BIC", ""], ["Banque", ""],
];
const SALARIES = ["Matricule", "Nom *", "Prénom *", "Poste *", "E-mail", "Téléphone", "Date de naissance", "Lieu de naissance", "Nationalité", "N° sécurité sociale",
  "Rue", "Code postal", "Ville", "Type de contrat", "Date d'entrée", "Date de fin (CDD)", "Heures hebdo", "Salaire mensuel brut", "Primes",
  "Catégorie", "Coefficient", "Position", "Convention collective", "Établissement", "Service", "Rôle (Salarié / Manager / Dirigeant)", "IBAN"];
const EXEMPLE = ["M001", "Martin", "Sophie", "Assistante RH", "sophie.martin@masociete.fr", "06 00 00 00 00", "15/04/1990", "Nancy", "Française", "",
  "3 rue des Lilas", "54000", "Nancy", "CDI", "01/12/2026", "", 35, 2400, "", "Employé", "", "", "Syntec", "Siège", "RH", "Salarié", ""];

export function modeleClient(): Buffer {
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([["Champ", "Valeur (à remplir)"], ...ENTREPRISE]);
  ws1["!cols"] = [{ wch: 34 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Entreprise");
  const ws2 = XLSX.utils.aoa_to_sheet([SALARIES, EXEMPLE]);
  ws2["!cols"] = SALARIES.map((c) => ({ wch: Math.max(c.length + 2, 14) }));
  XLSX.utils.book_append_sheet(wb, ws2, "Salariés");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Mode d'emploi"], ["1. Feuille « Entreprise » : remplissez la colonne Valeur (une seule entreprise par fichier)."],
    ["2. Feuille « Salariés » : une ligne par salarié ; remplacez la ligne d'exemple."], ["Les champs avec * sont obligatoires."],
    ["Formule RH : RH Basic, RH Essentiel, RH Sérénité ou RH Premium. Formule paie : Paie Essentielle, Paie Sérénité ou Paie Premium (ou vide)."],
    ["Dates au format JJ/MM/AAAA. Type de contrat : CDI, CDD, Alternance, Stage, Intérim."],
    ["Les accès (dirigeant, salariés) se créent ensuite depuis la fiche entreprise et les fiches salariés."],
  ]), "Aide");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const norm = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const txt = (v: unknown) => { const s = String(v ?? "").trim(); return s || null; };
const nombre = (v: unknown) => { const s = String(v ?? "").replace(/\s/g, "").replace(",", "."); if (!s) return null; const n = Number(s); return Number.isFinite(n) ? n : null; };
function date(v: unknown): Date | null {
  if (v instanceof Date) return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate(), 12));
  if (typeof v === "number") return new Date(Math.round((v - 25569) * 86400000) + 12 * 3600000);
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(String(v ?? "").trim());
  return m ? new Date(Date.UTC(Number(m[3].length === 2 ? `20${m[3]}` : m[3]), Number(m[2]) - 1, Number(m[1]), 12)) : null;
}

export async function importerClient(contenu: ArrayBuffer): Promise<{ crees: number; erreurs: { ligne: number; raison: string }[]; entrepriseId?: string }> {
  const wb = XLSX.read(contenu, { type: "array", cellDates: true });
  const feuille = (nom: string, i: number) => wb.Sheets[wb.SheetNames.find((n) => norm(n) === norm(nom)) ?? wb.SheetNames[i]];
  const erreurs: { ligne: number; raison: string }[] = [];

  // Entreprise : couples Champ / Valeur
  const brut = XLSX.utils.sheet_to_json<unknown[]>(feuille("Entreprise", 0), { header: 1, defval: "" });
  const val = (champ: string) => { const l = brut.find((r) => norm(r[0]).startsWith(norm(champ))); return l ? l[1] : ""; };
  const nom = txt(val("Nom de l'entreprise"));
  if (!nom) return { crees: 0, erreurs: [{ ligne: 2, raison: "Feuille Entreprise : le nom est obligatoire." }] };
  const siret = txt(val("SIRET"))?.replace(/\s/g, "") ?? null;
  const existe = await prisma.entreprise.findFirst({ where: { OR: [{ nom: { equals: nom, mode: "insensitive" } }, ...(siret ? [{ siret }] : [])] }, select: { nom: true } });
  if (existe) return { crees: 0, erreurs: [{ ligne: 2, raison: `L'entreprise « ${existe.nom} » existe déjà (même nom ou même SIRET).` }] };
  const [abos, paies] = await Promise.all([prisma.abonnement.findMany({ select: { id: true, nom: true } }), prisma.abonnementPaie.findMany({ select: { id: true, nom: true } })]);
  const fRH = txt(val("Formule RH")), fPaie = txt(val("Formule paie"));
  const abo = fRH ? abos.find((a) => norm(a.nom) === norm(fRH) || norm(a.nom).includes(norm(fRH))) : null;
  const paie = fPaie ? paies.find((a) => norm(a.nom) === norm(fPaie) || norm(`paie ${a.nom}`) === norm(fPaie) || norm(a.nom).includes(norm(fPaie).replace(/^paie /, ""))) : null;
  if (fRH && !abo) erreurs.push({ ligne: 0, raison: `Formule RH « ${fRH} » inconnue : entreprise créée sans formule RH.` });
  if (fPaie && !paie) erreurs.push({ ligne: 0, raison: `Formule paie « ${fPaie} » inconnue : entreprise créée sans formule paie.` });
  const niveau = ["", "BASIC", "ESSENTIEL", "SERENITE", "PREMIUM"][niveauRH(abo ? { abonnement: { nom: abo.nom } } : null)] || "BASIC";
  const taux = nombre(val("Taux de charges"));

  const entreprise = await prisma.entreprise.create({
    data: {
      nom, siret, email: txt(val("E-mail")), telephone: txt(val("Téléphone")), siteWeb: txt(val("Site web")),
      rue: txt(val("Rue")), codePostal: txt(val("Code postal")), ville: txt(val("Ville")), pays: txt(val("Pays")) ?? "France",
      ccn: txt(val("Convention collective")), secteur: txt(val("Secteur")), iban: txt(val("IBAN")), bic: txt(val("BIC")), banque: txt(val("Banque")),
      abonnementId: abo?.id ?? null, abonnementPaieId: paie?.id ?? null, ...(taux != null && taux >= 0 && taux <= 100 ? { tauxCharges: taux } : {}),
      permissions: permissionsFormule(niveau, [], !!paie),
    },
  });

  // Salariés
  const lignes = XLSX.utils.sheet_to_json<Record<string, unknown>>(feuille("Salariés", 1), { defval: "" });
  const col = (l: Record<string, unknown>, debut: string) => { const k = Object.keys(l).find((x) => norm(x).startsWith(norm(debut))); return k ? l[k] : ""; };
  const matricules = new Set<string>();
  let crees = 0;
  for (const [i, l] of lignes.entries()) {
    const n = i + 2;
    const nomS = txt(col(l, "Nom")), prenom = txt(col(l, "Prénom")), poste = txt(col(l, "Poste"));
    if (!nomS && !prenom) continue;
    if (!nomS || !prenom || !poste) { erreurs.push({ ligne: n, raison: "Nom, prénom et poste sont obligatoires" }); continue; }
    const matricule = txt(col(l, "Matricule"));
    if (matricule && matricules.has(norm(matricule))) { erreurs.push({ ligne: n, raison: `Matricule ${matricule} en double` }); continue; }
    if (matricule) matricules.add(norm(matricule));
    const role = norm(col(l, "Rôle"));
    const salaire = nombre(col(l, "Salaire"));
    try {
      await prisma.salarie.create({
        data: {
          entrepriseId: entreprise.id, statut: "Actif", nom: nomS, prenom, poste, matricule,
          email: txt(col(l, "E-mail")), telephone: txt(col(l, "Téléphone")), dateNaissance: date(col(l, "Date de naissance")), lieuNaissance: txt(col(l, "Lieu de naissance")),
          nationalite: txt(col(l, "Nationalité")), numeroSecuriteSociale: txt(col(l, "N° sécurité")), rue: txt(col(l, "Rue")), codePostal: txt(col(l, "Code postal")), ville: txt(col(l, "Ville")),
          typeContrat: txt(col(l, "Type de contrat")), dateDebut: date(col(l, "Date d'entrée")), dateFin: date(col(l, "Date de fin")), heuresHebdomadaires: nombre(col(l, "Heures hebdo")),
          salaireMensuel: salaire, salaireAnnuel: salaire != null ? Math.round(salaire * 12 * 100) / 100 : null, primes: nombre(col(l, "Primes")),
          categorie: txt(col(l, "Catégorie")), coefficient: txt(col(l, "Coefficient")), position: txt(col(l, "Position")), conventionCollective: txt(col(l, "Convention collective")),
          etablissement: txt(col(l, "Établissement")), service: txt(col(l, "Service")), iban: txt(col(l, "IBAN")),
          roleRH: role.startsWith("dirig") ? "DIRIGEANT" : role.startsWith("manag") ? "MANAGER" : "SALARIE",
        },
      });
      crees++;
    } catch {
      erreurs.push({ ligne: n, raison: "Enregistrement impossible (donnée invalide)" });
    }
  }
  return { crees, erreurs, entrepriseId: entreprise.id };
}
