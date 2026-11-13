"use client";

import { useEffect, useState } from "react";
import ChoixFichier from "@/components/ChoixFichier";
import { oublierDroits } from "@/components/useDroits";

/** Réduit l'image (480 × 160 maximum) et la convertit en PNG avant l'envoi */
function preparer(fichier: File): Promise<{ data: string; largeur: number; hauteur: number }> {
  return new Promise((ok, ko) => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, 480 / img.width, 160 / img.height);
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * r)); c.height = Math.max(1, Math.round(img.height * r));
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      ok({ data: c.toDataURL("image/png"), largeur: c.width, hauteur: c.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => ko(new Error("Image illisible"));
    img.src = URL.createObjectURL(fichier);
  });
}

/** Logo du client : affiché en haut à droite de la barre de navigation et sur les fichiers Excel */
export default function LogoEntreprise({ entrepriseId, modifiable = true }: { entrepriseId?: string; modifiable?: boolean }) {
  const q = entrepriseId ? `?entrepriseId=${entrepriseId}` : "";
  const [version, setVersion] = useState(() => Date.now());
  const [present, setPresent] = useState<boolean | null>(null);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => { fetch(`/api/entreprises/logo${q}${q ? "&" : "?"}v=${version}`, { method: "GET" }).then((r) => setPresent(r.ok)).catch(() => setPresent(false)); }, [q, version]);

  async function envoyer(f: File) {
    setEnvoi(true); setMsg(null);
    try {
      if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(f.type)) throw new Error("Choisissez une image PNG, JPEG, WebP ou SVG.");
      const img = await preparer(f);
      const r = await fetch(`/api/entreprises/logo${q}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(img) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.erreur || "Envoi impossible");
      setMsg({ ok: true, t: "✅ Logo enregistré : il apparaît dans la barre du haut et sur vos fichiers Excel." });
      oublierDroits(); setVersion(Date.now()); setFichiers([]);
    } catch (e) {
      setMsg({ ok: false, t: `❌ ${e instanceof Error ? e.message : "Envoi impossible"}` });
    }
    setEnvoi(false);
  }
  async function supprimer() {
    if (!confirm("Retirer le logo ?")) return;
    await fetch(`/api/entreprises/logo${q}`, { method: "DELETE" });
    oublierDroits(); setVersion(Date.now()); setMsg(null);
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-bold">🖼️ Logo de l&apos;entreprise</h2>
      <p className="text-sm text-gray-500 mb-4">Affiché en haut à droite de votre espace et sur tous vos fichiers Excel (extractions et modèles d&apos;import).</p>
      {present && (
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/entreprises/logo${q}${q ? "&" : "?"}v=${version}`} alt="Logo actuel" style={{ height: 60, maxWidth: 220, objectFit: "contain", border: "1px solid #e5e7eb", borderRadius: 8, padding: 6, background: "#ffffff" }} />
          {modifiable && <button type="button" onClick={supprimer} className="text-red-700 text-sm underline">Retirer le logo</button>}
        </div>
      )}
      {modifiable && (
        <>
          <ChoixFichier accept="image/png,image/jpeg,image/webp,image/svg+xml" fichiers={fichiers} onChange={(l) => { setFichiers(l); if (l[0]) envoyer(l[0]); }} texte={present ? "Remplacer le logo" : "Ajouter votre logo (PNG ou JPEG)"} disabled={envoi} />
          <p className="text-xs text-gray-500 mt-2">Conseil : un logo sur fond transparent ou blanc, plutôt horizontal. Il est réduit automatiquement.</p>
        </>
      )}
      {msg && <p className="text-sm font-semibold mt-2" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}
    </div>
  );
}
