import Link from "next/link";
import { STYLES_STATUT, formaterDateFR, texteDelai, type Echeance } from "@/lib/rappels";

/** Panneau latéral : toutes les échéances à traiter, groupées par urgence */
export default function PanneauEcheances({
  echeances,
  role,
}: {
  echeances: Echeance[];
  role: "CLIENT" | "ADMIN";
}) {
  const base = role === "ADMIN" ? "/admin/salaries" : "/client/salaries";
  const groupes = [
    { titre: "🔴 En retard", liste: echeances.filter((e) => e.jours < 0), couleur: "text-red-600" },
    { titre: "🟠 Sous 30 jours", liste: echeances.filter((e) => e.jours >= 0 && e.jours <= 30), couleur: "text-orange-600" },
    { titre: "🟢 Plus tard", liste: echeances.filter((e) => e.jours > 30), couleur: "text-green-600" },
  ];

  return (
    <aside className="w-80 shrink-0 hidden xl:block">
      <div className="bg-white rounded-xl shadow p-4 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">⏰ Échéances</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{echeances.length}</span>
        </div>

        {echeances.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucune échéance à surveiller. 🎉</p>
        ) : (
          groupes.map(
            (g) =>
              g.liste.length > 0 && (
                <div key={g.titre} className="mb-4">
                  <p className={`text-xs font-bold uppercase mb-1 ${g.couleur}`}>
                    {g.titre} ({g.liste.length})
                  </p>
                  <ul>
                    {g.liste.map((e) => (
                      <li key={e.cle} className="border-b last:border-b-0">
                        <Link href={`${base}/${e.salarieId}`} className="block py-1.5 hover:bg-gray-50">
                          <p className="text-xs">
                            {e.icone} <strong>{e.label}</strong>
                          </p>
                          <p className="text-xs text-gray-500">
                            {e.salarie}
                            {role === "ADMIN" && <span className="text-gray-400"> · {e.entreprise}</span>}
                          </p>
                          <p className="text-[11px] mt-0.5 flex items-center gap-2">
                            <span className="text-gray-400">{formaterDateFR(e.date)}</span>
                            <span className={`px-1.5 rounded-full font-semibold ${STYLES_STATUT[e.statut]}`}>{texteDelai(e.jours)}</span>
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
          )
        )}
      </div>
    </aside>
  );
}
