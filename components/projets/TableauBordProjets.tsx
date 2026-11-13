"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NOMS_MOIS_COURTS, STATUTS_PROJET } from "@/lib/projets-constantes";
import { Anneau, Graphique, Legende } from "./Graphiques";
import { couleurMarge, dateFR, eur, h, Jauge, PastilleStatut, pct, Tuile } from "./outils";

type Mois = { mois: number; heures: number; cumulHeures: number; coutMO?: number; frais?: number; cout?: number; ca?: number; marge?: number; facture?: number; encaisse?: number; cumulCA?: number; cumulCout?: number; cumulMarge?: number; cumulFacture?: number };
type PR = { id: string; nom: string; couleur: string; statut: string; client: string | null; tauxMargeReelle: number | null; tauxProjection: number | null; margeReelle: number; vendu: number; consommation: number | null; avancementTemps: number | null; heures: number; alertes: number };
type D = {
  annee: number; voitCouts: boolean;
  kpi: { projetsActifs: number; projetsPrevus: number; projetsTermines: number; heures: number; occupation: number | null; enAlerte: number; ca?: number; cout?: number; marge?: number; tauxMarge?: number | null; facture?: number; encaisse?: number; vendu?: number; resteAFacturer?: number; margeProjetee?: number; carnet?: number; impayes?: number; attendu90?: number; devisEnAttente?: number; nbDevisEnAttente?: number };
  series: Mois[];
  charge: { semaine: string; planifie: number; capacite: number; taux: number }[];
  heuresParProjet: { nom: string; couleur: string; valeur: number }[];
  caParClient: { nom: string; valeur: number }[];
  statuts: Record<string, number>;
  projets: PR[];
  jalons: { id: string; libelle: string; date: string; etat: string; montant: number | null; facturation: string; projetId: string; projet: string; couleur: string }[];
};

const carte = "bg-white rounded-xl shadow p-6";
const v = (x: number | undefined) => x ?? 0;

