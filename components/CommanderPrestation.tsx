"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Offre = {
  code: string;
  libelle: string;
  description: string;
  unite?: string;
  avecSalarie?: boolean;
  prix: number; // 0 = incluse
  incluseEn: string | null; // formule qui l'inclut, pour le conseil
};

const eur = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;

export default function CommanderPrestation({ offres, salaries }: { offres: Offre[]; salaries: string[] }) {
  const router = useRouter();
  const [choix, setChoix] = useState<Offre | null>(null);
  const [quantite, setQuantite] = useState(1);
  const [salarie, setSalarie] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [accord, setAccord] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  function ouvrir(o: Offre) {
    setChoix(o);
    setQuantite(1);
    setSalarie("");
    setCommentaire("");
    setAccord(false);
    setErreur("");
    setSucces("");
  }

  async function commander() {
    if (!choix) return;
    setEnvoi(true);
    setErreur("");
    const res = await fetch("/api/prestations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: choix.code, quantite, salarie, commentaire, accepte: accord }),
    });
    const data = await res.json().catch(() => ({}));
    setEnvoi(false);
    if (!res.ok) {
      setErreur(data.erreur || "La commande a échoué.");
      return;
    }
    setSucces(
      data.simule
        ? `🧪 Commande simulée dans la démo : « ${choix.libelle} ». Avec un compte Franeo, votre gestionnaire serait prévenu et la prestation ajoutée à votre facture.`
        : `✅ « ${choix.libelle} » commandée. Votre gestionnaire a été prévenu.`
    );
    setChoix(null);
    router.refresh();
  }

  const total = choix ? choix.prix * quantite : 0;

  return (
    <div>
      {succes && (
        <div style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#15803d", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px", fontWeight: 600 }}>{succes}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
        {offres.map((o) => (
          <div key={o.code} style={{ background: "#ffffff", borderRadius: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "baseline" }}>
              <p style={{ margin: 0, fontWeight: 700 }}>{o.libelle}</p>
              <span style={{ whiteSpace: "nowrap", fontWeight: 800, color: o.prix === 0 ? "#15803d" : "#c2410c" }}>
                {o.prix === 0 ? "Inclus" : `${eur(o.prix)}${o.unite ? ` / ${o.unite}` : ""}`}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280", flexGrow: 1 }}>{o.description}</p>
            {o.prix > 0 && o.incluseEn && (
              <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>💡 Incluse avec la formule {o.incluseEn}</p>
            )}
            <button type="button" onClick={() => ouvrir(o)} style={{ background: "#111827", color: "#ffffff", border: "none", borderRadius: "8px", padding: "10px", fontWeight: 600, cursor: "pointer" }}>
              Commander
            </button>
          </div>
        ))}
      </div>

      {choix && (
        <div role="dialog" aria-modal="true" aria-labelledby="titre-commande" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "#ffffff", borderRadius: "16px", maxWidth: "480px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "22px" }}>
            <h2 id="titre-commande" style={{ margin: "0 0 4px", fontSize: "19px", fontWeight: 700 }}>{choix.libelle}</h2>
            <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#6b7280" }}>{choix.description}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {choix.unite && (
                <label style={{ fontSize: "14px", fontWeight: 600 }}>
                  Quantité ({choix.unite}s)
                  <input type="number" min={1} max={500} value={quantite} onChange={(e) => setQuantite(Math.max(1, parseInt(e.target.value || "1", 10) || 1))} className="w-full border rounded-lg px-3 py-2" style={{ marginTop: "4px", fontWeight: 400 }} />
                </label>
              )}
              {choix.avecSalarie && (
                <label style={{ fontSize: "14px", fontWeight: 600 }}>
                  Salarié concerné (facultatif)
                  <select value={salarie} onChange={(e) => setSalarie(e.target.value)} className="w-full border rounded-lg px-3 py-2" style={{ marginTop: "4px", fontWeight: 400 }}>
                    <option value="">—</option>
                    {salaries.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              )}
              <label style={{ fontSize: "14px", fontWeight: 600 }}>
                Précisions (facultatif)
                <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2" style={{ marginTop: "4px", fontWeight: 400, resize: "none" }} />
              </label>

              {total > 0 ? (
                <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "10px", padding: "10px 12px", fontSize: "14px", cursor: "pointer" }}>
                  <input type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} style={{ width: "18px", height: "18px", accentColor: "#f97316", marginTop: "2px" }} />
                  <span>J&apos;accepte que cette prestation soit facturée <strong>{eur(total)}</strong> sur la facture de ce mois.</span>
                </label>
              ) : (
                <p style={{ margin: 0, background: "#dcfce7", borderRadius: "10px", padding: "10px 12px", fontSize: "14px", color: "#15803d", fontWeight: 600 }}>
                  ✅ Incluse dans votre formule : aucun supplément.
                </p>
              )}

              {erreur && <p style={{ margin: 0, color: "#b91c1c", fontSize: "14px" }}>{erreur}</p>}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button type="button" onClick={() => setChoix(null)} disabled={envoi} style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}>
                  Annuler
                </button>
                <button type="button" onClick={commander} disabled={envoi || (total > 0 && !accord)} style={{ background: "#f97316", color: "#ffffff", border: "none", borderRadius: "8px", padding: "10px 16px", fontWeight: 700, cursor: "pointer", opacity: envoi || (total > 0 && !accord) ? 0.5 : 1 }}>
                  {envoi ? "Envoi…" : "Confirmer la commande"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
