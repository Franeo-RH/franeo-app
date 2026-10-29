"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarresGroupees, BarresHorizontales, Camembert, Courbe, Histogramme, Jauge } from "@/components/GraphiquesRH";

type Indicateurs = {
  periode: { debut: string; fin: string; joursOuvres: number };
  workforce: { total: number; cdi: number; cdd: number; alternants: number; stagiaires: number; autres: number; ancienneteMoyenne: number };
  movements: { entrees: number; sorties: number };
  absences: { tauxAbsenteisme: number | null; joursTotal: number; joursOuvres: number; parMotif: { motif: string; jours: number }[] };
  leaveBalances: { soldeTotal: number | null; salariesAvecSolde: number; demandesEnAttente: number; joursPlanifies: number };
  overtime: { heuresTotal: number; salaries: number; joursTeletravail: number };
  bonuses: { total: number; moyenneParSalarie: number; budget: number | null; tauxConsommation: number | null };
  interviews: { prevus: number; realises: number; pourcentage: number | null };
  trainings: { heures: number; cout: number; budget: number | null; tauxConsommation: number | null; nombre: number };
  series: { granularite: "jour" | "semaine" | "mois"; points: { label: string; effectif: number; absences: number; entrees: number; sorties: number; teletravail: number }[] };
  mensuel: { label: string; dansPeriode: boolean; primes: number; heuresSupp: number }[];
  repartitions: Record<"contrats" | "effectifParService" | "effectifParEtablissement" | "absencesParService" | "heuresSuppParSalarie" | "primesParService", { label: string; valeur: number }[]>;
  detail: { vue: string; colonnes: { cle: string; label: string; type?: string }[]; lignes: Record<string, string | number | null>[]; total: number; page: number; parPage: number } | null;
  options: { societes: { id: string; nom: string }[]; etablissements: string[]; services: string[]; salaries: { id: string; nom: string }[] } | null;
  admin: boolean;
};

const PERIODES = [
  { v: "aujourdhui", l: "Aujourd'hui" }, { v: "mois", l: "Ce mois" }, { v: "mois-precedent", l: "Mois précédent" },
  { v: "annee", l: "Cette année" }, { v: "annee-precedente", l: "Année précédente" }, { v: "personnalisee", l: "Période personnalisée" },
];
const VUES = [
  { v: "effectif", l: "👥 Effectif" }, { v: "mouvements", l: "🔄 Mouvements" }, { v: "absences", l: "🏖️ Absences" },
  { v: "heures", l: "⏰ Heures supp" }, { v: "primes", l: "💶 Primes" }, { v: "formations", l: "🎓 Formations" }, { v: "entretiens", l: "🗣️ Entretiens" },
];

const nb = (n: number | null | undefined, suffixe = "") => (n === null || n === undefined ? "—" : `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}${suffixe}`);
const champ: React.CSSProperties = { border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px 10px", fontSize: "14px", background: "#ffffff", minWidth: 0 };

function Chiffre({ label, valeur, couleur = "#111827" }: { label: string; valeur: string; couleur?: string }) {
  return (
    <div style={{ background: "#f9fafb", borderRadius: "10px", padding: "6px 10px", minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</p>
      <p style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: couleur, lineHeight: 1.2 }}>{valeur}</p>
    </div>
  );
}

/** Un bloc d'indicateurs : quelques chiffres clés puis un ou plusieurs graphiques */
function Panneau({ titre, chiffres, children, large = false }: { titre: string; chiffres: React.ReactNode; children: React.ReactNode; large?: boolean }) {
  return (
    <section className="bg-white rounded-xl shadow" style={{ padding: "14px", minWidth: 0, gridColumn: large ? "1 / -1" : undefined, display: "flex", flexDirection: "column", gap: "10px" }}>
      <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 800 }}>{titre}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))", gap: "6px" }}>{chiffres}</div>
      {children}
    </section>
  );
}

function SousGraphique({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>{titre}</p>
      {children}
    </div>
  );
}

