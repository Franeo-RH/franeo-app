"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Cabinet = {
  id: string; nom: string; siret: string | null; email: string | null; telephone: string | null; ville: string | null; actif: boolean; demo: boolean;
  tarifForfait: number | null; tarifParClient: number | null; tarifNote: string | null;
};
type Entreprise = { id: string; nom: string; cabinetId: string | null; autreCabinet: string | null };

const enTexte = (n: number | null) => (n == null ? "" : String(n).replace(".", ","));

/** Admin : coordonnées, tarif sur mesure et clients d'un cabinet */
export default function FicheCabinetAdmin({ cabinet, entreprises }: { cabinet: Cabinet; entreprises: Entreprise[] }) {
  const router = useRouter();
  const [infos, setInfos] = useState({ nom: cabinet.nom, siret: cabinet.siret ?? "", ville: cabinet.ville ?? "", email: cabinet.email ?? "", telephone: cabinet.telephone ?? "" });
  const [tarif, setTarif] = useState({ tarifForfait: enTexte(cabinet.tarifForfait), tarifParClient: enTexte(cabinet.tarifParClient), tarifNote: cabinet.tarifNote ?? "" });
  const [choisis, setChoisis] = useState(entreprises.filter((e) => e.cabinetId === cabinet.id).map((e) => e.id));
  const [recherche, setRecherche] = useState("");
  const [message, setMessage] = useState<{ bloc: string; texte: string } | null>(null);

  async function enregistrer(bloc: string, corps: Record<string, unknown>) {
    setMessage(null);
    const res = await fetch(`/api/admin/cabinets/${cabinet.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const data = await res.json().catch(() => ({}));
    setMessage({ bloc, texte: res.ok ? "✅ Enregistré." : `❌ ${data.erreur || "Erreur"}` });
    if (res.ok) router.refresh();
  }
  async function supprimer() {
    if (!confirm(`Supprimer le cabinet « ${cabinet.nom} » et les accès de ses collaborateurs ? Ses clients sont conservés.`)) return;
    const res = await fetch(`/api/admin/cabinets/${cabinet.id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/entreprises/cabinets");
    else setMessage({ bloc: "infos", texte: `❌ ${(await res.json().catch(() => ({}))).erreur || "Erreur"}` });
  }

  const nb = (v: string) => { const n = parseFloat(v.replace(",", ".")); return Number.isFinite(n) ? n : 0; };
  const estimation = nb(tarif.tarifForfait) + nb(tarif.tarifParClient) * choisis.length;
  const visibles = entreprises.filter((e) => !recherche || e.nom.toLowerCase().includes(recherche.toLowerCase()));
  const Msg = ({ bloc }: { bloc: string }) => (message?.bloc === bloc ? <p className="text-sm">{message.texte}</p> : null);
  const champ = (val: string, set: (v: string) => void, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold text-gray-600">{label}</span>
      <input className="fr-champ" value={val} onChange={(e) => set(e.target.value)} {...props} />
    </label>
  );

  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
      <section className="fr-verre p-6 flex flex-col gap-3">
        <h2 className="text-lg font-bold">🏛️ Cabinet</h2>
        {champ(infos.nom, (v) => setInfos({ ...infos, nom: v }), "Nom", { required: true })}
        <div className="grid grid-cols-2 gap-3">
          {champ(infos.siret, (v) => setInfos({ ...infos, siret: v }), "SIRET")}
          {champ(infos.ville, (v) => setInfos({ ...infos, ville: v }), "Ville")}
          {champ(infos.email, (v) => setInfos({ ...infos, email: v }), "E-mail", { type: "email" })}
          {champ(infos.telephone, (v) => setInfos({ ...infos, telephone: v }), "Téléphone")}
        </div>
        <Msg bloc="infos" />
        <div className="flex gap-3 flex-wrap">
          <button type="button" className="fr-bouton" onClick={() => enregistrer("infos", { action: "infos", ...infos })}>Enregistrer</button>
          <button type="button" className="fr-bouton-sec" onClick={() => enregistrer("infos", { action: "infos", ...infos, actif: !cabinet.actif })}>{cabinet.actif ? "⏸️ Suspendre l'accès" : "▶️ Réactiver l'accès"}</button>
          {!cabinet.demo && <button type="button" className="text-sm font-semibold" style={{ color: "#b91c1c" }} onClick={supprimer}>Supprimer</button>}
        </div>
      </section>

      <section className="fr-verre p-6 flex flex-col gap-3">
        <h2 className="text-lg font-bold">💶 Tarif sur mesure</h2>
        <p className="text-sm text-gray-500">Laissez vide ce qui ne s&apos;applique pas. Les clients du cabinet n&apos;ont pas de formule et ne sont pas facturés : c&apos;est le cabinet qui paie ce tarif.</p>
        <p className="text-sm text-gray-500">🧾 Clients du cabinet : accès RH &amp; paie (niveau Basic), aucun ticket RH, conseil RH ponctuel 5 demandes / mois répondues par vous et incluses. Options (Documents, Suivi médical, Projets) sur demande du cabinet, tarif à définir.</p>
        <div className="grid grid-cols-2 gap-3">
          {champ(tarif.tarifForfait, (v) => setTarif({ ...tarif, tarifForfait: v }), "Forfait (€ / mois)", { inputMode: "decimal", placeholder: "ex. 49" })}
          {champ(tarif.tarifParClient, (v) => setTarif({ ...tarif, tarifParClient: v }), "Par dossier client (€ / mois)", { inputMode: "decimal", placeholder: "ex. 9" })}
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-gray-600">Conditions particulières (visibles par le gérant)</span>
          <textarea className="fr-champ" rows={3} value={tarif.tarifNote} onChange={(e) => setTarif({ ...tarif, tarifNote: e.target.value })} placeholder="ex. Palier 11 à 50 clients, engagement 12 mois, apport d'affaires 10 %…" />
        </label>
        <p className="text-sm">Facturation du cabinet ce mois-ci : <strong>{estimation.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</strong> ({choisis.length} dossier{choisis.length > 1 ? "s" : ""})</p>
        <Msg bloc="tarif" />
        <div><button type="button" className="fr-bouton" onClick={() => enregistrer("tarif", { action: "tarif", ...tarif })}>Enregistrer le tarif</button></div>
      </section>

      <section className="fr-verre p-6 flex flex-col gap-3" style={{ gridColumn: "1 / -1" }}>
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <h2 className="text-lg font-bold">🗂️ Clients du cabinet ({choisis.length})</h2>
          <input type="search" className="fr-champ" placeholder="Rechercher une entreprise" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {visibles.map((e) => {
            const coche = choisis.includes(e.id);
            return (
              <button key={e.id} type="button" aria-pressed={coche} className={`fr-puce${coche ? " fr-actif" : ""}`} title={e.autreCabinet ? `Actuellement suivi par ${e.autreCabinet}` : undefined}
                onClick={() => setChoisis(coche ? choisis.filter((x) => x !== e.id) : [...choisis, e.id])}>
                {coche ? "✓ " : ""}{e.nom}{e.autreCabinet && !coche ? ` · ${e.autreCabinet}` : ""}
              </button>
            );
          })}
        </div>
        <Msg bloc="clients" />
        {cabinet.demo ? (
          <p className="text-xs text-gray-500">Les clients de la démo sont créés automatiquement.</p>
        ) : (
          <div><button type="button" className="fr-bouton" onClick={() => enregistrer("clients", { action: "clients", entreprises: choisis })}>Enregistrer les clients</button></div>
        )}
      </section>
    </div>
  );
}
