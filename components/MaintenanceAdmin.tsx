"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Etat = { active: boolean; message: string; debut: string; fin: string; bloque: boolean; annonce: boolean };

const local = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Admin : annoncer une maintenance, bloquer l'application pendant une mise à jour, la rouvrir */
export default function MaintenanceAdmin({ etat }: { etat: Etat }) {
  const router = useRouter();
  const [message, setMessage] = useState(etat.message);
  const [debut, setDebut] = useState(local(etat.debut));
  const [fin, setFin] = useState(local(etat.fin));
  const [retour, setRetour] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function enregistrer(active: boolean, programmer: boolean, texteOk: string) {
    setEnvoi(true); setRetour("");
    const iso = (v: string) => (v ? new Date(v).toISOString() : "");
    const res = await fetch("/api/admin/maintenance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active, message, debut: programmer ? iso(debut) : "", fin: active || programmer ? iso(fin) : "" }) });
    const d = await res.json().catch(() => ({}));
    setEnvoi(false);
    setRetour(res.ok ? texteOk : `❌ ${d.erreur || "Erreur"}`);
    if (res.ok) router.refresh();
  }

  const statut = etat.bloque
    ? { t: "🔴 Application bloquée : seuls les comptes admin y accèdent.", c: "#b91c1c", f: "#fee2e2" }
    : etat.annonce
      ? { t: `🟠 Maintenance annoncée pour le ${new Date(etat.debut).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}.`, c: "#b45309", f: "#fef3c7" }
      : { t: "🟢 Application ouverte à tous.", c: "#15803d", f: "#dcfce7" };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl p-4 font-semibold" style={{ color: statut.c, background: statut.f }}>{statut.t}</div>

      <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
        <label className="text-sm font-semibold">
          Message affiché aux utilisateurs
          <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 font-normal h-24" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000}
            placeholder="Ex : Nouvelle version de Franeo en cours d'installation (signature électronique, nouveaux modèles de contrats)." />
        </label>
        <div className="grid gap-3 grid-cols-2">
          <label className="text-sm font-semibold">
            Début (maintenance programmée)
            <input type="datetime-local" className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 font-normal" value={debut} onChange={(e) => setDebut(e.target.value)} />
          </label>
          <label className="text-sm font-semibold">
            Fin prévue
            <input type="datetime-local" className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 font-normal" value={fin} onChange={(e) => setFin(e.target.value)} />
          </label>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button type="button" disabled={envoi || !debut} onClick={() => enregistrer(false, true, "✅ Maintenance programmée : un bandeau l'annonce dès maintenant, l'application se bloque automatiquement au début et se rouvre à la fin.")}
            className="bg-orange-500 text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-50">🗓️ Programmer et annoncer</button>
          <button type="button" disabled={envoi} onClick={() => { if (confirm("Bloquer l'application maintenant pour tous les clients, cabinets et salariés ?")) enregistrer(true, false, "🔴 Application bloquée. Pensez à la rouvrir après la mise à jour."); }}
            className="bg-red-600 text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-50">🔒 Bloquer maintenant</button>
          <button type="button" disabled={envoi} onClick={() => enregistrer(false, false, "🟢 Application rouverte à tous.")}
            className="bg-green-600 text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-50">🔓 Rouvrir / annuler</button>
        </div>
        {retour && <p className="text-sm font-semibold">{retour}</p>}
      </div>

      <div className="bg-white rounded-xl shadow p-6 text-sm text-gray-600 flex flex-col gap-2">
        <h2 className="text-lg font-bold text-gray-900">Comment ça marche</h2>
        <p>• <strong>Programmer et annoncer</strong> : un bandeau jaune prévient clients, cabinets et salariés. À l&apos;heure de début, l&apos;application se bloque toute seule ; à l&apos;heure de fin, elle se rouvre.</p>
        <p>• <strong>Bloquer maintenant</strong> : tout le monde voit l&apos;écran « Mise à jour en cours » et ne peut plus se connecter, sauf vous (admin).</p>
        <p>• Pour publier une mise à jour : bloquez, envoyez la nouvelle version (git push, puis prisma db push si besoin), vérifiez-la en admin, puis rouvrez.</p>
        <p>• Pour prévenir aussi par un message sur les tableaux de bord, publiez une communication programmée dans Communications.</p>
      </div>
    </div>
  );
}
