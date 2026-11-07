"use client";

import { useRef, useState } from "react";

/** Zone bien visible pour choisir un fichier (clic ou glisser-déposer), avec le nom du fichier choisi */
export default function ChoixFichier({
  accept, multiple = false, fichiers, onChange, texte = "Choisir un fichier", disabled = false,
}: {
  accept?: string; multiple?: boolean; fichiers: File[]; onChange: (f: File[]) => void; texte?: string; disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);
  const choisis = fichiers.length > 0;
  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); const l = Array.from(e.dataTransfer.files); if (l.length) onChange(multiple ? l : l.slice(0, 1)); }}
        style={{
          width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
          border: `2px dashed ${choisis ? "#16a34a" : survol ? "#f97316" : "#fdba74"}`, borderRadius: "12px",
          background: choisis ? "#f0fdf4" : survol ? "#ffedd5" : "#fff7ed", padding: "18px 12px", cursor: disabled ? "not-allowed" : "pointer", color: "#111827",
        }}
      >
        <span style={{ fontSize: "28px" }} aria-hidden="true">{choisis ? "✅" : "📎"}</span>
        {choisis ? (
          <span style={{ fontWeight: 700, fontSize: "14px", overflowWrap: "anywhere" }}>{fichiers.map((f) => f.name).join(", ")}</span>
        ) : (
          <span style={{ fontWeight: 700, fontSize: "15px", color: "#c2410c" }}>{texte}</span>
        )}
        <span style={{ fontSize: "12px", color: "#6b7280" }}>{choisis ? "Cliquez pour changer de fichier" : "Cliquez ici ou glissez le fichier dans ce cadre"}</span>
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: "none" }}
        onChange={(e) => { onChange(Array.from(e.target.files || [])); e.target.value = ""; }}
      />
    </div>
  );
}
