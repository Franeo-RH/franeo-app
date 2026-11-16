// lib/accidents-serveur.ts
// Accès aux accidents du travail et lecture des formulaires.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { filtreViaSalarie, salarieVisible } from "@/lib/perimetre";
import { QUESTIONS_CPAM, statutAT } from "@/lib/accidents";

export async function accesAccidents() {
  const session = await getSession();
  if (!session) return { ok: false as const, refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  if (session.role === "ADMIN") return { ok: true as const, session, admin: true, filtre: {} as Record<string, unknown>, visible: () => true };
  if (session.role !== "CLIENT" || !session.entrepriseId) return { ok: false as const, refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  if (!aDroit(session.entreprise?.permissions, "rh.accidents")) return { ok: false as const, refus: NextResponse.json({ erreur: "Fonction non activée pour votre compte." }, { status: 403 }) };
  return {
    ok: true as const, session, admin: false,
    filtre: { entrepriseId: session.entrepriseId, ...filtreViaSalarie(session) } as Record<string, unknown>,
    visible: (s: { etablissement?: string | null }) => salarieVisible(session, s),
  };
}

const txt = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) || null : v === null ? null : undefined);
const date = (v: unknown) => {
  if (v === null || v === "") return null;
  if (typeof v !== "string") return undefined;
  const d = new Date(v.length === 10 ? `${v}T12:00:00` : v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};
const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);

/** Champs que le salarié renseigne (aussi modifiables par l'employeur) */
export function champsDeclaration(b: Record<string, unknown>) {
  const d: Record<string, unknown> = {
    type: b.type === "TRAJET" ? "TRAJET" : b.type === "TRAVAIL" ? "TRAVAIL" : undefined,
    dateAccident: date(b.dateAccident),
    heure: txt(b.heure, 10),
    lieu: txt(b.lieu, 300),
    activite: txt(b.activite, 1000),
    circonstances: txt(b.circonstances, 4000),
    siegeLesions: txt(b.siegeLesions, 300),
    natureLesions: txt(b.natureLesions, 300),
    temoins: txt(b.temoins, 1000),
    premierePersonne: txt(b.premierePersonne, 300),
    soins: txt(b.soins, 500),
    arret: bool(b.arret),
    tiers: txt(b.tiers, 1000),
  };
  for (const k of Object.keys(d)) if (d[k] === undefined) delete d[k];
  if (d.dateAccident === null) delete d.dateAccident; // obligatoire
  return d;
}

/** Champs réservés à l'employeur (déclaration, questionnaire CPAM, suite) */
export function champsEmployeur(b: Record<string, unknown>) {
  const d: Record<string, unknown> = {
    connuLe: date(b.connuLe),
    horaires: txt(b.horaires, 300),
    constate: b.constate === "CONSTATE" || b.constate === "DECRIT" ? b.constate : b.constate === null ? null : undefined,
    registreBenins: bool(b.registreBenins),
    datDate: date(b.datDate),
    datReference: txt(b.datReference, 100),
    reserves: txt(b.reserves, 4000),
    questionnaireRecuLe: date(b.questionnaireRecuLe),
    questionnaireEnvoyeLe: date(b.questionnaireEnvoyeLe),
    decision: b.decision === "PRISE_EN_CHARGE" || b.decision === "REFUS" ? b.decision : b.decision === null || b.decision === "" ? null : undefined,
    decisionLe: date(b.decisionLe),
    repriseLe: date(b.repriseLe),
    notes: txt(b.notes, 4000),
  };
  if (b.questionnaire && typeof b.questionnaire === "object") {
    const q = b.questionnaire as Record<string, unknown>;
    d.questionnaire = Object.fromEntries(QUESTIONS_CPAM.map((x) => [x.cle, typeof q[x.cle] === "string" ? String(q[x.cle]).slice(0, 4000) : ""]));
  }
  for (const k of Object.keys(d)) if (d[k] === undefined) delete d[k];
  return d;
}

/** Statut recalculé après une modification (sauf « Clos » choisi à la main) */
export function avecStatut<T extends Record<string, unknown>>(avant: { statut: string; datDate: Date | null; questionnaireRecuLe: Date | null; decision: string | null }, maj: T, clore?: boolean | null) {
  const fusion = { ...avant, ...maj } as { statut: string; datDate: Date | null; questionnaireRecuLe: Date | null; decision: string | null };
  const statut = clore === true ? "CLOS" : clore === false ? statutAT({ ...fusion, statut: "" }) : statutAT(fusion);
  return { ...maj, statut };
}