export default function IndicateursRH() {
  const [f, setF] = useState({ period: "mois", startDate: "", endDate: "", companyId: "", establishmentId: "", departmentId: "", employeeId: "", contractType: "", status: "" });
  const [vue, setVue] = useState("effectif");
  const [table, setTable] = useState({ page: 1, pageSize: 20, q: "", sort: "", dir: "asc", col: "", val: "" });
  const [data, setData] = useState<Indicateurs | null>(null);
  const [options, setOptions] = useState<Indicateurs["options"]>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [budgets, setBudgets] = useState({ budgetPrimesAnnuel: "", budgetFormationAnnuel: "" });
  const [formation, setFormation] = useState({ salarieId: "", intitule: "", date: "", heures: "", cout: "" });
  const [message, setMessage] = useState("");

  const params = useMemo(() => {
    const q = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v) q.set(k, v); });
    return q;
  }, [f]);

  const charger = useCallback(async (avecOptions: boolean) => {
    setChargement(true);
    setErreur("");
    const q = new URLSearchParams(params);
    q.set("view", vue);
    Object.entries(table).forEach(([k, v]) => { if (v !== "" && v !== undefined) q.set(k, String(v)); });
    if (avecOptions) q.set("options", "1");
    const res = await fetch(`/api/hr/indicators?${q}`);
    const d = await res.json().catch(() => ({}));
    setChargement(false);
    if (!res.ok) { setErreur(d.erreur || "Chargement impossible"); return; }
    setData(d);
    if (d.options) setOptions(d.options);
  }, [params, vue, table]);

  // Les options (sociétés, services…) changent seulement avec la société choisie
  useEffect(() => { charger(true); }, [f.companyId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => charger(false), 250); return () => clearTimeout(t); }, [charger]);

  // Budgets de la société (client : la sienne ; admin : celle choisie)
  useEffect(() => {
    if (!data) return;
    if (data.admin && !f.companyId) return;
    fetch(`/api/hr/budgets${f.companyId ? `?entrepriseId=${f.companyId}` : ""}`).then((r) => r.json()).then((b) => setBudgets({ budgetPrimesAnnuel: b.budgetPrimesAnnuel ?? "", budgetFormationAnnuel: b.budgetFormationAnnuel ?? "" })).catch(() => {});
  }, [f.companyId, data?.admin]); // eslint-disable-line react-hooks/exhaustive-deps

  const maj = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v, ...(k === "companyId" ? { establishmentId: "", departmentId: "", employeeId: "" } : {}) })); setTable((t) => ({ ...t, page: 1 })); };
  const trier = (cle: string) => setTable((t) => ({ ...t, sort: cle, dir: t.sort === cle && t.dir === "asc" ? "desc" : "asc", page: 1 }));

  function exporter(format: "xlsx" | "csv") {
    const q = new URLSearchParams(params);
    q.set("format", format);
    q.set("view", vue);
    ["q", "sort", "dir", "col", "val"].forEach((k) => { const v = table[k as keyof typeof table]; if (v) q.set(k, String(v)); });
    window.location.href = `/api/hr/indicators/export?${q}`;
  }

  async function enregistrerBudgets() {
    const res = await fetch("/api/hr/budgets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...budgets, entrepriseId: f.companyId }) });
    setMessage(res.ok ? "✅ Budgets enregistrés" : "❌ Enregistrement impossible");
    if (res.ok) charger(false);
  }

  async function ajouterFormation(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/hr/formations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formation) });
    const d = await res.json().catch(() => ({}));
    setMessage(res.ok ? "✅ Formation ajoutée" : `❌ ${d.erreur || "Erreur"}`);
    if (res.ok) { setFormation({ salarieId: "", intitule: "", date: "", heures: "", cout: "" }); charger(false); }
  }

  async function supprimerFormation(id: string) {
    if (!confirm("Supprimer cette formation ?")) return;
    await fetch(`/api/hr/formations?id=${id}`, { method: "DELETE" });
    charger(false);
  }

  const d = data;
  const det = d?.detail;
  const colsVisibles = det?.colonnes.filter((c) => c.label) ?? [];
  const pages = det ? Math.max(Math.ceil(det.total / det.parPage), 1) : 1;
  const peutBudget = !!d && (!d.admin || !!f.companyId);
  const libGran = d?.series.granularite === "jour" ? "par jour" : d?.series.granularite === "semaine" ? "par semaine" : "par mois";

  return (
    <div className="fr-indicateurs" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="bg-white rounded-xl shadow p-5" style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h1 className="text-2xl font-bold">📈 Indicateurs RH</h1>
          {d && <p className="text-sm text-gray-500">Du {new Date(d.periode.debut).toLocaleDateString("fr-FR")} au {new Date(d.periode.fin).toLocaleDateString("fr-FR")} · {d.periode.joursOuvres} jours ouvrés</p>}
        </div>
        <div className="fr-pas-imprimer" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" onClick={() => exporter("xlsx")} style={{ ...champ, fontWeight: 700, color: "#15803d", borderColor: "#16a34a", cursor: "pointer" }}>📥 Excel</button>
          <button type="button" onClick={() => exporter("csv")} style={{ ...champ, fontWeight: 700, cursor: "pointer" }}>📄 CSV</button>
          <button type="button" onClick={() => window.print()} style={{ ...champ, fontWeight: 700, color: "#b91c1c", borderColor: "#fecaca", cursor: "pointer" }} title="Choisissez « Enregistrer au format PDF » dans la fenêtre d'impression">🖨️ PDF</button>
        </div>
      </div>

      {/* 1. Filtres */}
      <div className="bg-white rounded-xl shadow p-4 fr-pas-imprimer" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "8px" }}>
        <select aria-label="Période" value={f.period} onChange={(e) => maj("period", e.target.value)} style={champ}>
          {PERIODES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
        {f.period === "personnalisee" && (
          <>
            <input type="date" aria-label="Du" value={f.startDate} onChange={(e) => maj("startDate", e.target.value)} style={champ} />
            <input type="date" aria-label="Au" value={f.endDate} onChange={(e) => maj("endDate", e.target.value)} style={champ} />
          </>
        )}
        {d?.admin && (
          <select aria-label="Société" value={f.companyId} onChange={(e) => maj("companyId", e.target.value)} style={champ}>
            <option value="">Toutes les sociétés</option>
            {options?.societes.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        )}
        <select aria-label="Établissement" value={f.establishmentId} onChange={(e) => maj("establishmentId", e.target.value)} style={champ}>
          <option value="">Tous les établissements</option>
          {options?.etablissements.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Service" value={f.departmentId} onChange={(e) => maj("departmentId", e.target.value)} style={champ}>
          <option value="">Tous les services</option>
          {options?.services.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Salarié" value={f.employeeId} onChange={(e) => maj("employeeId", e.target.value)} style={champ}>
          <option value="">Tous les salariés</option>
          {options?.salaries.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>
        <select aria-label="Contrat" value={f.contractType} onChange={(e) => maj("contractType", e.target.value)} style={champ}>
          <option value="">Tous les contrats</option>
          {["CDI", "CDD", "Alternant", "Stagiaire"].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label="Statut" value={f.status} onChange={(e) => maj("status", e.target.value)} style={champ}>
          <option value="">Actifs et sortis</option>
          <option value="Actif">Actifs</option>
          <option value="Sorti">Sortis</option>
        </select>
      </div>

      {erreur && <div className="bg-white rounded-xl shadow p-6 text-center text-red-600 font-semibold">{erreur}</div>}
      {!d && !erreur && <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">Chargement des indicateurs…</div>}

      {d && d.workforce.total === 0 && d.movements.entrees === 0 && d.movements.sorties === 0 && (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">📭 Aucune donnée pour ces filtres. Essayez une autre période ou retirez un filtre.</div>
      )}

      {d && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", opacity: chargement ? 0.6 : 1, transition: "opacity 0.2s" }}>
          {/* 2. Indicateurs en graphiques (tout suit les filtres) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(330px, 100%), 1fr))", gap: "12px" }}>
            <Panneau titre="👥 Effectif" chiffres={<>
              <Chiffre label="Effectif total" valeur={nb(d.workforce.total)} couleur="#ea580c" />
              <Chiffre label="CDI" valeur={nb(d.workforce.cdi)} />
              <Chiffre label="CDD" valeur={nb(d.workforce.cdd)} />
              <Chiffre label="Alternants" valeur={nb(d.workforce.alternants)} />
              <Chiffre label="Ancienneté moy." valeur={nb(d.workforce.ancienneteMoyenne, " an")} />
            </>}>
              <SousGraphique titre={`Évolution de l'effectif (${libGran})`}><Courbe points={d.series.points.map((x) => ({ label: x.label, valeur: x.effectif }))} /></SousGraphique>
              <SousGraphique titre="Répartition par contrat"><Camembert parts={d.repartitions.contrats} /></SousGraphique>
            </Panneau>

            <Panneau titre="🏢 Organisation" chiffres={<>
              <Chiffre label="Services" valeur={nb(d.repartitions.effectifParService.length)} />
              <Chiffre label="Établissements" valeur={nb(d.repartitions.effectifParEtablissement.length)} />
            </>}>
              <SousGraphique titre="Effectif par service"><BarresHorizontales points={d.repartitions.effectifParService} /></SousGraphique>
              <SousGraphique titre="Effectif par établissement"><BarresHorizontales points={d.repartitions.effectifParEtablissement} couleur="#3b82f6" /></SousGraphique>
            </Panneau>

            <Panneau titre="🔄 Mouvements" chiffres={<>
              <Chiffre label="Entrées" valeur={nb(d.movements.entrees)} couleur="#059669" />
              <Chiffre label="Sorties" valeur={nb(d.movements.sorties)} couleur="#dc2626" />
              <Chiffre label="Solde" valeur={nb(d.movements.entrees - d.movements.sorties)} />
            </>}>
              <SousGraphique titre={`Entrées et sorties (${libGran})`}>
                <BarresGroupees points={d.series.points.map((x) => ({ label: x.label, a: x.entrees, b: x.sorties }))} series={[{ nom: "Entrées", couleur: "#10b981" }, { nom: "Sorties", couleur: "#ef4444" }]} />
              </SousGraphique>
            </Panneau>

            <Panneau titre="🏖️ Absences" chiffres={<>
              <Chiffre label="Absentéisme" valeur={nb(d.absences.tauxAbsenteisme, " %")} couleur="#dc2626" />
              <Chiffre label="Jours d'absence" valeur={nb(d.absences.joursTotal)} />
              <Chiffre label="Jours ouvrés" valeur={nb(d.absences.joursOuvres)} />
            </>}>
              <SousGraphique titre={`Jours d'absence (${libGran})`}><Histogramme points={d.series.points.map((x) => ({ label: x.label, valeur: x.absences }))} couleur="#ef4444" unite=" j" /></SousGraphique>
              <SousGraphique titre="Motifs d'absence"><Camembert parts={d.absences.parMotif.map((m) => ({ label: m.motif, valeur: m.jours }))} unite=" j" /></SousGraphique>
              <SousGraphique titre="Jours d'absence par service"><BarresHorizontales points={d.repartitions.absencesParService} couleur="#ef4444" unite=" j" /></SousGraphique>
            </Panneau>

            <Panneau titre="🌴 Congés" chiffres={<>
              <Chiffre label="Solde restant" valeur={d.leaveBalances.soldeTotal === null ? "—" : nb(d.leaveBalances.soldeTotal, " j")} couleur="#2563eb" />
              <Chiffre label="En attente" valeur={nb(d.leaveBalances.demandesEnAttente)} couleur="#d97706" />
              <Chiffre label="Planifiés à venir" valeur={nb(d.leaveBalances.joursPlanifies, " j")} />
            </>}>
              <SousGraphique titre="Congés : à prendre, demandés, planifiés">
                <BarresHorizontales points={[
                  { label: "Solde restant", valeur: d.leaveBalances.soldeTotal ?? 0 },
                  { label: "Jours planifiés", valeur: d.leaveBalances.joursPlanifies },
                  { label: "Demandes en attente", valeur: d.leaveBalances.demandesEnAttente },
                ].filter((x) => x.valeur > 0)} couleur="#3b82f6" />
              </SousGraphique>
              {d.leaveBalances.soldeTotal === null && <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>Solde de congés non renseigné dans les fiches salariés.</p>}
            </Panneau>

            <Panneau titre="⏰ Temps de travail" chiffres={<>
              <Chiffre label="Heures supp" valeur={nb(d.overtime.heuresTotal, " h")} couleur="#7c3aed" />
              <Chiffre label="Salariés concernés" valeur={nb(d.overtime.salaries)} />
              <Chiffre label="Télétravail" valeur={nb(d.overtime.joursTeletravail, " j")} couleur="#059669" />
            </>}>
              <SousGraphique titre="Heures supp par mois (période en couleur)"><Histogramme points={d.mensuel.map((x) => ({ label: x.label, valeur: x.heuresSupp, attenue: !x.dansPeriode }))} couleur="#8b5cf6" unite=" h" /></SousGraphique>
              <SousGraphique titre="Heures supp par salarié"><BarresHorizontales points={d.repartitions.heuresSuppParSalarie} couleur="#8b5cf6" unite=" h" /></SousGraphique>
              <SousGraphique titre={`Jours de télétravail (${libGran})`}><Histogramme points={d.series.points.map((x) => ({ label: x.label, valeur: x.teletravail }))} couleur="#10b981" unite=" j" /></SousGraphique>
            </Panneau>

            <Panneau titre="💶 Rémunération variable" chiffres={<>
              <Chiffre label="Primes versées" valeur={nb(d.bonuses.total, " €")} couleur="#d97706" />
              <Chiffre label="Moyenne / salarié" valeur={nb(d.bonuses.moyenneParSalarie, " €")} />
            </>}>
              <Jauge label="Budget primes consommé" pourcentage={d.bonuses.tauxConsommation} detail={d.bonuses.budget ? `${nb(d.bonuses.total, " €")} sur ${nb(d.bonuses.budget, " €")} (prorata de la période)` : "Aucun budget défini (voir plus bas)"} />
              <SousGraphique titre="Primes par mois (période en couleur)"><Histogramme points={d.mensuel.map((x) => ({ label: x.label, valeur: x.primes, attenue: !x.dansPeriode }))} couleur="#f59e0b" unite=" €" /></SousGraphique>
              <SousGraphique titre="Primes par service"><BarresHorizontales points={d.repartitions.primesParService} couleur="#f59e0b" unite=" €" /></SousGraphique>
            </Panneau>

            <Panneau titre="🗣️ Entretiens & formation" chiffres={<>
              <Chiffre label="Entretiens prévus" valeur={nb(d.interviews.prevus)} />
              <Chiffre label="Réalisés" valeur={nb(d.interviews.realises)} couleur="#059669" />
              <Chiffre label="Heures de formation" valeur={nb(d.trainings.heures, " h")} couleur="#2563eb" />
              <Chiffre label="Coût formation" valeur={nb(d.trainings.cout, " €")} />
            </>}>
              <Jauge label="Entretiens réalisés" pourcentage={d.interviews.pourcentage} detail={`${d.interviews.realises} sur ${d.interviews.prevus} prévus sur la période`} />
              <Jauge label="Budget formation consommé" pourcentage={d.trainings.tauxConsommation} detail={d.trainings.budget ? `${nb(d.trainings.cout, " €")} sur ${nb(d.trainings.budget, " €")}` : "Aucun budget défini (voir plus bas)"} />
            </Panneau>
          </div>

          {/* 4. Tableau détaillé */}
          <div className="bg-white rounded-xl shadow p-4" style={{ minWidth: 0 }}>
            <div role="tablist" className="fr-pas-imprimer" style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
              {VUES.map((v) => (
                <button key={v.v} type="button" role="tab" aria-selected={vue === v.v} onClick={() => { setVue(v.v); setTable((t) => ({ ...t, page: 1, sort: "", col: "", val: "" })); }}
                  style={{ border: "none", borderRadius: "999px", padding: "6px 12px", fontSize: "13px", fontWeight: 700, cursor: "pointer", background: vue === v.v ? "#f97316" : "#f3f4f6", color: vue === v.v ? "#ffffff" : "#374151" }}>
                  {v.l}
                </button>
              ))}
            </div>
            <div className="fr-pas-imprimer" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
              <input type="search" placeholder="🔍 Recherche globale" value={table.q} onChange={(e) => setTable((t) => ({ ...t, q: e.target.value, page: 1 }))} style={{ ...champ, flex: "1 1 200px" }} aria-label="Recherche" />
              <select aria-label="Colonne filtrée" value={table.col} onChange={(e) => setTable((t) => ({ ...t, col: e.target.value, page: 1 }))} style={champ}>
                <option value="">Filtrer une colonne…</option>
                {colsVisibles.map((c) => <option key={c.cle} value={c.cle}>{c.label}</option>)}
              </select>
              {table.col && <input placeholder="contient…" value={table.val} onChange={(e) => setTable((t) => ({ ...t, val: e.target.value, page: 1 }))} style={champ} aria-label="Valeur du filtre" />}
              <select aria-label="Lignes par page" value={table.pageSize} onChange={(e) => setTable((t) => ({ ...t, pageSize: Number(e.target.value), page: 1 }))} style={champ}>
                {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
            </div>

            {vue === "formations" && options && (
              <form onSubmit={ajouterFormation} className="fr-pas-imprimer" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "8px", background: "#f9fafb", padding: "10px", borderRadius: "10px", marginBottom: "10px" }}>
                <select required value={formation.salarieId} onChange={(e) => setFormation({ ...formation, salarieId: e.target.value })} style={champ} aria-label="Salarié formé">
                  <option value="">Salarié…</option>
                  {options.salaries.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
                <input required placeholder="Intitulé" value={formation.intitule} onChange={(e) => setFormation({ ...formation, intitule: e.target.value })} style={champ} aria-label="Intitulé" />
                <input required type="date" value={formation.date} onChange={(e) => setFormation({ ...formation, date: e.target.value })} style={champ} aria-label="Date" />
                <input required inputMode="decimal" placeholder="Heures" value={formation.heures} onChange={(e) => setFormation({ ...formation, heures: e.target.value })} style={champ} aria-label="Heures" />
                <input inputMode="decimal" placeholder="Coût (€)" value={formation.cout} onChange={(e) => setFormation({ ...formation, cout: e.target.value })} style={champ} aria-label="Coût" />
                <button type="submit" style={{ ...champ, background: "#f97316", color: "#ffffff", border: "none", fontWeight: 700, cursor: "pointer" }}>➕ Ajouter</button>
              </form>
            )}

            {!det || det.lignes.length === 0 ? (
              <p style={{ textAlign: "center", color: "#9ca3af", padding: "24px 0", margin: 0 }}>📭 Aucune ligne pour ces critères.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b text-gray-500">
                      {colsVisibles.map((c) => (
                        <th key={c.cle} className="py-2 pr-3" style={{ cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => trier(c.cle)} aria-sort={table.sort === c.cle ? (table.dir === "asc" ? "ascending" : "descending") : "none"}>
                          {c.label} {table.sort === c.cle ? (table.dir === "asc" ? "▲" : "▼") : ""}
                        </th>
                      ))}
                      {vue === "formations" && <th className="py-2"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {det.lignes.map((l, i) => (
                      <tr key={i} className="border-b">
                        {colsVisibles.map((c) => (
                          <td key={c.cle} className="py-2 pr-3">
                            {l[c.cle] === null || l[c.cle] === "" ? "—" : c.type === "date" ? new Date(String(l[c.cle])).toLocaleDateString("fr-FR") : typeof l[c.cle] === "number" ? Number(l[c.cle]).toLocaleString("fr-FR") : String(l[c.cle])}
                          </td>
                        ))}
                        {vue === "formations" && <td className="py-2"><button type="button" onClick={() => supprimerFormation(String(l.id))} aria-label="Supprimer la formation" className="text-red-600">🗑️</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {det && det.total > 0 && (
              <div className="fr-pas-imprimer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", fontSize: "13px", flexWrap: "wrap", gap: "8px" }}>
                <span>{det.total} ligne(s) · page {det.page} / {pages}</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button type="button" disabled={det.page <= 1} onClick={() => setTable((t) => ({ ...t, page: t.page - 1 }))} style={{ ...champ, cursor: "pointer", opacity: det.page <= 1 ? 0.4 : 1 }}>◀ Précédente</button>
                  <button type="button" disabled={det.page >= pages} onClick={() => setTable((t) => ({ ...t, page: t.page + 1 }))} style={{ ...champ, cursor: "pointer", opacity: det.page >= pages ? 0.4 : 1 }}>Suivante ▶</button>
                </div>
              </div>
            )}
          </div>

          {/* Budgets annuels */}
          <div className="bg-white rounded-xl shadow p-4 fr-pas-imprimer">
            <h3 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 700 }}>🎯 Budgets annuels {d.admin && !f.companyId ? "(choisissez une société pour les modifier)" : ""}</h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ fontSize: "13px" }}>Primes (€/an) <input disabled={!peutBudget} inputMode="decimal" value={budgets.budgetPrimesAnnuel} onChange={(e) => setBudgets({ ...budgets, budgetPrimesAnnuel: e.target.value })} style={{ ...champ, width: "120px", marginLeft: "4px" }} /></label>
              <label style={{ fontSize: "13px" }}>Formation (€/an) <input disabled={!peutBudget} inputMode="decimal" value={budgets.budgetFormationAnnuel} onChange={(e) => setBudgets({ ...budgets, budgetFormationAnnuel: e.target.value })} style={{ ...champ, width: "120px", marginLeft: "4px" }} /></label>
              <button type="button" disabled={!peutBudget} onClick={enregistrerBudgets} style={{ ...champ, background: "#111827", color: "#ffffff", border: "none", fontWeight: 700, cursor: "pointer", opacity: peutBudget ? 1 : 0.4 }}>Enregistrer</button>
              {message && <span style={{ fontSize: "13px", fontWeight: 600 }}>{message}</span>}
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#9ca3af" }}>Établissement et service se renseignent dans la fiche de chaque salarié (bouton Modifier) ; le solde de congés est mis à jour par FRANEO RH.</p>
          </div>
        </div>
      )}
    </div>
  );
}
