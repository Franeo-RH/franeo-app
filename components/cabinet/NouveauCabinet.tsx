"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Admin : créer un cabinet et inviter son gérant */
export default function NouveauCabinet() {
  const router = useRouter();
  const vide = { nom: "", siret: "", ville: "", email: "", telephone: "", prenomGerant: "", emailGerant: "" };
  const [f, setF] = useState(vide);
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const champ = (k: keyof typeof vide, label: string, type = "text", requis = false) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold text-gray-600">{label}</span>
      <input className="fr-champ" type={type} value={f[k]} required={requis} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );
  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true); setMessage("");
    const res = await fetch("/api/admin/cabinets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const data = await res.json().catch(() => ({}));
    setChargement(false);
    if (!res.ok) return setMessage(`❌ ${data.erreur || "Erreur"}`);
    if (data.avertissement) return setMessage(`⚠️ ${data.avertissement}`);
    router.push(`/admin/entreprises/cabinets/${data.id}`);
  }
  return (
    <form onSubmit={creer} className="fr-verre p-6 flex flex-col gap-4">
      <h2 className="text-lg font-bold">➕ Nouveau cabinet</h2>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        {champ("nom", "Nom du cabinet *", "text", true)}
        {champ("siret", "SIRET")}
        {champ("ville", "Ville")}
        {champ("email", "E-mail du cabinet", "email")}
        {champ("telephone", "Téléphone")}
      </div>
      <p className="text-sm font-bold">Gérant (reçoit l&apos;e-mail d&apos;activation)</p>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        {champ("prenomGerant", "Prénom")}
        {champ("emailGerant", "E-mail", "email")}
      </div>
      {message && <p className="text-sm">{message}</p>}
      <div><button type="submit" className="fr-bouton" disabled={chargement}>{chargement ? "Création…" : "Créer le cabinet"}</button></div>
    </form>
  );
}
