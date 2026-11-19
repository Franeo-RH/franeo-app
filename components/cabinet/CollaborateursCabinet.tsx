"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROFILS_DROITS } from "@/lib/droits";

type Collaborateur = { id: string; prenom: string; email: string; actif: boolean; gerant: boolean; profil: string | null; clients: string[]; active: boolean };
type Client = { id: string; nom: string };

/**
 * Collaborateurs d'un cabinet : invitation, profil de droits, clients autorisés, gérant, accès coupé.
 * Utilisé par le gérant (espace cabinet) et par FRANEO RH (fiche du cabinet).
 */
export default function CollaborateursCabinet({ collaborateurs, clients, moiId, adminCabinetId, demo = false }: {
  collaborateurs: Collaborateur[]; clients: Client[]; moiId?: string; adminCabinetId?: string; demo?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const [edition, setEdition] = useState<string | null>(null);
  const vide = { prenom: "", email: "", profil: "complet", tous: true, clients: [] as string[], gerant: false };
  const [form, setForm] = useState(vide);

  async function appeler(corps: Record<string, unknown>, id?: string) {
    const admin = !!adminCabinetId;
    const url = admin ? `/api/admin/cabinets/${adminCabinetId}` : id ? `/api/cabinet/collaborateurs/${id}` : "/api/cabinet/collaborateurs";
    const res = await fetch(url, {
      method: admin || id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(admin ? { action: "collaborateur", ...(id ? { id } : {}), ...corps } : corps),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage(`❌ ${data.erreur || "Erreur"}`); return null; }
    return data;
  }

  async function inviter(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true); setMessage("");
    const data = await appeler({ prenom: form.prenom, email: form.email, profil: form.profil, clients: form.tous ? [] : form.clients, gerant: form.gerant });
    setChargement(false);
    if (!data) return;
    setForm(vide);
    setMessage(data.mailEnvoye ? "✅ Invitation envoyée : le collaborateur choisit son mot de passe depuis l'e-mail reçu." : `⚠️ E-mail non parti. Lien à transmettre : ${data.lien}`);
    router.refresh();
  }

  async function modifier(c: Collaborateur, corps: Record<string, unknown>, succes = "✅ Enregistré.") {
    setMessage("");
    const data = await appeler(corps, c.id);
    if (!data) return;
    if (corps.relancer) setMessage(data.mailEnvoye ? `✅ Invitation renvoyée à ${c.email}.` : `⚠️ E-mail non parti. Lien : ${data.lien}`);
    else setMessage(succes);
    setEdition(null);
    router.refresh();
  }

  const nomsClients = (ids: string[]) =>
    ids.length === 0 ? "Tous les clients" : ids.includes("aucun") ? "Aucun client" : ids.map((id) => clients.find((c) => c.id === id)?.nom).filter(Boolean).join(", ") || "Aucun client";
  const profilLabel = (id: string | null) => PROFILS_DROITS.find((p) => p.id === id)?.label ?? PROFILS_DROITS[0].label;

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={inviter} className="fr-verre p-6 flex flex-col gap-3">
        <h2 className="text-lg font-bold">➕ Inviter un collaborateur</h2>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <input className="fr-champ" placeholder="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
          <input className="fr-champ" type="email" placeholder="E-mail professionnel" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <select className="fr-champ" value={form.profil} onChange={(e) => setForm({ ...form, profil: e.target.value })} aria-label="Profil de droits">
            {PROFILS_DROITS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <ChoixClients clients={clients} tous={form.tous} choisis={form.clients} onChange={(tous, choisis) => setForm({ ...form, tous, clients: choisis })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.gerant} onChange={(e) => setForm({ ...form, gerant: e.target.checked })} /> Gérant : peut inviter et gérer les collaborateurs</label>
        <div><button type="submit" disabled={chargement || demo} className="fr-bouton">{chargement ? "Envoi…" : "Envoyer l'invitation"}</button></div>
      </form>

      {message && <p className="text-sm" style={{ overflowWrap: "anywhere" }}>{message}</p>}

      <div className="fr-verre p-6 flex flex-col gap-3">
        <h2 className="text-lg font-bold">👥 Collaborateurs ({collaborateurs.length})</h2>
        {collaborateurs.length === 0 && <p className="text-sm text-gray-500">Aucun collaborateur pour le moment.</p>}
        {collaborateurs.map((c) => (
          <div key={c.id} className="fr-cab-collab">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold">{c.prenom} {c.gerant && <span className="fr-puce fr-actif" style={{ fontSize: 11, padding: "1px 8px" }}>Gérant</span>} {c.id === moiId && <span className="text-xs text-gray-400">(vous)</span>}</p>
                <p className="text-xs text-gray-500" style={{ overflowWrap: "anywhere" }}>{c.email}</p>
                <p className="text-xs text-gray-600 mt-1">{profilLabel(c.profil)} · {nomsClients(c.clients)}</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap text-xs font-semibold">
                {!c.actif ? <span style={{ color: "#b91c1c" }}>⏸️ Accès coupé</span> : !c.active ? <span style={{ color: "#b45309" }}>✉️ Invitation en attente</span> : <span style={{ color: "#15803d" }}>✅ Actif</span>}
                {!demo && <button type="button" className="hover:underline" style={{ color: "#f97316" }} onClick={() => setEdition(edition === c.id ? null : c.id)}>{edition === c.id ? "Fermer" : "Modifier"}</button>}
                {!demo && !c.active && <button type="button" className="hover:underline" style={{ color: "#4b5563" }} onClick={() => modifier(c, { relancer: true })}>Renvoyer l&apos;invitation</button>}
                {!demo && c.id !== moiId && (
                  <button type="button" className="hover:underline" style={{ color: c.actif ? "#b91c1c" : "#15803d" }} onClick={() => modifier(c, { actif: !c.actif }, c.actif ? "Accès coupé." : "✅ Accès rétabli.")}>
                    {c.actif ? "Couper l'accès" : "Rétablir"}
                  </button>
                )}
              </div>
            </div>
            {edition === c.id && <EditionCollaborateur c={c} clients={clients} soiMeme={c.id === moiId} onValider={(corps) => modifier(c, corps)} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChoixClients({ clients, tous, choisis, onChange }: { clients: Client[]; tous: boolean; choisis: string[]; onChange: (tous: boolean, choisis: string[]) => void }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex gap-4 flex-wrap">
        <label className="flex items-center gap-2"><input type="radio" checked={tous} onChange={() => onChange(true, choisis)} /> Tous les clients du cabinet</label>
        <label className="flex items-center gap-2"><input type="radio" checked={!tous} onChange={() => onChange(false, choisis)} /> Clients choisis</label>
      </div>
      {!tous && (
        <div className="flex flex-wrap gap-2">
          {clients.length === 0 && <span className="text-gray-500">Aucun client rattaché au cabinet.</span>}
          {clients.map((cl) => {
            const coche = choisis.includes(cl.id);
            return (
              <button key={cl.id} type="button" className={`fr-puce${coche ? " fr-actif" : ""}`} aria-pressed={coche} onClick={() => onChange(false, coche ? choisis.filter((x) => x !== cl.id) : [...choisis, cl.id])}>
                {coche ? "✓ " : ""}{cl.nom}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditionCollaborateur({ c, clients, soiMeme, onValider }: { c: Collaborateur; clients: Client[]; soiMeme: boolean; onValider: (corps: Record<string, unknown>) => void }) {
  const [profil, setProfil] = useState(c.profil ?? "complet");
  const [tous, setTous] = useState(c.clients.length === 0);
  const [choisis, setChoisis] = useState(c.clients.filter((x) => x !== "aucun"));
  const [gerant, setGerant] = useState(c.gerant);
  return (
    <div className="mt-3 pt-3 border-t border-white/60 flex flex-col gap-3">
      <select className="fr-champ" value={profil} onChange={(e) => setProfil(e.target.value)} aria-label="Profil de droits">
        {PROFILS_DROITS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      <ChoixClients clients={clients} tous={tous} choisis={choisis} onChange={(t, ch) => { setTous(t); setChoisis(ch); }} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={gerant} disabled={soiMeme} onChange={(e) => setGerant(e.target.checked)} /> Gérant</label>
      <div><button type="button" className="fr-bouton" onClick={() => onValider({ profil, clients: tous ? [] : choisis.length ? choisis : ["aucun"], gerant })}>Enregistrer</button></div>
    </div>
  );
}
