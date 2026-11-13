"use client";

import { useEffect, useState } from "react";
import { MENTION_FRANCHISE_TVA, TYPES_FACTURE } from "@/lib/projets-constantes";

type Ligne = { libelle: string; quantite: number; unite: string; prixUnitaire: number };
type Emetteur = { nom: string; siret: string | null; rue: string | null; codePostal: string | null; ville: string | null; email: string | null; telephone: string | null; iban: string | null; bic: string | null } | null;
type Doc = {
  titre: string; numero: string; date: string; echeance?: string | null; validite?: string | null; objet: string;
  client: { nom: string | null; adresse: string | null; email: string | null }; lignes: Ligne[]; tauxTva: number; acomptePct?: number | null;
  conditions?: string | null; reference?: string | null; periode?: string | null; statut?: string;
};

const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const dateFR = (d: string) => new Date(d).toLocaleDateString("fr-FR");

/** Devis ou facture au format A4, prêt à imprimer ou à enregistrer en PDF */
export default function DocumentImprimable({ sorte, id }: { sorte: "devis" | "facture"; id: string }) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [em, setEm] = useState<Emetteur>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projets/${sorte === "devis" ? "devis" : "factures"}/${id}`).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErreur(j.erreur || "Document introuvable"); return; }
      setEm(j.emetteur);
      if (sorte === "devis") {
        const d = j.devis;
        const base = d.envoyeLe ?? d.createdAt;
        setDoc({
          titre: "DEVIS", numero: d.numero, date: base, validite: new Date(new Date(base).getTime() + d.validiteJours * 86400000).toISOString(), objet: d.objet,
          client: { nom: d.client, adresse: d.clientAdresse, email: d.clientEmail },
          lignes: d.lignes.map((l: Ligne) => ({ libelle: l.libelle, quantite: l.quantite, unite: l.unite, prixUnitaire: l.prixUnitaire })), tauxTva: d.tauxTva, acomptePct: d.acomptePct, conditions: d.conditions,
          periode: d.dateDebut ? `Début prévu le ${dateFR(d.dateDebut)}${d.dateFin ? `, fin prévue le ${dateFR(d.dateFin)}` : ""}` : null,
        });
      } else {
        const f = j.facture;
        setDoc({
          titre: f.type === "AVOIR" ? "AVOIR" : f.type === "ACOMPTE" ? "FACTURE D'ACOMPTE" : "FACTURE", numero: f.numero, date: f.date, echeance: f.echeance,
          objet: `${TYPES_FACTURE[f.type as keyof typeof TYPES_FACTURE] ?? ""} — ${f.projet.nom}`, client: j.client, lignes: f.lignes, tauxTva: f.tauxTva,
          reference: j.client.devis ? `Votre commande : devis ${j.client.devis}` : null, periode: f.periodeDu ? `Période du ${dateFR(f.periodeDu)} au ${dateFR(f.periodeAu)}` : null, statut: f.statut, conditions: f.note,
        });
      }
    });
  }, [sorte, id]);

  if (erreur) return <p style={{ padding: 40 }}>{erreur}</p>;
  if (!doc) return <p style={{ padding: 40 }}>Chargement…</p>;
  const ht = Math.round(doc.lignes.reduce((t, l) => t + l.quantite * l.prixUnitaire, 0) * 100) / 100;
  const tva = Math.round(ht * doc.tauxTva) / 100;
  const ttc = Math.round((ht + tva) * 100) / 100;
  const adresseEm = [em?.rue, [em?.codePostal, em?.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <div style={{ background: "#e5e7eb", minHeight: "100vh", padding: "24px 12px" }}>
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          body * { visibility: hidden !important; }
          .doc-a4, .doc-a4 * { visibility: visible !important; }
          .doc-a4 { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
          .pas-imprime { display: none !important; }
        }
      `}</style>
      <div className="pas-imprime" style={{ maxWidth: 800, margin: "0 auto 12px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <span style={{ marginRight: "auto", fontSize: 13, color: "#374151", alignSelf: "center" }}>Astuce : « Enregistrer au format PDF » dans la fenêtre d&apos;impression.</span>
        <button type="button" onClick={() => window.print()} style={{ background: "#111827", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>🖨️ Imprimer / PDF</button>
      </div>
      <div className="doc-a4" style={{ background: "#ffffff", color: "#111827", maxWidth: 800, margin: "0 auto", padding: "40px 44px", boxShadow: "0 2px 12px rgba(0,0,0,0.12)", fontFamily: "Arial, Helvetica, sans-serif", fontSize: 13, lineHeight: 1.45 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
          <div>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{em?.nom}</p>
            {adresseEm && <p style={{ margin: "2px 0 0" }}>{adresseEm}</p>}
            {(em?.telephone || em?.email) && <p style={{ margin: "2px 0 0" }}>{[em?.telephone, em?.email].filter(Boolean).join(" · ")}</p>}
            {em?.siret && <p style={{ margin: "2px 0 0" }}>SIRET {em.siret}</p>}
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>{doc.titre}</p>
            <p style={{ margin: "4px 0 0" }}>N° <strong>{doc.numero}</strong></p>
            <p style={{ margin: "2px 0 0" }}>Date : {dateFR(doc.date)}</p>
            {doc.validite && <p style={{ margin: "2px 0 0" }}>Valable jusqu&apos;au {dateFR(doc.validite)}</p>}
            {doc.echeance && <p style={{ margin: "2px 0 0" }}>Échéance : <strong>{dateFR(doc.echeance)}</strong></p>}
            {doc.statut === "PAYEE" && <p style={{ margin: "6px 0 0", color: "#15803d", fontWeight: 800 }}>ACQUITTÉE</p>}
            {doc.statut === "ANNULEE" && <p style={{ margin: "6px 0 0", color: "#b91c1c", fontWeight: 800 }}>ANNULÉE</p>}
          </div>
        </div>

        <div style={{ marginTop: 28, marginLeft: "auto", width: "48%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px" }}>
          <p style={{ margin: 0, fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>Client</p>
          <p style={{ margin: "2px 0 0", fontWeight: 700 }}>{doc.client.nom || "—"}</p>
          {doc.client.adresse && <p style={{ margin: "2px 0 0", whiteSpace: "pre-line" }}>{doc.client.adresse}</p>}
          {doc.client.email && <p style={{ margin: "2px 0 0" }}>{doc.client.email}</p>}
        </div>

        <p style={{ marginTop: 22, fontWeight: 700 }}>Objet : {doc.objet}</p>
        {doc.reference && <p style={{ margin: "2px 0" }}>{doc.reference}</p>}
        {doc.periode && <p style={{ margin: "2px 0" }}>{doc.periode}</p>}

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14 }}>
          <thead>
            <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
              <th style={{ padding: "8px 6px" }}>Désignation</th><th style={{ padding: "8px 6px", textAlign: "right" }}>Qté</th><th style={{ padding: "8px 6px" }}>Unité</th>
              <th style={{ padding: "8px 6px", textAlign: "right" }}>P.U. HT</th><th style={{ padding: "8px 6px", textAlign: "right" }}>Total HT</th>
            </tr>
          </thead>
          <tbody>
            {doc.lignes.map((l, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "7px 6px" }}>{l.libelle}</td>
                <td style={{ padding: "7px 6px", textAlign: "right" }}>{l.quantite.toLocaleString("fr-FR")}</td>
                <td style={{ padding: "7px 6px" }}>{l.unite}</td>
                <td style={{ padding: "7px 6px", textAlign: "right" }}>{eur(l.prixUnitaire)}</td>
                <td style={{ padding: "7px 6px", textAlign: "right" }}>{eur(l.quantite * l.prixUnitaire)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginLeft: "auto", width: "45%", marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>Total HT</span><strong>{eur(ht)}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>TVA {doc.tauxTva.toLocaleString("fr-FR")} %</span><span>{eur(tva)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "2px solid #111827", fontSize: 16 }}><strong>Total TTC</strong><strong>{eur(ttc)}</strong></div>
          {doc.acomptePct ? <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>Acompte à la commande ({doc.acomptePct} %)</span><span>{eur(Math.round(ttc * doc.acomptePct) / 100)}</span></div> : null}
        </div>
        {doc.tauxTva === 0 && <p style={{ marginTop: 8, fontStyle: "italic" }}>{MENTION_FRANCHISE_TVA}</p>}

        {doc.conditions && <div style={{ marginTop: 18 }}><p style={{ margin: 0, fontWeight: 700 }}>Conditions</p><p style={{ margin: "2px 0 0", whiteSpace: "pre-line" }}>{doc.conditions}</p></div>}

        {sorte === "devis" ? (
          <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between", gap: 24 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#4b5563", maxWidth: "50%" }}>Devis gratuit. En cas d&apos;accord, merci de retourner ce devis daté et signé avec la mention « Bon pour accord ».</p>
            <div style={{ border: "1px dashed #9ca3af", borderRadius: 8, width: "42%", height: 90, padding: 8, fontSize: 12, color: "#6b7280" }}>Date, signature et mention « Bon pour accord »</div>
          </div>
        ) : (
          <div style={{ marginTop: 22, fontSize: 12, color: "#374151" }}>
            {em?.iban && <p style={{ margin: "0 0 4px" }}><strong>Règlement par virement</strong> — IBAN {em.iban}{em.bic ? ` · BIC ${em.bic}` : ""}</p>}
            <p style={{ margin: 0 }}>Paiement à réception{doc.echeance ? `, au plus tard le ${dateFR(doc.echeance)}` : ""}. Pas d&apos;escompte pour paiement anticipé. En cas de retard : pénalités au taux de 3 fois le taux d&apos;intérêt légal et indemnité forfaitaire pour frais de recouvrement de 40 € (entre professionnels).</p>
          </div>
        )}
      </div>
    </div>
  );
}
