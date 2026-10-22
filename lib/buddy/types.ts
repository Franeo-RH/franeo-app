// lib/buddy/types.ts
// Types partagés par tous les modules de Buddy.

import type { Abonnement, AbonnementPaie } from "@prisma/client";
import type { Msg } from "./outils";

export type Humeur = "content" | "neutre" | "reflechit" | "triste";

export interface Lien {
  label: string;
  href: string;
}

/** Ce que l'API renvoie au widget. `reponse` suffit : le reste est optionnel. */
export interface ReponseBuddy {
  reponse: string;
  suggestions?: string[]; // boutons de réponse rapide
  liens?: Lien[]; // boutons "Voir la page"
  redirection?: string; // le widget fait router.push(redirection)
  humeur?: Humeur; // pour animer les yeux de Buddy
}

export type Data = Record<string, any>;

export interface ListeCtx {
  type: "actus" | "tickets" | "support";
  items: { id: string; label: string }[];
}

/** Mémoire de la conversation (enregistrée en base, table BuddyContexte). */
export interface Ctx {
  flow?: string; // flux en cours (ex: "absence_ajout")
  etape?: string; // champ attendu ou "confirmer"
  data: Data; // données déjà collectées
  echecs: number; // réponses non comprises à la suite
  liste?: ListeCtx; // dernière liste affichée ("le 2", "résume la 3"…)
  dernierSalarieId?: string; // pour "lui", "elle"
  maj: number; // horodatage (expiration)
}

export interface SalarieLite {
  id: string;
  prenom: string;
  nom: string;
  poste: string;
  statut: string;
  typeContrat: string | null;
  dateDebut: Date | null;
  dateFin: Date | null;
  salaireMensuel: number | null;
  salaireAnnuel: number | null;
  email: string | null;
  telephone: string | null;
  heuresHebdomadaires: number | null;
}

export interface EntrepriseLite {
  id: string;
  nom: string;
  permissions: string[];
  ticketsUtilises: number;
  bulletinsUtilises: number;
  abonnementId: string | null;
  abonnementPaieId: string | null;
  abonnement: Abonnement | null;
  abonnementPaie: AbonnementPaie | null;
}

export interface SessionLite {
  id: string;
  prenom: string;
  entrepriseId: string;
}

export interface Env {
  session: SessionLite;
  entreprise: EntrepriseLite;
  salaries: SalarieLite[];
  today: { y: number; m: number; d: number; iso: string };
  now: Date;
  dernierSalarieId?: string;
}

export type ModuleBuddy = "salaries" | "absences" | "paie" | "tickets" | "helpdesk" | "entreprise" | "libre";

/* ───────────── Moteur de flux (conversation guidée) ───────────── */

export interface ModeExtraction {
  attendu: boolean; // ce champ est justement celui qu'on vient de demander
  ecraser: boolean; // on est à l'étape de confirmation : on corrige un champ déjà rempli
}

export interface Slot {
  cle: string;
  /** Faut-il demander ce champ (selon les autres données) ? */
  requis: (d: Data, env: Env) => boolean;
  rempli: (d: Data) => boolean;
  /** Essaie de lire la valeur dans le message. Renvoie true si quelque chose a été compris. */
  extraire: (m: Msg, d: Data, env: Env, mode: ModeExtraction) => Promise<boolean>;
  question: (d: Data, env: Env) => string | Promise<string>;
  suggestions?: (d: Data, env: Env) => string[];
  /** Champ facultatif : l'utilisateur peut répondre "passer". */
  optionnel?: boolean;
  /** Texte libre : on ne cherche jamais autre chose dans la réponse. */
  texteLibre?: boolean;
}

export interface Verification {
  message: string;
  reset?: string[]; // champs à redemander
}

export interface Flow {
  id: string;
  module: ModuleBuddy;
  slots: Slot[];
  /** Contrôles avant de démarrer (ex: demande déjà en attente). Renvoyer une réponse arrête le flux. */
  demarrer?: (m: Msg, d: Data, env: Env) => Promise<ReponseBuddy | null>;
  /** Contrôles juste avant la confirmation (ex: chevauchement d'absence). */
  verifier?: (d: Data, env: Env) => Promise<Verification | null>;
  confirmation: (d: Data, env: Env) => string | Promise<string>;
  executer: (d: Data, env: Env) => Promise<ReponseBuddy>;
  /** Phrase affichée quand l'utilisateur annule. */
  annulation?: string;
}
