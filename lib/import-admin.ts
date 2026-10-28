// Imports Excel côté admin : absences, variables de paie, échéances (toutes entreprises)
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { TYPES_RAPPEL } from "@/lib/rappels";

export const MODELES_IMPORT: Record<string, { titre: string; colonnes: string[]; exemple: (string | number)[] }> = {
  absences: {
    titre: "Absences",
    colonnes: ["Entreprise", "Matricule", "Nom", "Prénom", "Type", "Date début", "Date fin", "Statut", "Commentaire"],
    exemple: ["Ma Société", "M001", "Martin", "Sophie", "Congés payés", "03/11/2026", "07/11/2026", "Validé", ""],
  },
  variables: {
    titre: "Variables de paie",
    colonnes: ["Entreprise", "Matricule", "Nom", "Prénom", "Type", "Valeur", "Mois", "Année", "Commentaire"],
    exemple: ["Ma Société", "M001", "Martin", "Sophie", "Prime", 150, 11, 2026, "Prime d'objectif"],
  },
  echeances: {
    titre: "Échéances",
    colonnes: ["Entreprise", "Matricule", "Nom", "Prénom", "Type", "Libellé", "Échéance", "Commentaire"],
    exemple: ["Ma Société", "M001", "Martin", "Sophie", "Visite médicale périodique", "", "15/01/2027", ""],
  },
};

const ABS: Record<string, string> = {
  "conges payes": "CONGE_PAYE", cp: "CONGE_PAYE", rtt: "RTT", "conge sans solde": "CONGE_SANS_SOLDE", "sans solde": "CONGE_SANS_SOLDE",
  "conge exceptionnel": "CONGE_EXCEPTIONNEL", "conge naissance": "CONGE_NAISSANCE", "conge de naissance": "CONGE_NAISSANCE",
  "maternite / paternite": "MATERNITE_PATERNITE", maternite: "MATERNITE_PATERNITE", paternite: "MATERNITE_PATERNITE",
  maladie: "MALADIE", "arret maladie": "MALADIE", "absence non remuneree": "ABSENCE_NON_REMUNEREE",
};
const VAR: Record<string, string> = {
  "heures supp": "HEURE_SUPPLEMENTAIRE", "heures supplementaires": "HEURE_SUPPLEMENTAIRE", hs: "HEURE_SUPPLEMENTAIRE",
  prime: "PRIME", "note de frais": "NOTE_FRAIS", acompte: "ACOMPTE",
};
const norm = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const code = (v: unknown, table: Record<string, string>, codes: string[]) => {
  const brut = String(v ?? "").trim().toUpperCase();
  if (codes.includes(brut)) return brut;
  return table[norm(v)] ?? null;
};

