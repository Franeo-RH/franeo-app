"use client";

import { useEffect, useState } from "react";

export type RoleRH = { roleRH: string; managerId: string; voitSalairesEquipe: boolean; saisieVariables: boolean };
type Orga = { salaries: { id: string; prenom: string; nom: string; roleRH: string }[]; etablissements: { id: string; nom: string }[]; services: { id: string; nom: string }[] };

let cache: Orga | null = null;
export function useOrganisation() {
  const [orga, setOrga] = useState<Orga | null>(cache);
  useEffect(() => {
    fetch("/api/organisation").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { cache = d; setOrga(d); } }).catch(() => {});
  }, []);
  return orga;
}

const lbl = "block text-sm font-semibold mb-1";
const chp = "w-full border rounded-lg px-4 py-3";

/** Rôle dans l'entreprise (salarié / manager / dirigeant), N+1 et droits du manager */
export function ChampsRoleRH({ valeur, onChange, exclureId }: { valeur: RoleRH; onChange: (v: RoleRH) => void; exclureId?: string }) {
  const orga = useOrganisation();
  const managers = (orga?.salaries || []).filter((s) => s.id !== exclureId);
  return (
    <div className="col-span-2 grid grid-cols-2 gap-6" style={{ background: "#fff7ed", borderRadius: "12px", padding: "16px" }}>
      <div>
        <label className={lbl}>Rôle dans l&apos;entreprise</label>
        <select value={valeur.roleRH} onChange={(e) => onChange({ ...valeur, roleRH: e.target.value })} className={chp}>
          <option value="SALARIE">Salarié</option>
          <option value="MANAGER">Manager</option>
          <option value="DIRIGEANT">Dirigeant</option>
        </select>
      </div>
      <div>
        <label className={lbl}>Manager (N+1)</label>
        <select value={valeur.managerId} onChange={(e) => onChange({ ...valeur, managerId: e.target.value })} className={chp}>
          <option value="">— Aucun (rattaché à la direction)</option>
          {managers.filter((m) => m.roleRH !== "SALARIE").map((m) => <option key={m.id} value={m.id}>{m.prenom} {m.nom}{m.roleRH === "DIRIGEANT" ? " (dirigeant)" : ""}</option>)}
          {managers.filter((m) => m.roleRH === "SALARIE").length > 0 && (
            <optgroup label="Autres salariés">
              {managers.filter((m) => m.roleRH === "SALARIE").map((m) => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}
            </optgroup>
          )}
        </select>
      </div>
      {valeur.roleRH === "MANAGER" && (
        <div className="col-span-2 flex flex-col gap-2 text-sm">
          <p className="font-semibold">Droits du manager (dans son espace salarié)</p>
          <p className="text-gray-500">Il valide les relevés, absences et notes de frais de son équipe, répond à ses questions et fait des extractions.</p>
          <label className="flex items-center gap-2"><input type="checkbox" checked={valeur.voitSalairesEquipe} onChange={(e) => onChange({ ...valeur, voitSalairesEquipe: e.target.checked })} /> Voir les salaires de son équipe</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={valeur.saisieVariables} onChange={(e) => onChange({ ...valeur, saisieVariables: e.target.checked })} /> Saisir les variables de paie de son équipe</label>
        </div>
      )}
      {valeur.roleRH === "DIRIGEANT" && <p className="col-span-2 text-sm text-gray-600">Le dirigeant voit toute l&apos;entreprise dans son espace salarié et valide pour les salariés sans manager.</p>}
    </div>
  );
}

/** Liste déroulante établissement ou service, alimentée par Mon entreprise › Établissements et Gestion RH › Services */
export function ChoixOrganisation({ type, valeur, onChange }: { type: "etablissement" | "service"; valeur: string; onChange: (v: string) => void }) {
  const orga = useOrganisation();
  const liste = (type === "etablissement" ? orga?.etablissements : orga?.services)?.map((x) => x.nom) || [];
  const options = valeur && !liste.includes(valeur) ? [valeur, ...liste] : liste;
  return (
    <div>
      <label className={lbl}>{type === "etablissement" ? "Établissement" : "Service"}</label>
      <select value={valeur} onChange={(e) => onChange(e.target.value)} className={chp}>
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {liste.length === 0 && <p className="text-xs text-gray-400 mt-1">{type === "etablissement" ? "Ajoutez vos établissements dans Mon entreprise." : "Créez vos services dans Gestion RH › Services."}</p>}
    </div>
  );
}
