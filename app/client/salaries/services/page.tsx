"use client";

import { useCallback, useEffect, useState } from "react";
import CadreClient from "@/components/CadreClient";

type S = { id: string; prenom: string; nom: string; poste: string; service: string | null; roleRH: string; managerId: string | null; salaireMensuel: number | null };
type Orga = { salaries: S[]; services: { id: string; nom: string }[] };

const ICONES: Record<string, string> = { DIRIGEANT: "👑", MANAGER: "🧑‍💼", SALARIE: "👤" };

/** Onglet Services : organigramme modifiable en glissant les noms d'une colonne à l'autre */
export default function PageServices() {
  const [orga, setOrga] = useState<Orga | null>(null);
  const [vue, setVue] = useState<"managers" | "services">("managers");
  const [nouveau, setNouveau] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);
  const [glisse, setGlisse] = useState<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const d = await fetch("/api/organisation").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setOrga(d);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  async function deplacer(salarieId: string, colonne: string) {
    const corps = vue === "managers" ? { salarieId, managerId: colonne === "_aucun" ? null : colonne } : { salarieId, service: colonne === "_aucun" ? null : colonne };
    const res = await fetch("/api/organisation", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, texte: "✅ Organigramme mis à jour" } : { ok: false, texte: d.erreur || "Erreur" });
    charger();
  }

  async function ajouterService(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom: nouveau }) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, texte: "✅ Service ajouté" } : { ok: false, texte: d.erreur || "Erreur" });
    if (res.ok) setNouveau("");
    charger();
  }

  const salaries = orga?.salaries || [];
  const colonnes: { cle: string; titre: string; sous?: string; supprimerId?: string }[] = vue === "managers"
    ? [
        ...salaries.filter((s) => s.roleRH !== "SALARIE" || salaries.some((x) => x.managerId === s.id))
          .sort((a, b) => (a.roleRH === "DIRIGEANT" ? -1 : 0) - (b.roleRH === "DIRIGEANT" ? -1 : 0))
          .map((m) => ({ cle: m.id, titre: `${ICONES[m.roleRH] || ""} ${m.prenom} ${m.nom}`, sous: m.poste })),
        { cle: "_aucun", titre: "Sans manager", sous: "rattachés à la direction" },
      ]
    : [...(orga?.services || []).map((sv) => ({ cle: sv.nom, titre: sv.nom, supprimerId: sv.id })), { cle: "_aucun", titre: "Sans service" }];

  const membres = (cle: string) => salaries.filter((s) => (vue === "managers" ? (s.managerId ?? "_aucun") === cle : (s.service ?? "_aucun") === cle || (cle === "_aucun" && !!s.service && !(orga?.services || []).some((x) => x.nom === s.service))));

  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">🧩 Services & organigramme</h1>
        <p className="text-gray-500 mt-1">Glissez un nom d&apos;une colonne à l&apos;autre pour changer son manager (N+1) ou son service. Chaque manager valide ensuite les relevés, absences et frais de son équipe.</p>
        <div className="flex gap-2 mt-4 flex-wrap items-center">
          <button type="button" onClick={() => setVue("managers")} className={`px-4 py-2 rounded-lg font-semibold ${vue === "managers" ? "bg-orange-500 text-white" : "bg-gray-100"}`}>🧑‍💼 Par manager</button>
          <button type="button" onClick={() => setVue("services")} className={`px-4 py-2 rounded-lg font-semibold ${vue === "services" ? "bg-orange-500 text-white" : "bg-gray-100"}`}>🧩 Par service</button>
          <form onSubmit={ajouterService} className="flex gap-2 ml-auto">
            <input value={nouveau} onChange={(e) => setNouveau(e.target.value)} placeholder="Nouveau service" className="border rounded-lg px-3 py-2" aria-label="Nom du service" />
            <button type="submit" disabled={!nouveau.trim()} className="bg-black text-white px-4 py-2 rounded-lg font-semibold">➕ Ajouter</button>
          </form>
        </div>
        {msg && <p className="text-sm font-semibold mt-3" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.texte}</p>}
        {vue === "managers" && <p className="text-xs text-gray-400 mt-2">Pour faire apparaître une nouvelle colonne, passez le salarié en « Manager » ou « Dirigeant » dans sa fiche (onglet Poste).</p>}
      </div>

      {!orga ? <p className="text-gray-500">Chargement…</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "16px" }}>
          {colonnes.map((c) => (
            <div
              key={c.cle}
              onDragOver={(e) => { e.preventDefault(); setSurvol(c.cle); }}
              onDragLeave={() => setSurvol(null)}
              onDrop={(e) => { e.preventDefault(); setSurvol(null); const id = e.dataTransfer.getData("text/plain") || glisse; if (id) deplacer(id, c.cle); setGlisse(null); }}
              className="bg-white rounded-xl shadow p-4 flex flex-col gap-2"
              style={{ minHeight: "160px", outline: survol === c.cle ? "3px dashed #f97316" : "none" }}
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-bold">{c.titre}</p>
                  {c.sous && <p className="text-xs text-gray-500">{c.sous}</p>}
                </div>
                {c.supprimerId && (
                  <button type="button" aria-label={`Supprimer le service ${c.titre}`} onClick={async () => { if (confirm(`Supprimer le service « ${c.titre} » ? Les salariés passeront « sans service ».`)) { await fetch(`/api/services/${c.supprimerId}`, { method: "DELETE" }); charger(); } }} className="text-gray-400 hover:text-red-600">🗑️</button>
                )}
              </div>
              {membres(c.cle).map((s) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", s.id); setGlisse(s.id); }}
                  className="border rounded-lg px-3 py-2 text-sm bg-gray-50 cursor-grab"
                  style={{ opacity: glisse === s.id ? 0.4 : 1 }}
                >
                  <span className="font-semibold">{ICONES[s.roleRH] || "👤"} {s.prenom} {s.nom}</span>
                  <span className="block text-xs text-gray-500">{s.poste}{vue === "managers" && s.service ? ` · ${s.service}` : ""}</span>
                  {/* Sur téléphone (pas de glisser-déposer) : liste déroulante */}
                  <select
                    aria-label={`Déplacer ${s.prenom} ${s.nom}`}
                    value=""
                    onChange={(e) => e.target.value && deplacer(s.id, e.target.value)}
                    className="md:hidden mt-1 w-full border rounded px-2 py-1 text-xs"
                  >
                    <option value="">Déplacer vers…</option>
                    {colonnes.filter((x) => x.cle !== c.cle && x.cle !== s.id).map((x) => <option key={x.cle} value={x.cle}>{x.titre}</option>)}
                  </select>
                </div>
              ))}
              {membres(c.cle).length === 0 && <p className="text-xs text-gray-400">Déposez un nom ici</p>}
            </div>
          ))}
        </div>
      )}
    </CadreClient>
  );
}
