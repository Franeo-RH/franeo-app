"use client";

import { useState } from "react";
import { STATUTS_MANDAT, TEXTE_PRELEVEMENT } from "@/lib/prelevement-textes";

/** Mon entreprise : prélèvement SEPA mensuel des abonnements (mandat signé sur la page sécurisée Stripe) */
export default function MandatPrelevement({
  statut,
  ibanFin,
  signeAt,
  disponible,
  peutSigner,
  retour,
}: {
  statut: string | null;
  ibanFin: string | null;
  signeAt: string | null;
  disponible: boolean;
  peutSigner: boolean;
  retour: "ok" | "annule" | null;
}) {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const s = statut ? STATUTS_MANDAT[statut] : null;

  async function signer() {
    setChargement(true);
    setErreur("");
    const res = await fetch("/api/prelevement", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      setErreur(data.erreur || "Erreur");
      setChargement(false);
      return;
    }
    window.location.href = data.url; // page sécurisée Stripe
  }

  return (
    <div id="prelevement" className="bg-white rounded-xl shadow p-6 col-span-2">
      <div className="flex justify-between items-start gap-3 flex-wrap mb-3">
        <h2 className="text-lg font-bold">💶 Prélèvement des abonnements</h2>
        {s ? (
          <span className="text-sm font-semibold rounded-full px-3 py-1" style={{ color: s.couleur, background: s.fond }}>{s.label}</span>
        ) : (
          <span className="text-sm font-semibold rounded-full px-3 py-1" style={{ color: "#b45309", background: "#fef3c7" }}>Mandat à signer</span>
        )}
      </div>
      <p className="text-sm text-gray-600">{TEXTE_PRELEVEMENT}</p>

      {retour === "ok" && statut && <p className="text-sm mt-3" style={{ color: "#15803d" }}>✅ Merci, votre mandat est enregistré.</p>}
      {retour === "annule" && <p className="text-sm mt-3" style={{ color: "#b45309" }}>La signature a été interrompue : vous pouvez la reprendre quand vous voulez.</p>}

      {statut && (
        <div className="flex gap-6 flex-wrap mt-3 text-sm">
          {ibanFin && <span>IBAN : <strong>•••• {ibanFin}</strong></span>}
          {signeAt && <span className="text-gray-500">Signé le {new Date(signeAt).toLocaleDateString("fr-FR")}</span>}
        </div>
      )}

      {disponible ? (
        peutSigner && (
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <button type="button" onClick={signer} disabled={chargement} className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition" style={{ opacity: chargement ? 0.6 : 1 }}>
              {chargement ? "Ouverture…" : statut === "ACTIF" || statut === "EN_ATTENTE" ? "Changer d'IBAN" : "✍️ Signer le mandat de prélèvement"}
            </button>
            <span className="text-xs text-gray-500">🔒 Signature en ligne sur la page sécurisée de Stripe. Votre IBAN n&apos;est pas enregistré dans Franeo.</span>
          </div>
        )
      ) : (
        <p className="text-sm text-gray-500 mt-3">La signature en ligne du mandat ouvre bientôt : FRANEO RH vous préviendra.</p>
      )}
      {erreur && <p className="text-sm mt-2" style={{ color: "#b91c1c" }}>❌ {erreur}</p>}
      <p className="text-xs text-gray-400 mt-3">
        Vous pouvez demander à votre banque le remboursement d&apos;un prélèvement dans les 8 semaines suivant la date du débit. Créancier : FRANEO RH, via Stripe.
      </p>
    </div>
  );
}
