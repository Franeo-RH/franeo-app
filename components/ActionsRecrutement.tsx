"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  statut: string;
  signatureAt: string | null;
  finEssaiAt: string | null;
  primeSignature: number;
  primeFinEssai: number;
};

const bouton = (fond: string): React.CSSProperties => ({ background: fond, color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 12px", fontWeight: 700, fontSize: "13px", cursor: "pointer" });

/** Boutons de suivi d'un recrutement (admin) : démarrer, déclencher les primes, annuler */
export default function ActionsRecrutement({ id, statut, signatureAt, finEssaiAt, primeSignature, primeFinEssai }: Props) {
  const router = useRouter();
  const [occupe, setOccupe] = useState(false);
  const termine = ["Terminé", "Clôturée", "Annulé"].includes(statut);

  async function agir(action: string, confirmation?: string, avecCandidat = false) {
    if (confirmation && !confirm(confirmation)) return;
    let candidat: string | undefined;
    if (avecCandidat) {
      const r = prompt("Nom du candidat recruté (facultatif) :");
      if (r === null) return;
      candidat = r;
    }
    setOccupe(true);
    const res = await fetch(`/api/recrutement/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, candidat }) });
    setOccupe(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.erreur || "Erreur");
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", opacity: occupe ? 0.6 : 1 }}>
      {statut === "Reçue" && <button type="button" disabled={occupe} onClick={() => agir("demarrer")} style={bouton("#2563eb")}>▶️ Démarrer la recherche</button>}
      {!termine && !signatureAt && statut !== "Reçue" && (
        <button type="button" disabled={occupe} onClick={() => agir("signature", `Contrat signé ? La prime de ${primeSignature} € sera ajoutée à la facture du mois.`, true)} style={bouton("#16a34a")}>
          ✍️ Contrat signé · prime {primeSignature} €
        </button>
      )}
      {!termine && signatureAt && !finEssaiAt && (
        <button type="button" disabled={occupe} onClick={() => agir("fin-essai", `Période d'essai validée ? La prime de ${primeFinEssai} € sera ajoutée à la facture du mois.`)} style={bouton("#16a34a")}>
          🏁 Période d&apos;essai validée · prime {primeFinEssai} €
        </button>
      )}
      {!termine && <button type="button" disabled={occupe} onClick={() => agir("annuler", "Annuler ce recrutement ? Les primes déjà déclenchées restent dues.")} style={bouton("#6b7280")}>✖ Annuler</button>}
      {termine && statut === "Annulé" && <button type="button" disabled={occupe} onClick={() => agir("rouvrir")} style={bouton("#6b7280")}>↩️ Rouvrir</button>}
    </div>
  );
}
