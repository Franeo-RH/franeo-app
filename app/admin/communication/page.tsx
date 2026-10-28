"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { CIBLES } from "@/lib/communications-cibles";

type Lecture = { luAt: string; utilisateur: { prenom: string; email: string; role: string; entreprise: { nom: string } | null } };
type Com = {
  id: string; titre: string; contenu: string; cible: string; importante: boolean; createdAt: string;
  entreprise: { nom: string } | null; lectures: Lecture[];
};
type Entreprise = { id: string; nom: string };

const LIB_CIBLE: Record<string, string> = Object.fromEntries(CIBLES.map((c) => [c.value, c.label]));

export default function AdminCommunication() {
  const [coms, setComs] = useState<Com[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [form, setForm] = useState({ titre: "", contenu: "", cible: "CLIENTS", entrepriseId: "", importante: false });
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState("");
  const [ouverte, setOuverte] = useState<string | null>(null);

  const charger = () => fetch("/api/communications").then((r) => r.json()).then((d) => Array.isArray(d) && setComs(d));
  useEffect(() => {
    charger();
    fetch("/api/entreprises").then((r) => r.json()).then((d) => Array.isArray(d) && setEntreprises(d));
  }, []);

  async function publier(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setMessage("");
    const res = await fetch("/api/communications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await res.json().catch(() => ({}));
    setEnvoi(false);
    if (!res.ok) { setMessage(`❌ ${d.erreur || "Erreur"}`); return; }
    setMessage("✅ Communication publiée : elle s'affiche sur les tableaux de bord concernés.");
    setForm({ titre: "", contenu: "", cible: "CLIENTS", entrepriseId: "", importante: false });
    charger();
  }

  async function supprimer(id: string) {
    if (!confirm("Retirer cette communication ? Elle disparaîtra des tableaux de bord.")) return;
    await fetch(`/api/communications/${id}`, { method: "DELETE" });
    setComs(coms.filter((c) => c.id !== id));
  }

  const champ = "w-full border rounded-lg px-4 py-3";

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <main className="p-6 md:p-10 flex flex-col gap-6" style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-3xl font-bold">📢 Communication</h1>
          <p className="text-gray-500 mt-1">Publiez une information : elle apparaît sur le tableau de bord des destinataires jusqu&apos;à ce qu&apos;ils cliquent « J&apos;ai lu ».</p>
        </div>

        <form onSubmit={publier} className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
          <h2 className="text-xl font-bold">➕ Nouvelle communication</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label className="text-sm font-semibold">
              Destinataires
              <select className={champ} value={form.cible} onChange={(e) => setForm({ ...form, cible: e.target.value })}>
                {CIBLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Entreprise
              <select className={champ} value={form.entrepriseId} onChange={(e) => setForm({ ...form, entrepriseId: e.target.value })}>
                <option value="">Toutes les entreprises</option>
                {entreprises.map((en) => <option key={en.id} value={en.id}>{en.nom}</option>)}
              </select>
            </label>
          </div>
          <label className="text-sm font-semibold">
            Titre *
            <input className={champ} value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Ex : Fermeture du cabinet du 24 au 31 décembre" required maxLength={150} />
          </label>
          <label className="text-sm font-semibold">
            Message *
            <textarea className={`${champ} h-32 resize-none`} value={form.contenu} onChange={(e) => setForm({ ...form, contenu: e.target.value })} placeholder="Votre message…" required maxLength={3000} />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.importante} onChange={(e) => setForm({ ...form, importante: e.target.checked })} />
            Marquer comme importante (affichée en rouge, en premier)
          </label>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm font-semibold">{message}</p>
            <button type="submit" disabled={envoi} style={{ background: "#f97316", color: "#ffffff", border: "none", borderRadius: "8px", padding: "12px 22px", fontWeight: 700, cursor: "pointer", opacity: envoi ? 0.6 : 1 }}>
              {envoi ? "Publication…" : "📢 Publier"}
            </button>
          </div>
        </form>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Communications publiées</h2>
          {coms.length === 0 ? (
            <p className="text-gray-500">Aucune communication pour le moment.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {coms.map((c) => (
                <div key={c.id} className="border rounded-xl p-4">
                  <div className="flex justify-between gap-3 flex-wrap">
                    <div style={{ minWidth: 0, flex: "1 1 300px" }}>
                      <p className="font-bold">{c.importante ? "🔴 " : ""}{c.titre}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(c.createdAt).toLocaleDateString("fr-FR")} · {LIB_CIBLE[c.cible] || c.cible} · {c.entreprise?.nom || "Toutes les entreprises"}
                      </p>
                      <p className="text-sm text-gray-700 mt-2" style={{ whiteSpace: "pre-line" }}>{c.contenu}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <button type="button" onClick={() => setOuverte(ouverte === c.id ? null : c.id)} style={{ background: "#dcfce7", color: "#15803d", border: "none", borderRadius: "8px", padding: "6px 10px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                        ✅ {c.lectures.length} lecture(s)
                      </button>
                      <button type="button" onClick={() => supprimer(c.id)} style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "8px", padding: "6px 10px", fontSize: "13px", cursor: "pointer" }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                  {ouverte === c.id && (
                    <ul className="mt-3 border-t pt-3 text-sm flex flex-col gap-1">
                      {c.lectures.length === 0 && <li className="text-gray-500">Personne n&apos;a encore validé.</li>}
                      {c.lectures.map((l, i) => (
                        <li key={i}>
                          {l.utilisateur.prenom} ({l.utilisateur.role === "SALARIE" ? "salarié" : "client"}{l.utilisateur.entreprise ? ` · ${l.utilisateur.entreprise.nom}` : ""}) — {new Date(l.luAt).toLocaleString("fr-FR")}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
