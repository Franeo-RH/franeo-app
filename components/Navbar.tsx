"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import InstallerApp from "@/components/InstallerApp";
import { viderCacheHorsLigne } from "@/components/EnregistrerSW";
import { oublierDroits } from "@/components/useDroits";

// Adresse du site vitrine (modifiable avec la variable NEXT_PUBLIC_SITE_URL sur Vercel)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://franeo-rh.com";

interface NavbarProps {
  role: "ADMIN" | "CLIENT";
  prenom: string;
  permissions?: string[];
}

type Lien = { href: string; label: string; icon: string; visible: boolean; actifSur?: string[] };

// Les droits sont relus ici : la barre est toujours complète, même si la page ne les a pas encore chargés
let memoire: { prenom: string; permissions: string[]; aPaie: boolean } | null = null;

export default function Navbar({ role, prenom, permissions = [] }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [chargement, setChargement] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [moi, setMoi] = useState(memoire);

  useEffect(() => {
    let actif = true;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!actif || !d) return;
        memoire = { prenom: d.prenom || "", permissions: d.permissions || [], aPaie: !!d.aPaie };
        setMoi(memoire);
      })
      .catch(() => {});
    return () => { actif = false; };
  }, []);

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
    memoire = null;
    oublierDroits();
    await viderCacheHorsLigne(); // les pages gardées pour le hors-ligne ne restent pas sur l'appareil
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const perms = moi?.permissions ?? permissions;
  const nom = prenom || moi?.prenom || "";
  const a = (p: string) => perms.includes(p);

  const liens: Lien[] = role === "ADMIN"
    ? [
        { href: "/admin/dashboard", label: "Dashboard", icon: "/DASHBOARD-LOGO.png", visible: true },
        { href: "/admin/entreprises", label: "Entreprises", icon: "/ENTREPRISE-LOGO.png", visible: true, actifSur: ["/admin/abonnement-paie", "/admin/abonnements-rh"] },
        { href: "/admin/salaries", label: "Salariés", icon: "/SALARIE-LOGO.png", visible: true },
        { href: "/admin/paie", label: "Paie", icon: "/PAIE-LOGO.png", visible: true },
        { href: "/admin/indicateurs", label: "Indicateurs RH", icon: "/INDICATEURS-LOGO.png", visible: true },
        { href: "/admin/tickets", label: "Tickets RH", icon: "/TICKET-LOGO.png", visible: true, actifSur: ["/admin/recrutement", "/admin/entreprises/tickets"] },
        { href: "/admin/communication", label: "Communication", icon: "/COMMUNICATION-LOGO.png", visible: true, actifSur: ["/admin/actualites", "/admin/faq"] },
        { href: "/admin/helpdesk", label: "Helpdesk", icon: "/HELPDESK-LOGO.png", visible: true },
      ]
    : [
        { href: "/client/dashboard", label: "Dashboard", icon: "/DASHBOARD-LOGO.png", visible: true },
        { href: "/client/entreprise", label: "Mon entreprise", icon: "/ENTREPRISE-LOGO.png", visible: a("entreprise"), actifSur: ["/client/abonnement-paie"] },
        { href: "/client/salaries", label: "Salariés", icon: "/SALARIE-LOGO.png", visible: a("salaries") || a("absences") },
        { href: "/client/paie", label: "Paie", icon: "/PAIE-LOGO.png", visible: moi ? moi.aPaie : a("paie") },
        { href: "/client/indicateurs", label: "Indicateurs RH", icon: "/INDICATEURS-LOGO.png", visible: a("indicateurs-rh") },
        { href: "/client/tickets", label: "Tickets RH", icon: "/TICKET-LOGO.png", visible: a("tickets") },
        { href: "/client/actualites", label: "Communication", icon: "/COMMUNICATION-LOGO.png", visible: true, actifSur: ["/client/faq"] },
        { href: "/client/helpdesk", label: "Helpdesk", icon: "/HELPDESK-LOGO.png", visible: true },
      ];

  const visibles = liens.filter((l) => l.visible);
  const sousChemin = (h: string) => pathname === h || pathname.startsWith(h + "/");
  // Le lien le plus précis gagne (évite que /admin/entreprises/tickets allume « Entreprises »)
  const actif = (l: Lien) => {
    if ((l.actifSur || []).some(sousChemin)) return true;
    if (!sousChemin(l.href)) return false;
    return !visibles.some((autre) => autre !== l && (autre.actifSur || []).some(sousChemin));
  };

  const profil = (
    <>
      {role === "CLIENT" && <Link href="/client/profil" className="fr-nav-petit">🔒 Mot de passe</Link>}
      <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="fr-nav-petit">🌐 Voir nos offres ↗</a>
      <button onClick={handleLogout} disabled={chargement} className="fr-nav-deco">
        {chargement ? "..." : "Déconnexion"}
      </button>
    </>
  );

  return (
    <nav className="fr-nav">
      <div className="fr-nav-barre">
        <Link href={role === "ADMIN" ? "/admin/dashboard" : "/client/dashboard"} className="fr-nav-logo" aria-label="Accueil Franeo">
          <Image src="/FRANEO-Logo-Orange.png" alt="Franeo" width={90} height={30} style={{ objectFit: "contain" }} priority />
        </Link>

        {/* Ordinateur : onglets centrés */}
        <div className="fr-nav-liens">
          {visibles.map((lien) => (
            <Link key={lien.href} href={lien.href} className={`fr-nav-lien${actif(lien) ? " fr-actif" : ""}`}>
              <Image src={lien.icon} alt="" width={18} height={18} className="invert" style={{ objectFit: "contain" }} />
              <span>{lien.label}</span>
            </Link>
          ))}
        </div>

        <div className="fr-nav-profil">
          <span className="fr-nav-prenom">{nom || " "}</span>
          {profil}
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
            {visibles.map((lien) => (
              <Link key={lien.href} href={lien.href} className={`fr-menu-lien${actif(lien) ? " fr-actif" : ""}`}>
                <Image src={lien.icon} alt="" width={22} height={22} className="invert" style={{ objectFit: "contain" }} />
                <span>{lien.label}</span>
              </Link>
            ))}
          </div>
          <InstallerApp className="fr-menu-installer" />
          <div className="fr-menu-pied">
            <span>👤 {nom}</span>
            <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>{profil}</div>
          </div>
        </div>
      )}
    </nav>
  );
}
