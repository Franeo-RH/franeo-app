"use client";

import Link from "next/link";
import type { Surcout } from "@/lib/surcout";

const eur = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;

/** Demande l'accord du client avant un supplément, et propose une formule supérieure */
export default function ModaleSurcout({
  surcout,
  onAccepter,
  onAnnuler,
  chargement = false,
}: {
  surcout: Surcout;
  onAccepter: () => void;
  onAnnuler: () => void;
  chargement?: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titre-surcout"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
    >
      <div style={{ background: "#ffffff", borderRadius: "16px", maxWidth: "560px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "24px", boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}>
        <h2 id="titre-surcout" style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 700 }}>💳 Supplément sur votre abonnement</h2>
        <p style={{ margin: "0 0 16px", color: "#4b5563", fontSize: "14px" }}>
          Cette action dépasse ce que comprend votre formule actuelle. Votre accord est nécessaire avant de continuer.
        </p>

        <div style={{ border: "1px solid #fed7aa", background: "#fff7ed", borderRadius: "12px", padding: "12px 14px", marginBottom: "16px" }}>
          {surcout.lignes.map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px", padding: "4px 0" }}>
              <span>{l.libelle} — {l.quantite} × {eur(l.prixUnitaire)}</span>
              <strong style={{ whiteSpace: "nowrap" }}>+{eur(l.total)}</strong>
            </div>
          ))}
          <div style={{ borderTop: "1px solid #fed7aa", marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
            <span>Votre coût mensuel estimé</span>
            <span><s style={{ color: "#9ca3af" }}>{eur(surcout.coutActuel)}</s> → <strong style={{ color: "#c2410c" }}>{eur(surcout.coutAvecSurcout)}</strong></span>
          </div>
        </div>

        {surcout.propositions.length > 0 && (
          <div style={{ marginBottom: "18px" }}>
            <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "15px" }}>💡 Une formule supérieure serait peut-être plus adaptée</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {surcout.propositions.map((p) => {
                const economie = p.difference < 0;
                return (
                  <div key={`${p.type}-${p.id}`} style={{ border: `1px solid ${economie ? "#86efac" : "#e5e7eb"}`, background: economie ? "#f0fdf4" : "#ffffff", borderRadius: "12px", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "14px" }}>{p.type === "RH" ? "Abonnement RH" : "Formule paie"} « {p.nom} » — {eur(p.prixMensuel)}/mois</p>
                      <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#4b5563" }}>{p.inclus}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 600, color: economie ? "#15803d" : "#4b5563" }}>
                        Total estimé {eur(p.coutMensuel)}/mois · {economie ? `économie de ${eur(-p.difference)}` : p.difference === 0 ? "même prix" : `+${eur(p.difference)} par rapport au supplément`}
                      </p>
                    </div>
                    <Link href={p.lien} style={{ background: "#111827", color: "#ffffff", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
                      Demander cette formule
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" onClick={onAnnuler} disabled={chargement} style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button type="button" onClick={onAccepter} disabled={chargement} style={{ background: "#f97316", color: "#ffffff", border: "none", borderRadius: "8px", padding: "10px 16px", fontWeight: 700, cursor: "pointer", opacity: chargement ? 0.6 : 1 }}>
            {chargement ? "Enregistrement…" : `J'accepte le supplément (+${eur(surcout.surcoutMensuel)})`}
          </button>
        </div>
      </div>
    </div>
  );
}