export default function TableauBordProjets() {
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [d, setD] = useState<D | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [vue, setVue] = useState<"mois" | "cumul">("mois");

  useEffect(() => {
    setD(null);
    fetch(`/api/projets/tableau-de-bord?annee=${annee}`).then(async (r) => { const j = await r.json().catch(() => ({})); if (r.ok) setD(j); else setErreur(j.erreur || "Chargement impossible"); });
  }, [annee]);

  if (erreur) return <div className={`${carte} text-red-700`}>{erreur}</div>;

  const choixAnnee = (
    <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center">
      <label className="font-semibold" htmlFor="annee-tdb">Année</label>
      <select id="annee-tdb" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className="border rounded-lg px-3 py-2">
        {[1, 0, -1, -2, -3].map((i) => new Date().getFullYear() + i).map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      {d?.voitCouts && (
        <div className="flex rounded-lg border overflow-hidden ml-auto">
          {(["mois", "cumul"] as const).map((x) => <button key={x} type="button" onClick={() => setVue(x)} className="px-4 py-2 text-sm font-semibold" style={{ background: vue === x ? "#111827" : "#ffffff", color: vue === x ? "#ffffff" : "#111827" }}>{x === "mois" ? "Par mois" : "Cumul"}</button>)}
        </div>
      )}
    </div>
  );
  if (!d) return <>{choixAnnee}<div className={`${carte} text-gray-500`}>Chargement…</div></>;

  const k = d.kpi, s = d.series, et = NOMS_MOIS_COURTS;
  const moisCourant = annee === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;
  const sCourant = s.slice(0, moisCourant);
  const etCourant = et.slice(0, moisCourant);
  const surcharge = d.charge.filter((c) => c.taux > 100);
  const actifs = d.projets.filter((p) => p.statut === "EN_COURS" || p.statut === "PREVU");
  const classement = d.projets.filter((p) => p.vendu > 0 && p.tauxMargeReelle != null).sort((a, b) => (b.tauxMargeReelle ?? 0) - (a.tauxMargeReelle ?? 0));

  return (
    <>
      {choixAnnee}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tuile titre="Projets en cours" valeur={String(k.projetsActifs)} detail={`${k.projetsPrevus} prévu(s) · ${k.projetsTermines} terminé(s) en ${annee}`} />
        <Tuile titre={`Heures sur projets ${annee}`} valeur={h(k.heures)} detail={k.occupation != null ? `taux d'occupation facturable : ${pct(k.occupation)}` : undefined} />
        <Tuile titre="Projets à surveiller" valeur={String(k.enAlerte)} couleur={k.enAlerte ? "#c2410c" : "#15803d"} detail={k.enAlerte ? "budget, retard ou perte annoncée" : "rien à signaler"} />
        <Tuile titre="Charge des 4 prochaines semaines" valeur={`${Math.round(d.charge.slice(0, 4).reduce((t, c) => t + c.taux, 0) / 4)} %`} detail={surcharge.length ? `${surcharge.length} semaine(s) en surcharge` : "de la capacité de l'équipe"} couleur={surcharge.length ? "#b91c1c" : undefined} />
        {d.voitCouts && (
          <>
            <Tuile titre={`CA reconnu ${annee}`} valeur={eur(k.ca)} detail={`sur ${eur(k.vendu)} vendus`} />
            <Tuile titre="Marge réalisée" valeur={eur(k.marge)} detail={pct(k.tauxMarge)} couleur={couleurMarge(k.tauxMarge)} />
            <Tuile titre="Marge projetée en fin" valeur={eur(k.margeProjetee)} couleur={v(k.margeProjetee) < 0 ? "#b91c1c" : "#15803d"} detail="si les plannings sont tenus" />
            <Tuile titre="Carnet de commandes" valeur={eur(k.carnet)} detail="vendu restant à réaliser (HT)" />
          </>
        )}
      </div>

      {d.voitCouts && (
        <div className={carte}>
          <h2 className="text-xl font-bold mb-1">{vue === "mois" ? "💶 Chiffre d'affaires, coûts et marge par mois" : "📈 Cumul depuis janvier"}</h2>
          <p className="text-sm text-gray-500 mb-3">CA reconnu à l&apos;avancement (régie : jours passés × taux ; forfait : au prorata des coûts engagés).</p>
          {vue === "mois" ? (
            <Graphique etiquettes={et} format={(n) => eur(n)} series={[
              { nom: "CA reconnu", couleur: "#2563eb", valeurs: s.map((m) => v(m.ca)) },
              { nom: "Coût réel", couleur: "#f97316", valeurs: s.map((m) => v(m.cout)) },
              { nom: "Marge", couleur: "#15803d", type: "ligne", valeurs: s.map((m) => v(m.marge)) },
            ]} />
          ) : (
            <Graphique etiquettes={etCourant} format={(n) => eur(n)} series={[
              { nom: "CA cumulé", couleur: "#2563eb", type: "ligne", valeurs: sCourant.map((m) => v(m.cumulCA)) },
              { nom: "Coût cumulé", couleur: "#f97316", type: "ligne", valeurs: sCourant.map((m) => v(m.cumulCout)) },
              { nom: "Marge cumulée", couleur: "#15803d", valeurs: sCourant.map((m) => v(m.cumulMarge)) },
            ]} />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={carte}>
          <h2 className="text-xl font-bold mb-3">⏱️ Heures sur projets</h2>
          <Graphique etiquettes={vue === "cumul" ? etCourant : et} format={(n) => h(n)} largeur={520} series={vue === "cumul"
            ? [{ nom: "Heures cumulées", couleur: "#0891b2", type: "ligne", valeurs: sCourant.map((m) => m.cumulHeures) }]
            : [{ nom: "Heures du mois", couleur: "#0891b2", valeurs: s.map((m) => m.heures) }]} />
        </div>
        {d.voitCouts ? (
          <div className={carte}>
            <h2 className="text-xl font-bold mb-3">💰 Gain (marge) par mois</h2>
            <Graphique etiquettes={etCourant} format={(n) => eur(n)} largeur={520} series={[
              { nom: "Marge du mois", couleur: "#15803d", valeurs: sCourant.map((m) => v(m.marge)) },
              { nom: "Marge cumulée", couleur: "#111827", type: "ligne", valeurs: sCourant.map((m) => v(m.cumulMarge)) },
            ]} />
          </div>
        ) : (
          <div className={carte}>
            <h2 className="text-xl font-bold mb-3">📊 Statut des projets</h2>
            <Anneau parts={Object.entries(d.statuts).map(([st, n]) => ({ nom: STATUTS_PROJET[st as keyof typeof STATUTS_PROJET]?.label ?? st, valeur: n, couleur: STATUTS_PROJET[st as keyof typeof STATUTS_PROJET]?.couleur }))} />
          </div>
        )}
      </div>

      <div className={carte}>
        <h2 className="text-xl font-bold mb-1">🗓️ Plan de charge des 12 prochaines semaines</h2>
        <p className="text-sm text-gray-500 mb-3">Heures planifiées sur les projets prévus et en cours, comparées à la capacité de l&apos;équipe (heures des contrats, hors absences). <Link href="/client/projets/planning" className="underline">Voir le détail par salarié</Link></p>
        <Graphique etiquettes={d.charge.map((c) => new Date(c.semaine).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }))} format={(n) => h(n)} series={[
          { nom: "Planifié", couleur: "#ea580c", valeurs: d.charge.map((c) => c.planifie) },
          { nom: "Capacité de l'équipe", couleur: "#111827", type: "ligne", pointille: true, valeurs: d.charge.map((c) => c.capacite) },
        ]} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={carte}>
          <h2 className="text-xl font-bold mb-3">🧩 Heures par projet ({annee})</h2>
          <Anneau parts={d.heuresParProjet} format={(n) => h(n)} />
        </div>
        {d.voitCouts ? (
          <div className={carte}>
            <h2 className="text-xl font-bold mb-3">🏷️ Vendu par client ({annee})</h2>
            <Anneau parts={d.caParClient} format={(n) => eur(n)} />
          </div>
        ) : (
          <div className={carte}>
            <h2 className="text-xl font-bold mb-3">📊 Statut des projets</h2>
            <Legende items={Object.entries(d.statuts).map(([st, n]) => ({ nom: STATUTS_PROJET[st as keyof typeof STATUTS_PROJET]?.label ?? st, couleur: STATUTS_PROJET[st as keyof typeof STATUTS_PROJET]?.couleur ?? "#6b7280", detail: String(n) }))} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={carte}>
          <h2 className="text-xl font-bold mb-3">🚦 Avancement des projets actifs</h2>
          {actifs.length === 0 ? <p className="text-sm text-gray-500">Aucun projet actif.</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500"><tr><th className="pb-2">Projet</th><th className="pb-2">Calendrier</th>{d.voitCouts && <th className="pb-2">Budget</th>}</tr></thead>
              <tbody>
                {actifs.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2 pr-2"><Link href={`/client/projets/${p.id}`} className="font-semibold hover:underline flex items-center gap-2"><span style={{ width: 8, height: 8, borderRadius: 99, background: p.couleur }} />{p.nom}{p.alertes > 0 && " ⚠️"}</Link></td>
                    <td className="py-2 pr-2"><Jauge valeur={p.avancementTemps} seuil={101} /></td>
                    {d.voitCouts && <td className="py-2"><Jauge valeur={p.consommation} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-gray-500 mt-2">Un budget qui avance plus vite que le calendrier annonce un dépassement.</p>
        </div>
        <div className={carte}>
          <h2 className="text-xl font-bold mb-3">🏁 Étapes des 30 prochains jours</h2>
          {d.jalons.length === 0 ? <p className="text-sm text-gray-500">Rien dans les 30 prochains jours.</p> : (
            <ul className="divide-y text-sm">
              {d.jalons.map((j) => {
                const retard = j.etat !== "FAIT" && new Date(j.date) < new Date();
                return (
                  <li key={j.id} className="py-2 flex justify-between gap-2">
                    <span><Link href={`/client/projets/${j.projetId}`} className="font-semibold hover:underline" style={{ color: j.couleur }}>{j.projet}</Link> · {j.libelle} · {dateFR(j.date)}{retard && <span className="text-red-700 font-semibold"> · en retard</span>}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {d.voitCouts && classement.length > 0 && (
        <div className={carte}>
          <h2 className="text-xl font-bold mb-3">🏆 Rentabilité des projets ({annee})</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500"><tr><th className="pb-2">Projet</th><th className="pb-2">Statut</th><th className="pb-2">Vendu</th><th className="pb-2">Marge réelle</th><th className="pb-2">Marge projetée</th></tr></thead>
            <tbody>
              {classement.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="py-2"><Link href={`/client/projets/${p.id}`} className="font-semibold hover:underline">{p.nom}</Link>{p.client && <span className="text-xs text-gray-500"> · {p.client}</span>}</td>
                  <td className="py-2"><PastilleStatut statut={p.statut} /></td>
                  <td className="py-2">{eur(p.vendu)}</td>
                  <td className="py-2 font-semibold" style={{ color: couleurMarge(p.tauxMargeReelle) }}>{eur(p.margeReelle)} ({pct(p.tauxMargeReelle)})</td>
                  <td className="py-2 font-semibold" style={{ color: couleurMarge(p.tauxProjection) }}>{pct(p.tauxProjection)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
