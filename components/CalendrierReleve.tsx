"use client";

import { fmtH, isoJour, type AbsenceReleve, type JourReleve } from "@/lib/heures";

const ENTETES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Libellé court + couleur des absences affichées dans le calendrier
const ABS: Record<string, { court: string; fond: string; texte: string }> = {
  CONGE_PAYE: { court: "CP", fond: "#dbeafe", texte: "#1d4ed8" },
  RTT: { court: "RTT", fond: "#e0e7ff", texte: "#4338ca" },
  CONGE_SANS_SOLDE: { court: "Sans solde", fond: "#f3e8ff", texte: "#7e22ce" },
  CONGE_EXCEPTIONNEL: { court: "Exception.", fond: "#fae8ff", texte: "#a21caf" },
  CONGE_NAISSANCE: { court: "Naissance", fond: "#fce7f3", texte: "#be185d" },
  MATERNITE_PATERNITE: { court: "Mater./Pater.", fond: "#fce7f3", texte: "#be185d" },
  MALADIE: { court: "Maladie", fond: "#fee2e2", texte: "#b91c1c" },
  ABSENCE_NON_REMUNEREE: { court: "Abs. non rém.", fond: "#f3f4f6", texte: "#374151" },
};

export function absenceDuJour(absences: AbsenceReleve[], iso: string) {
  return absences.find((a) => a.dateDebut <= iso && iso <= a.dateFin) || null;
}
export const styleAbsence = (type: string) => ABS[type] || { court: "Absence", fond: "#f3f4f6", texte: "#374151" };

/** Calendrier du mois, du lundi au dimanche. Cliquer un jour le sélectionne (si onSelect est fourni). */
export default function CalendrierReleve({
  premier,
  jours,
  absences,
  selection,
  onSelect,
}: {
  premier: string; // 1er jour du mois (ISO)
  jours: Record<string, JourReleve>;
  absences: AbsenceReleve[];
  selection?: string | null;
  onSelect?: (iso: string) => void;
}) {
  const d1 = new Date(`${premier}T12:00:00Z`);
  const mois = d1.getUTCMonth();
  const decalage = (d1.getUTCDay() + 6) % 7;
  const nbJours = new Date(Date.UTC(d1.getUTCFullYear(), mois + 1, 0)).getUTCDate();
  const cases: (string | null)[] = [
    ...Array(decalage).fill(null),
    ...Array.from({ length: nbJours }, (_, i) => isoJour(new Date(Date.UTC(d1.getUTCFullYear(), mois, i + 1, 12)))),
  ];
  while (cases.length % 7) cases.push(null);
  const aujourdhui = isoJour(new Date());

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "4px", marginBottom: "4px" }}>
        {ENTETES.map((e, i) => (
          <div key={e} style={{ textAlign: "center", fontSize: "11px", fontWeight: 700, color: i >= 5 ? "#9ca3af" : "#6b7280" }}>{e}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "4px" }}>
        {cases.map((iso, i) => {
          if (!iso) return <div key={`v${i}`} />;
          const j = jours[iso];
          const abs = absenceDuJour(absences, iso);
          const sa = abs ? styleAbsence(abs.type) : null;
          const weekend = i % 7 >= 5;
          const choisi = selection === iso;
          const Contenu = (
            <>
              <span style={{ fontSize: "12px", fontWeight: 700, color: iso === aujourdhui ? "#ea580c" : weekend ? "#9ca3af" : "#111827" }}>{Number(iso.slice(8))}</span>
              {sa && (
                <span style={{ display: "block", background: sa.fond, color: sa.texte, borderRadius: "4px", fontSize: "9px", fontWeight: 700, padding: "1px 2px", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {sa.court}{abs!.statut === "En attente" ? " ?" : ""}
                </span>
              )}
              {j?.heures != null && <span style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#111827", marginTop: "2px" }}>{fmtH(j.heures).replace(" h", "h")}</span>}
              {j && j.heuresSupp > 0 && <span style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#c2410c" }}>+{fmtH(j.heuresSupp).replace(" h", "h")}</span>}
              {(j?.commentaire || j?.teletravail) && <span style={{ display: "block", fontSize: "9px" }}>{j?.teletravail ? "🏠" : ""}{j?.commentaire ? "💬" : ""}</span>}
            </>
          );
          const style: React.CSSProperties = {
            minHeight: "62px", borderRadius: "8px", padding: "4px 2px", textAlign: "center", boxSizing: "border-box",
            background: weekend ? "#f9fafb" : "#ffffff",
            border: choisi ? "2px solid #f97316" : "1px solid #e5e7eb",
            minWidth: 0,
          };
          return onSelect ? (
            <button key={iso} type="button" onClick={() => onSelect(iso)} aria-pressed={choisi} aria-label={`Jour ${iso}`} style={{ ...style, cursor: "pointer", font: "inherit" }}>{Contenu}</button>
          ) : (
            <div key={iso} style={style}>{Contenu}</div>
          );
        })}
      </div>
    </div>
  );
}
