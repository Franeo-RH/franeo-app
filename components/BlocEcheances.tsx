import Link from "next/link";
import { STYLES_STATUT, formaterDateFR, texteDelai, type Echeance } from "@/lib/rappels";

export default function BlocEcheances({
  echeances,
  role,
  max = 8,
}: {
  echeances: Echeance[];
  role: "CLIENT" | "ADMIN";
  max?: number;
}) {
  const retards = echeances.filter((e) => e.jours < 0).length;
  const bientot = echeances.filter((e) => e.jours >= 0 && e.jours <= 30).length;
  const affichees = echeances.slice(0, max);
  const reste = echeances.length - affichees.length;
  const base = role === "ADMIN" ? "/admin/salaries" : "/client/salaries";

  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold">⏰ Documents &amp; échéances</h2>
        <div className="flex gap-2 text-xs font-semibold">
          {retards > 0 && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600">{retards} en retard</span>}
          {bientot > 0 && <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">{bientot} sous 30 j</span>}
        </div>
      </div>

      {affichees.length === 0 ? (
        <p className="text-gray-400 text-sm">Aucune échéance à surveiller dans les 60 prochains jours. 🎉</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-6 overflow-y-auto pr-1">
          {affichees.map((e) => (
            <li key={e.cle} className="border-b last:border-b-0">
              <Link href={`${base}/${e.salarieId}`} className="flex items-center justify-between gap-2 py-1.5 text-xs hover:bg-gray-50">
                <span className="truncate">
                  {e.icone} <strong>{e.label}</strong> — {e.salarie}
                  {role === "ADMIN" && <span className="text-gray-400"> ({e.entreprise})</span>}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-gray-400">{formaterDateFR(e.date)}</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${STYLES_STATUT[e.statut]}`}>{texteDelai(e.jours)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {reste > 0 && <p className="text-xs text-gray-400 mt-1">… et {reste} autre(s). Ouvrez la fiche d&apos;un salarié pour tout voir.</p>}
    </div>
  );
}
