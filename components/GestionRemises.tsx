"use client";

// Remises & parrainage d'une entreprise (fiche admin) : code, marraine, remises datées
import { useState } from "react";
import { useRouter } from "next/navigation";

type Remise = { id: string; libelle: string; motif: string; type: string; valeur: number; portee: string; periode: string; etat: "EN_COURS" | "A_VENIR" | "TERMINEE" };

const champ = "border rounded-lg px-3 py-2 text-sm";
const MOTIFS: Record<string, string> = { COMMERCIALE: "Geste commercial", PARRAINAGE: "Parrainage (marraine)", FILLEUL: "Parrainage (filleul)", CODE_PROMO: "Code promo" };
const ETATS: Record<Remise["etat"], [string, string, string]> = {
  EN_COURS: ["En cours", "#15803d", "#dcfce7"],
  A_VENIR: ["À venir", "#1d4ed8", "#dbeafe"],
  TERMINEE: ["Terminée", "#6b7280", "#f3f4f6"],
};

export default function GestionRemises({ entrepriseId, code, lienParrainage, parrain, remises, moisCourant }: {
  entrepriseId: string;
  code: string | null;
  lienParrainage: string | null;
  parrain: { id: string; nom: string } | null;
  remises: Remise[];
  moisCourant: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [codeParrain, setCodeParrain] = useState("");
  const [f, setF] = useState({ libelle: "", type: "POURCENT", valeur: "", portee: "ABONNEMENTS", debut: moisCourant, nbMois: "" });

  async function appel(url: string, init: RequestInit, ok: string) {
    setOccupe(true); setMsg(null);
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init }).catch(() => null);
    if (!res) { setOccupe(false); setMsg({ ok: false, t: "Serveur injoignable." }); return false; }
    const d = await res.json().catch(() => ({}));
    setOccupe(false);
    setMsg(res.ok ? { ok: true, t: ok } : { ok: false, t: d.erreur || "Erreur" });
    if (res.ok) router.refresh();
    return res.ok;
  }
  const parrainage = (body: object, ok: string) => appel(`/api/entreprises/${entrepriseId}/parrainage`, { method: "POST", body: JSON.stringify(body) }, ok);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (await appel(`/api/entreprises/${entrepriseId}/remises`, { method: "POST", body: JSON.stringify(f) }, "Remise ajoutée : elle apparaît sur l'estimation et la prochaine facture.")) {
      setF({ ...f, libelle: "", valeur: "", nbMois: "" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.ok ? "✅" : "❌"} {msg.t}</p>}

      <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold mb-2">🎟️ Code de parrainage</h2>
          {code ? (
            <>
              <p className="text-2xl font-bold tracking-wider">{code}</p>
              {lienParrainage && (
                <div className="flex gap-2 items-center mt-2 flex-wrap">
                  <code className="text-xs bg-gray-100 rounded px-2 py-1 break-all">{lienParrainage}</code>
                  <button type="button" className="text-sm font-semibold text-orange-600 hover:underline" onClick={() => { navigator.clipboard?.writeText(lienParrainage); setMsg({ ok: true, t: "Lien copié." }); }}>Copier</button>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">Modifiable dans « ✏️ Modifier l&apos;entreprise ».</p>
            </>
          ) : (
            <button type="button" disabled={occupe} onClick={() => parrainage({ action: "code" }, "Code créé.")} className="bg-orange-500 text-white rounded-lg px-4 py-2 font-semibold text-sm hover:bg-orange-600 disabled:opacity-50">Créer le code</button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold mb-2">🤝 Marraine ou code promo</h2>
          {parrain ? (
            <div className="flex items-center gap-3 flex-wrap">
              <a href={`/admin/entreprises/${parrain.id}?onglet=remises`} className="font-semibold text-orange-600 hover:underline">{parrain.nom}</a>
              <button type="button" disabled={occupe} onClick={() => parrainage({ action: "detacher" }, "Lien retiré.")} className="text-sm text-gray-600 hover:underline">Retirer le lien</button>
            </div>
          ) : <p className="text-sm text-gray-500 mb-2">Pas de marraine.</p>}
          {(
            <form className="flex gap-2 flex-wrap mt-2" onSubmit={(e) => { e.preventDefault(); parrainage({ action: "rattacher", code: codeParrain }, "Code appliqué.").then((ok) => ok && setCodeParrain("")); }}>
              <input value={codeParrain} onChange={(e) => setCodeParrain(e.target.value.toUpperCase())} placeholder="FRH-… ou code promo" className={champ} aria-label="Code de parrainage ou code promo" />
              <button type="submit" disabled={occupe || !codeParrain.trim()} className="bg-gray-900 text-white rounded-lg px-4 py-2 font-semibold text-sm disabled:opacity-50">Appliquer</button>
            </form>
          )}
          <p className="text-xs text-gray-500 mt-2">Un code de parrainage rattache l&apos;entreprise à sa marraine ; un code promo (Remises & parrainage › Codes promo) crée directement sa remise.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold mb-4">💸 Remises datées ({remises.length})</h2>
        {remises.length === 0 ? <p className="text-sm text-gray-500 mb-4">Aucune remise datée.</p> : (
          <table className="w-full text-sm text-left mb-6">
            <thead><tr className="text-gray-500 border-b"><th className="pb-2">Libellé</th><th className="pb-2">Motif</th><th className="pb-2">Remise</th><th className="pb-2">Période</th><th className="pb-2">État</th><th /></tr></thead>
            <tbody>
              {remises.map((r) => {
                const [t, c, bg] = ETATS[r.etat];
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td data-label="Libellé" className="py-2 font-semibold">{r.libelle}</td>
                    <td data-label="Motif" className="py-2">{MOTIFS[r.motif] ?? r.motif}</td>
                    <td data-label="Remise" className="py-2">{r.type === "MONTANT" ? `${r.valeur} € / mois` : `${r.valeur} %`} {r.portee === "TOUT" ? "sur toute la facture" : "sur les abonnements"}</td>
                    <td data-label="Période" className="py-2">{r.periode}</td>
                    <td data-label="État" className="py-2"><span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: c, background: bg }}>{t}</span></td>
                    <td className="py-2 text-right">
                      <button type="button" disabled={occupe} className="text-red-600 font-semibold hover:underline"
                        onClick={() => appel(`/api/entreprises/${entrepriseId}/remises?remiseId=${r.id}`, { method: "DELETE" }, "Remise supprimée.")}>Supprimer</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <form onSubmit={ajouter} className="grid gap-3 items-end" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Libellé
            <input value={f.libelle} onChange={(e) => setF({ ...f, libelle: e.target.value })} placeholder="Remise commerciale" className={champ} /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Type
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={champ}><option value="POURCENT">%</option><option value="MONTANT">€ par mois</option></select></label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Valeur
            <input required inputMode="decimal" value={f.valeur} onChange={(e) => setF({ ...f, valeur: e.target.value })} placeholder={f.type === "POURCENT" ? "10" : "50"} className={champ} /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">S&apos;applique sur
            <select value={f.portee} onChange={(e) => setF({ ...f, portee: e.target.value })} className={champ}><option value="ABONNEMENTS">Abonnements et options</option><option value="TOUT">Toute la facture</option></select></label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">À partir de
            <input type="month" required value={f.debut} onChange={(e) => setF({ ...f, debut: e.target.value })} className={champ} /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Durée (mois)
            <input inputMode="numeric" value={f.nbMois} onChange={(e) => setF({ ...f, nbMois: e.target.value })} placeholder="vide = sans fin" className={champ} /></label>
          <button type="submit" disabled={occupe} className="bg-orange-500 text-white rounded-lg px-4 py-2 font-semibold text-sm hover:bg-orange-600 disabled:opacity-50">➕ Ajouter</button>
        </form>
        <p className="text-xs text-gray-500 mt-3">Une remise ne fait jamais passer la facture sous 0 €. La remise permanente en % se règle dans « ✏️ Modifier l&apos;entreprise ».</p>
      </div>
    </div>
  );
}
