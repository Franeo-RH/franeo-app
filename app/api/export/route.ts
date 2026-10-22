import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import * as XLSX from "xlsx";

function calculerCout(type: string, valeur: number, salarie: {
  salaireMensuel: number | null;
  heuresHebdomadaires: number | null;
}) {
  if (type === "HEURE_SUPPLEMENTAIRE") {
    const salaireMensuel = salarie.salaireMensuel || 0;
    const heuresHebdo = salarie.heuresHebdomadaires || 35;
    const salaireHoraire = salaireMensuel / (heuresHebdo * 52 / 12);
    let coutBrut = valeur <= 8
      ? salaireHoraire * valeur * 1.25
      : (salaireHoraire * 8 * 1.25) + (salaireHoraire * (valeur - 8) * 1.50);
    return {
      coutBrut: Math.round(coutBrut * 100) / 100,
      coutEntreprise: Math.round(coutBrut * 1.40 * 100) / 100,
    };
  }
  return {
    coutBrut: valeur,
    coutEntreprise: Math.round(valeur * 1.40 * 100) / 100,
  };
}

const TYPES_VARIABLE: Record<string, string> = {
  HEURE_SUPPLEMENTAIRE: "Heures supp.",
  PRIME: "Prime",
  NOTE_FRAIS: "Note de frais",
  ACOMPTE: "Acompte",
};

