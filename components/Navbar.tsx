"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NavbarProps {
  role: "ADMIN" | "CLIENT";
  prenom: string;
  permissions?: string[];
}

export default function Navbar({ role, prenom, permissions = [] }: NavbarProps) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);

  async function handleLogout() {
    setChargement(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const tousLesLiens = role === "ADMIN"
    ? [
        { href: "/admin/dashboard", label: "Dashboard", icon: "/DASHBOARD-LOGO.png", permission: null },
        { href: "/admin/entreprises", label: "Entreprises", icon: "/ENTREPRISE-LOGO.png", permission: null },
        { href: "/admin/salaries", label: "Salariés", icon: "/SALARIE-LOGO.png", permission: null },
        { href: "/admin/paie", label: "Paie", icon: "/PAIE-LOGO.png", permission: null },
        { href: "/admin/tickets", label: "Tickets", icon: "/TICKET-LOGO.png", permission: null },
        { href: "/admin/actualites", label: "Actualité RH", icon: "/ACTUALITE-LOGO.png", permission: null },
        { href: "/admin/faq", label: "FAQ", icon: "/FAQ-LOGO.png", permission: null },
        { href: "/admin/helpdesk", label: "Helpdesk", icon: "/HELPDESK-LOGO.png", permission: null },
      ]
    : [
        { href: "/client/dashboard", label: "Dashboard", icon: "/DASHBOARD-LOGO.png", permission: null },
        { href: "/client/entreprise", label: "Mon entreprise", icon: "/ENTREPRISE-LOGO.png", permission: "entreprise" },
        { href: "/client/salaries", label: "Salariés", icon: "/SALARIE-LOGO.png", permission: "salaries" },
        { href: "/client/paie", label: "Paie", icon: "/PAIE-LOGO.png", permission: "paie" },
        { href: "/client/tickets", label: "Tickets", icon: "/TICKET-LOGO.png", permission: "tickets" },
        { href: "/client/actualites", label: "Actualité RH", icon: "/ACTUALITE-LOGO.png", permission: null },
        { href: "/client/faq", label: "FAQ", icon: "/FAQ-LOGO.png", permission: null },
        { href: "/client/helpdesk", label: "Helpdesk", icon: "/HELPDESK-LOGO.png", permission: null },
      ];

  const liens = tousLesLiens.filter(lien =>
    lien.permission === null ||
    role === "ADMIN" ||
    permissions.includes(lien.permission)
  );

  return (
    <nav className="bg-black text-white w-full px-6 py-3 flex items-center justify-between">

      {/* Logo réduit */}
      <div className="flex-shrink-0">
        <Image
          src="/FRANEO-Logo-Orange.png"
          alt="Franeo"
          width={90}
          height={30}
          style={{ objectFit: "contain" }}
        />
      </div>

      {/* Liens centrés */}
      <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
        {liens.map((lien) => (
          <Link key={lien.href} href={lien.href} className="group">
            <div className="
              bg-white/20
              hover:bg-orange-500/40
              transition
              rounded-xl
              px-3
              py-2
              flex
              flex-col
              items-center
              gap-1
              min-w-[65px]
            ">
              <Image
                src={lien.icon}
                alt={lien.label}
                width={18}
                height={18}
                className="invert"
                style={{ objectFit: "contain" }}
              />
              <span className="text-xs font-semibold text-white group-hover:text-orange-400 transition">
                {lien.label}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Profil + déconnexion */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <span className="text-gray-300 text-sm font-semibold">{prenom}</span>
        {role === "CLIENT" && (
          <Link href="/client/profil" className="text-gray-400 text-xs hover:text-orange-400 transition">
            🔒 Changer mot de passe
          </Link>
        )}
        <button
          onClick={handleLogout}
          disabled={chargement}
          className="text-xs text-red-400 hover:text-red-300 transition font-semibold"
        >
          {chargement ? "..." : "Déconnexion"}
        </button>
      </div>

    </nav>
  );
}