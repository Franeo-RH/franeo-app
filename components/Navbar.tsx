"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import InstallerApp from "@/components/InstallerApp";

// Adresse du site vitrine (modifiable avec la variable NEXT_PUBLIC_SITE_URL sur Vercel)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://franeo-rh.com";

interface NavbarProps {
  role: "ADMIN" | "CLIENT";
  prenom: string;
  permissions?: string[];
}

export default function Navbar({ role, prenom, permissions = [] }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [chargement, setChargement] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);

  // Ferme le menu téléphone à chaque changement de page
  useEffect(() => {
    setMenuOuvert(false);
  }, [pathname]);

  // Téléphone : chaque cellule de tableau reçoit le nom de sa colonne,
  // ce qui permet d'afficher les tableaux sous forme de liste (voir globals.css)
  useEffect(() => {
    function etiqueter() {
      document.querySelectorAll("main table").forEach((table) => {
        const titres = Array.from(table.querySelectorAll("thead th")).map((th) => (th.textContent || "").trim());
        if (titres.length === 0) return;
        table.querySelectorAll("tbody tr").forEach((tr) => {
          Array.from(tr.children).forEach((td, i) => {
            const label = titres[i] ?? "";
            if (td.getAttribute("data-label") !== label) td.setAttribute("data-label", label);
          });
        });
      });
    }
    etiqueter();
    const obs = new MutationObserver(() => etiqueter());
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [pathname]);

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

  // Section active : /client/paie/historique → "Paie"
  const estActif = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="fr-nav">
      <div className="fr-nav-barre">
        <Link href={role === "ADMIN" ? "/admin/dashboard" : "/client/dashboard"} className="fr-nav-logo" aria-label="Accueil Franeo">
          <Image src="/FRANEO-Logo-Orange.png" alt="Franeo" width={90} height={30} style={{ objectFit: "contain" }} priority />
        </Link>

        {/* Ordinateur : liens en ligne */}
        <div className="fr-nav-liens">
          {liens.map((lien) => (
            <Link key={lien.href} href={lien.href} className={`fr-nav-lien${estActif(lien.href) ? " fr-actif" : ""}`}>
              <Image src={lien.icon} alt="" width={18} height={18} className="invert" style={{ objectFit: "contain" }} />
              <span>{lien.label}</span>
            </Link>
          ))}
        </div>

        <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="fr-nav-offres">Voir toutes nos offres ↗</a>

        <div className="fr-nav-profil">
          <span className="fr-nav-prenom">{prenom}</span>
          {role === "CLIENT" && (
            <Link href="/client/profil" className="fr-nav-petit">🔒 Mot de passe</Link>
          )}
          <button onClick={handleLogout} disabled={chargement} className="fr-nav-deco">
            {chargement ? "..." : "Déconnexion"}
          </button>
        </div>

        {/* Téléphone : bouton menu */}
        <button
          type="button"
          className="fr-burger"
          aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOuvert}
          onClick={() => setMenuOuvert((o) => !o)}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {menuOuvert ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </>
            ) : (
              <>
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Téléphone : menu déroulant */}
      {menuOuvert && (
        <div className="fr-menu-mobile">
          <div className="fr-menu-grille">
            {liens.map((lien) => (
              <Link key={lien.href} href={lien.href} className={`fr-menu-lien${estActif(lien.href) ? " fr-actif" : ""}`}>
                <Image src={lien.icon} alt="" width={22} height={22} className="invert" style={{ objectFit: "contain" }} />
                <span>{lien.label}</span>
              </Link>
            ))}
          </div>
          <InstallerApp className="fr-menu-installer" />
          <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="fr-menu-offres">🌐 Voir toutes nos offres</a>
          <div className="fr-menu-pied">
            <span>👤 {prenom}</span>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              {role === "CLIENT" && <Link href="/client/profil" className="fr-nav-petit">🔒 Mot de passe</Link>}
              <button onClick={handleLogout} disabled={chargement} className="fr-nav-deco">
                {chargement ? "..." : "Déconnexion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
