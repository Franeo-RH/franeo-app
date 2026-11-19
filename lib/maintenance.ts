// lib/maintenance.ts
// Mode maintenance : FRANEO RH annonce une mise à jour, puis bloque l'application le temps de la faire.
// L'admin garde l'accès. Lecture mise en mémoire quelques secondes pour ne pas solliciter la base à chaque page.

import { prisma } from "@/lib/prisma";

export type EtatMaintenance = { bloque: boolean; annonce: boolean; message: string | null; debut: Date | null; fin: Date | null };

let memoire: { expire: number; etat: EtatMaintenance } | null = null;

export async function etatMaintenance(): Promise<EtatMaintenance> {
  if (memoire && memoire.expire > Date.now()) return memoire.etat;
  let r: { maintenanceActive: boolean; maintenanceMessage: string | null; maintenanceDebut: Date | null; maintenanceFin: Date | null } | null = null;
  try {
    r = await prisma.reglageApp.findUnique({ where: { id: "global" } });
  } catch {
    r = null; // table pas encore créée : pas de maintenance
  }
  const maintenant = new Date();
  const programmeeAtteinte = !!r?.maintenanceDebut && r.maintenanceDebut <= maintenant && (!r.maintenanceFin || r.maintenanceFin > maintenant);
  const etat: EtatMaintenance = {
    bloque: !!r?.maintenanceActive || programmeeAtteinte,
    annonce: !!r?.maintenanceDebut && r.maintenanceDebut > maintenant,
    message: r?.maintenanceMessage ?? null,
    debut: r?.maintenanceDebut ?? null,
    fin: r?.maintenanceFin ?? null,
  };
  memoire = { expire: Date.now() + 10_000, etat };
  return etat;
}

export function oublierMaintenance() {
  memoire = null;
}

export const formatDate = (d: Date | null) => (d ? d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "short" }) : "");