const TYPES_ABSENCE: Record<string, string> = {
  CONGE_PAYE: "Congés payés",
  RTT: "RTT",
  CONGE_SANS_SOLDE: "Congé sans solde",
  CONGE_EXCEPTIONNEL: "Congé exceptionnel",
  CONGE_NAISSANCE: "Congé naissance",
  MATERNITE_PATERNITE: "Maternité / Paternité",
  MALADIE: "Maladie",
  ABSENCE_NON_REMUNEREE: "Absence non rémunérée",
};

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  let data: object[] = [];
  let nomFichier = "export";

    if (type === "salaries-admin" && session.role === "ADMIN") {
    const entrepriseId = searchParams.get("entreprise") || undefined;

    const salaries = await prisma.salarie.findMany({
      where: { entreprise: { demo: false }, ...(entrepriseId ? { entrepriseId } : {}) },
      include: { entreprise: true },
      orderBy: { createdAt: "desc" },
    });

    data = salaries.map((s) => ({
      "Nom": s.nom,
      "Prénom": s.prenom,
      "Entreprise": s.entreprise.nom,
      "Poste": s.poste,
      "Type contrat": s.typeContrat || "",
      "Date début": s.dateDebut ? new Date(s.dateDebut).toLocaleDateString("fr-FR") : "",
      "Date fin": s.dateFin ? new Date(s.dateFin).toLocaleDateString("fr-FR") : "",
      "Salaire mensuel": s.salaireMensuel || "",
      "Email": s.email || "",
      "Téléphone": s.telephone || "",
      "Statut": s.statut,
    }));
    nomFichier = entrepriseId ? `salaries-${entrepriseId}` : "salaries-toutes-entreprises";

  } else if (type === "entreprises" && session.role === "ADMIN") {
    const entreprises = await prisma.entreprise.findMany({
      where: { demo: false },
      include: {
        abonnement: true,
        _count: { select: { salaries: true } },
      },
      orderBy: { nom: "asc" },
    });
    data = entreprises.map((e) => ({
      "Nom": e.nom,
      "SIRET": e.siret || "",
      "Email": e.email || "",
      "Téléphone": e.telephone || "",
      "Ville": e.ville || "",
      "Pays": e.pays || "",
      "Abonnement": e.abonnement?.nom || "",
      "Prix mensuel": e.abonnement?.prixMensuel || "",
      "Nombre salariés": e._count.salaries,
    }));
    nomFichier = "entreprises";

  } else if (type === "salaries-client" && session.role === "CLIENT") {
    const salaries = await prisma.salarie.findMany({
      where: { entrepriseId: session.entrepriseId! },
      orderBy: { createdAt: "desc" },
    });
    data = salaries.map((s) => ({
      "Nom": s.nom,
      "Prénom": s.prenom,
      "Poste": s.poste,
      "Type contrat": s.typeContrat || "",
      "Date début": s.dateDebut ? new Date(s.dateDebut).toLocaleDateString("fr-FR") : "",
      "Salaire mensuel": s.salaireMensuel || "",
      "Email": s.email || "",
      "Téléphone": s.telephone || "",
      "Statut": s.statut,
    }));
    nomFichier = "salaries";

  } else if (type === "absences" && session.role === "ADMIN") {
    const moisDebut = parseInt(searchParams.get("moisDebut") || "0");
    const anneeDebut = parseInt(searchParams.get("anneeDebut") || "0");
    const moisFin = parseInt(searchParams.get("moisFin") || "0");
    const anneeFin = parseInt(searchParams.get("anneeFin") || "0");
    const entrepriseId = searchParams.get("entrepriseId") || undefined;
    const typeAbsence = searchParams.get("typeAbsence") || "tout";
    const statut = searchParams.get("statut") || "tout";

    const absences = await prisma.absence.findMany({
      where: {
        entreprise: { demo: false },
        ...(entrepriseId ? { entrepriseId } : {}),
        ...(typeAbsence !== "tout" ? { type: typeAbsence as any } : {}),
        ...(statut !== "tout" ? { statut } : {}),
        dateDebut: { gte: new Date(anneeDebut, moisDebut - 1, 1) },
        dateFin: { lte: new Date(anneeFin, moisFin, 0) },
      },
      include: { salarie: true, entreprise: true },
      orderBy: { dateDebut: "desc" },
    });

    data = absences.map((a) => {
      const jours = Math.ceil((new Date(a.dateFin).getTime() - new Date(a.dateDebut).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return {
        "Entreprise": a.entreprise.nom,
        "Salarié": `${a.salarie.prenom} ${a.salarie.nom}`,
        "Type": TYPES_ABSENCE[a.type] || a.type,
        "Du": new Date(a.dateDebut).toLocaleDateString("fr-FR"),
        "Au": new Date(a.dateFin).toLocaleDateString("fr-FR"),
        "Durée (jours)": jours,
        "Commentaire": a.commentaire || "",
        "Statut": a.statut,
      };
    });
    nomFichier = "absences";

  } else if (type === "variables" && session.role === "ADMIN") {
    const moisDebut = parseInt(searchParams.get("moisDebut") || "0");
    const anneeDebut = parseInt(searchParams.get("anneeDebut") || "0");
    const moisFin = parseInt(searchParams.get("moisFin") || "0");
    const anneeFin = parseInt(searchParams.get("anneeFin") || "0");
    const entrepriseId = searchParams.get("entrepriseId") || undefined;
    const categorie = searchParams.get("categorie") || "tout";
    const statut = searchParams.get("statut") || "tout";

    const periodes = Array.from(
      { length: (anneeFin - anneeDebut) * 12 + moisFin - moisDebut + 1 },
      (_, i) => {
        const d = new Date(anneeDebut, moisDebut - 1 + i);
        return { mois: d.getMonth() + 1, annee: d.getFullYear() };
      }
    );

    const variables = await prisma.variablePaie.findMany({
      where: {
        entreprise: { demo: false },
        ...(entrepriseId ? { entrepriseId } : {}),
        ...(statut !== "tout" ? { statut } : {}),
        OR: periodes,
      },
      include: { salarie: true, entreprise: true },
      orderBy: [{ annee: "desc" }, { mois: "desc" }],
    });

    const variablesFiltrees = variables.filter(v => {
      if (categorie === "hs") return v.type === "HEURE_SUPPLEMENTAIRE";
      if (categorie === "prime") return v.type === "PRIME";
      if (categorie === "note_frais") return v.type === "NOTE_FRAIS";
      if (categorie === "acompte") return v.type === "ACOMPTE";
      return true;
    });

    data = variablesFiltrees.map((v) => {
      const cout = calculerCout(v.type, v.valeur, v.salarie);
      return {
        "Entreprise": v.entreprise.nom,
        "Salarié": `${v.salarie.prenom} ${v.salarie.nom}`,
        "Type": TYPES_VARIABLE[v.type] || v.type,
        "Valeur": v.type === "HEURE_SUPPLEMENTAIRE" ? `${v.valeur}h` : `${v.valeur} €`,
        "Coût brut": `${cout.coutBrut} €`,
        "Coût entreprise": `${cout.coutEntreprise} €`,
        "Mois": `${v.mois}/${v.annee}`,
        "Statut": v.statut,
        "Saisi le": new Date(v.createdAt).toLocaleDateString("fr-FR"),
        "Validé le": v.dateValidation ? new Date(v.dateValidation).toLocaleDateString("fr-FR") : "",
        "Réinitialisé le": v.dateReset ? new Date(v.dateReset).toLocaleDateString("fr-FR") : "",
      };
    });
    nomFichier = "variables-paie";

  } else if (type === "paie" && session.role === "ADMIN") {
    const moisDebut = parseInt(searchParams.get("moisDebut") || "0");
    const anneeDebut = parseInt(searchParams.get("anneeDebut") || "0");
    const moisFin = parseInt(searchParams.get("moisFin") || "0");
    const anneeFin = parseInt(searchParams.get("anneeFin") || "0");
    const entrepriseId = searchParams.get("entrepriseId") || undefined;
    const categorie = searchParams.get("categorie") || "tout";

    const periodes = Array.from(
      { length: (anneeFin - anneeDebut) * 12 + moisFin - moisDebut + 1 },
      (_, i) => {
        const d = new Date(anneeDebut, moisDebut - 1 + i);
        return { mois: d.getMonth() + 1, annee: d.getFullYear() };
      }
    );

    const variables = await prisma.variablePaie.findMany({
      where: {
        entreprise: { demo: false },
        ...(entrepriseId ? { entrepriseId } : {}),
        OR: periodes,
      },
      include: { salarie: true, entreprise: true },
      orderBy: [{ annee: "desc" }, { mois: "desc" }],
    });

    const absences = await prisma.absence.findMany({
      where: {
        entreprise: { demo: false },
        ...(entrepriseId ? { entrepriseId } : {}),
        dateDebut: { gte: new Date(anneeDebut, moisDebut - 1, 1) },
        dateFin: { lte: new Date(anneeFin, moisFin, 0) },
      },
      include: { salarie: true, entreprise: true },
      orderBy: { dateDebut: "desc" },
    });

    const variablesFiltrees = variables.filter(v => {
      if (categorie === "hs") return v.type === "HEURE_SUPPLEMENTAIRE";
      if (categorie === "prime") return v.type === "PRIME";
      if (categorie === "note_frais") return v.type === "NOTE_FRAIS";
      if (categorie === "acompte") return v.type === "ACOMPTE";
      return categorie !== "absence";
    });

    const wb = XLSX.utils.book_new();

    if (categorie !== "absence" && variablesFiltrees.length > 0) {
      const wsVariables = XLSX.utils.json_to_sheet(variablesFiltrees.map((v) => {
        const cout = calculerCout(v.type, v.valeur, v.salarie);
        return {
          "Entreprise": v.entreprise.nom,
          "Salarié": `${v.salarie.prenom} ${v.salarie.nom}`,
          "Type": TYPES_VARIABLE[v.type] || v.type,
          "Valeur": v.type === "HEURE_SUPPLEMENTAIRE" ? `${v.valeur}h` : `${v.valeur} €`,
          "Coût brut": `${cout.coutBrut} €`,
          "Coût entreprise": `${cout.coutEntreprise} €`,
          "Mois": `${v.mois}/${v.annee}`,
          "Statut": v.statut,
          "Saisi le": new Date(v.createdAt).toLocaleDateString("fr-FR"),
          "Validé le": v.dateValidation ? new Date(v.dateValidation).toLocaleDateString("fr-FR") : "",
          "Réinitialisé le": v.dateReset ? new Date(v.dateReset).toLocaleDateString("fr-FR") : "",
        };
      }));
      XLSX.utils.book_append_sheet(wb, wsVariables, "Variables");
    }

    if ((categorie === "tout" || categorie === "absence") && absences.length > 0) {
      const wsAbsences = XLSX.utils.json_to_sheet(absences.map((a) => {
        const jours = Math.ceil((new Date(a.dateFin).getTime() - new Date(a.dateDebut).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return {
          "Entreprise": a.entreprise.nom,
          "Salarié": `${a.salarie.prenom} ${a.salarie.nom}`,
          "Type": TYPES_ABSENCE[a.type] || a.type,
          "Du": new Date(a.dateDebut).toLocaleDateString("fr-FR"),
          "Au": new Date(a.dateFin).toLocaleDateString("fr-FR"),
          "Durée (jours)": jours,
          "Commentaire": a.commentaire || "",
          "Statut": a.statut,
        };
      }));
      XLSX.utils.book_append_sheet(wb, wsAbsences, "Absences");
    }

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="paie-historique.xlsx"`,
      },
    });

    } else if (type === "tickets-facturation" && session.role === "ADMIN") {
  const entreprises = await prisma.entreprise.findMany({
    where: { demo: false },
    include: { abonnement: true },
    orderBy: { nom: "asc" },
  });

  data = entreprises.map((e) => {
    const ticketsInclus = e.abonnement?.ticketsRH || 0;
    const ticketsUtilises = e.ticketsUtilises || 0;
    const ticketsSupp = Math.max(ticketsUtilises - ticketsInclus, 0);
    const prixTicketSupp = e.abonnement?.prixTicketSupp || 0;
    const montantAFacturer = ticketsSupp * prixTicketSupp;

    return {
      "Entreprise": e.nom,
      "Abonnement": e.abonnement?.nom || "—",
      "Tickets inclus": ticketsInclus,
      "Tickets utilisés": ticketsUtilises,
      "Tickets restants": Math.max(ticketsInclus - ticketsUtilises, 0),
      "Tickets supplémentaires": ticketsSupp,
      "Prix ticket supp.": `${prixTicketSupp} €`,
      "Montant à facturer": `${montantAFacturer} €`,
    };
  });
  nomFichier = "tickets-facturation";

    } else if (type === "facturation-mois" && session.role === "ADMIN") {
  const mois = parseInt(searchParams.get("mois") || "0");
  const annee = parseInt(searchParams.get("annee") || "0");

  const facturations = await prisma.facturation.findMany({
    where: { mois, annee, entreprise: { demo: false } },
    include: {
      entreprise: {
        include: {
          abonnement: true,
          abonnementPaie: true,
        },
      },
    },
    orderBy: { entreprise: { nom: "asc" } },
  });

  // Même base que la génération : salariés actifs sur le mois facturé
  const debutMois = new Date(annee, mois - 1, 1);
  const finMois = new Date(annee, mois, 0);

  data = await Promise.all(facturations.map(async (f) => {
    const abo = f.entreprise.abonnement;
    const paie = f.entreprise.abonnementPaie;
    const nbSalaries = await prisma.salarie.count({
      where: {
        entrepriseId: f.entrepriseId,
        statut: "Actif",
        dateDebut: { lte: finMois },
        OR: [{ dateFin: null }, { dateFin: { gte: debutMois } }],
      },
    });
    const salariesSupp = abo ? Math.max(nbSalaries - abo.salariesInclus, 0) : 0;
    const ticketsSupp = abo ? Math.max(f.entreprise.ticketsUtilises - abo.ticketsRH, 0) : 0;
    const bulletinsSupp = paie ? Math.max(nbSalaries - paie.bulletinsInclus, 0) : 0;
    const recrutement = f.commentaire?.includes("Recrutement") ? 400 : 0;

    return {
      "Entreprise": f.entreprise.nom,
      "Mois": `${mois.toString().padStart(2, "0")}/${annee}`,
      "Abonnement RH": abo?.nom || "—",
      "Prix abonnement RH (€)": abo?.prixMensuel || 0,
      "Salariés actifs": nbSalaries,
      "Salariés inclus": abo?.salariesInclus || 0,
      "Salariés supp.": salariesSupp,
      "Prix salarié supp. (€)": abo?.prixSalarieSupp || 0,
      "Coût salariés supp. (€)": salariesSupp * (abo?.prixSalarieSupp || 0),
      "Tickets inclus": abo?.ticketsRH || 0,
      "Tickets utilisés": f.entreprise.ticketsUtilises,
      "Tickets supp.": ticketsSupp,
      "Prix ticket supp. (€)": abo?.prixTicketSupp || 0,
      "Coût tickets supp. (€)": ticketsSupp * (abo?.prixTicketSupp || 0),
      "Formule paie": paie?.nom || "—",
      "Prix formule paie (€)": paie?.prixMensuel || 0,
      "Bulletins (salariés actifs)": paie ? nbSalaries : 0,
      "Bulletins inclus": paie?.bulletinsInclus || 0,
      "Bulletins supp.": bulletinsSupp,
      "Prix bulletin supp. (€)": paie?.prixBulletinSupp || 0,
      "Coût bulletins supp. (€)": bulletinsSupp * (paie?.prixBulletinSupp || 0),
      "Recrutement (€)": recrutement,
      "Total (€)": f.montant,
      "Détail": f.commentaire || "—",
      "Échéance": f.dateLimitePaie ? new Date(f.dateLimitePaie).toLocaleDateString("fr-FR") : "—",
      "Statut": f.statut,
    };
  }));
  nomFichier = `facturation-${mois}-${annee}`;

  } else {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Export");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomFichier}.xlsx"`,
    },
  });
}