function date(v: unknown): Date | null {
  if (v instanceof Date) return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate(), 12));
  if (typeof v === "number") return new Date(Math.round((v - 25569) * 86400000) + 12 * 3600000);
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(String(v ?? "").trim());
  if (m) return new Date(Date.UTC(Number(m[3].length === 2 ? `20${m[3]}` : m[3]), Number(m[2]) - 1, Number(m[1]), 12));
  const d = new Date(String(v ?? ""));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function modeleXlsx(jeu: string): Buffer {
  const m = MODELES_IMPORT[jeu];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([m.colonnes, m.exemple]);
  ws["!cols"] = m.colonnes.map((c) => ({ wch: Math.max(c.length + 4, 16) }));
  XLSX.utils.book_append_sheet(wb, ws, m.titre.slice(0, 31));
  const aide =
    jeu === "absences" ? [["Types possibles"], ...["Congés payés", "RTT", "Congé sans solde", "Congé exceptionnel", "Congé naissance", "Maternité / Paternité", "Maladie", "Absence non rémunérée"].map((x) => [x]), [], ["Statut : En attente, Validé ou Refusé (Validé par défaut)"]]
    : jeu === "variables" ? [["Types possibles"], ["Heures supp (valeur en heures)"], ["Prime"], ["Note de frais"], ["Acompte"]]
    : [["Types possibles"], ...TYPES_RAPPEL.map((t) => [t.label])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([...aide, [], ["Le salarié est retrouvé par son matricule, sinon par nom + prénom, dans l'entreprise indiquée."]]), "Aide");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function importer(jeu: string, contenu: ArrayBuffer): Promise<{ crees: number; erreurs: { ligne: number; raison: string }[] }> {
  const wb = XLSX.read(contenu, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const lignes = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  const entreprises = await prisma.entreprise.findMany({ where: { demo: false }, select: { id: true, nom: true } });
  const salaries = await prisma.salarie.findMany({ where: { entreprise: { demo: false } }, select: { id: true, entrepriseId: true, nom: true, prenom: true, matricule: true } });

  const erreurs: { ligne: number; raison: string }[] = [];
  let crees = 0;
  for (const [i, l] of lignes.entries()) {
    const n = i + 2;
    const ent = entreprises.find((e) => norm(e.nom) === norm(l["Entreprise"]));
    if (!ent) { erreurs.push({ ligne: n, raison: `Entreprise « ${l["Entreprise"]} » introuvable` }); continue; }
    const sal = salaries.find((s) => s.entrepriseId === ent.id && l["Matricule"] && norm(s.matricule) === norm(l["Matricule"]))
      ?? salaries.find((s) => s.entrepriseId === ent.id && norm(s.nom) === norm(l["Nom"]) && norm(s.prenom) === norm(l["Prénom"]));
    if (!sal) { erreurs.push({ ligne: n, raison: `Salarié introuvable dans ${ent.nom}` }); continue; }
    const commentaire = String(l["Commentaire"] ?? "").trim() || null;
    try {
      if (jeu === "absences") {
        const type = code(l["Type"], ABS, Object.values(ABS));
        const debut = date(l["Date début"]);
        const fin = date(l["Date fin"]) ?? debut;
        if (!type) { erreurs.push({ ligne: n, raison: `Type d'absence inconnu : ${l["Type"]}` }); continue; }
        if (!debut || !fin || fin < debut) { erreurs.push({ ligne: n, raison: "Dates invalides" }); continue; }
        const statut = ["En attente", "Validé", "Refusé"].find((s) => norm(s) === norm(l["Statut"])) ?? "Validé";
        await prisma.absence.create({ data: { salarieId: sal.id, entrepriseId: ent.id, type: type as never, dateDebut: debut, dateFin: fin, statut, commentaire } });
      } else if (jeu === "variables") {
        const type = code(l["Type"], VAR, Object.values(VAR));
        const valeur = Number(String(l["Valeur"]).replace(",", "."));
        const mois = Number(l["Mois"]);
        const annee = Number(l["Année"]);
        if (!type) { erreurs.push({ ligne: n, raison: `Type de variable inconnu : ${l["Type"]}` }); continue; }
        if (!Number.isFinite(valeur) || !(mois >= 1 && mois <= 12) || !(annee >= 2020 && annee <= 2100)) { erreurs.push({ ligne: n, raison: "Valeur, mois ou année invalide" }); continue; }
        await prisma.variablePaie.create({ data: { salarieId: sal.id, entrepriseId: ent.id, type: type as never, valeur, mois, annee, commentaire } });
      } else if (jeu === "echeances") {
        const t = TYPES_RAPPEL.find((x) => x.code === String(l["Type"]).trim().toUpperCase() || norm(x.label) === norm(l["Type"]));
        const d = date(l["Échéance"]);
        if (!t) { erreurs.push({ ligne: n, raison: `Type d'échéance inconnu : ${l["Type"]}` }); continue; }
        if (!d) { erreurs.push({ ligne: n, raison: "Date d'échéance invalide" }); continue; }
        await prisma.rappelSalarie.create({ data: { salarieId: sal.id, type: t.code, libelle: String(l["Libellé"] ?? "").trim() || null, dateEcheance: d, commentaire } });
      }
      crees++;
    } catch {
      erreurs.push({ ligne: n, raison: "Enregistrement impossible" });
    }
  }
  return { crees, erreurs };
}
