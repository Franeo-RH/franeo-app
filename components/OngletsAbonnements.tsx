import Link from "next/link";

/** Onglets en haut des pages d'abonnement (admin : vue globale, Admin RH, Paie ; client : RH, Paie) */
export default function OngletsAbonnements({ espace, actif }: { espace: "admin" | "client"; actif: "global" | "rh" | "paie" }) {
  const onglets = espace === "admin"
    ? [
        { cle: "global", href: "/admin/entreprises/demandes", label: "🌐 Vue globale" },
        { cle: "rh", href: "/admin/abonnements-rh", label: "💳 Admin RH" },
        { cle: "paie", href: "/admin/abonnement-paie", label: "📦 Paie" },
      ]
    : [
        { cle: "rh", href: "/client/entreprise/abonnement", label: "💳 Abonnement RH" },
        { cle: "paie", href: "/client/abonnement-paie", label: "📦 Abonnement Paie" },
      ];
  return (
    <div role="tablist" aria-label="Abonnements" style={{ display: "flex", gap: "6px", background: "#ffffff", borderRadius: "12px", padding: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: "20px", flexWrap: "wrap" }}>
      {onglets.map((o) => (
        <Link
          key={o.cle}
          href={o.href}
          role="tab"
          aria-selected={actif === o.cle}
          style={{ flex: "1 1 160px", textAlign: "center", padding: "10px 14px", borderRadius: "8px", fontWeight: 700, fontSize: "14px", textDecoration: "none", background: actif === o.cle ? "#f97316" : "transparent", color: actif === o.cle ? "#ffffff" : "#374151" }}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
