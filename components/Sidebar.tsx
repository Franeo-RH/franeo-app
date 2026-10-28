"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  role: "ADMIN" | "CLIENT";
  demandesEnAttente?: number;
  ticketsOuverts?: number;
}

export default function Sidebar({ role, demandesEnAttente = 0, ticketsOuverts = 0 }: SidebarProps) {
  const pathname = usePathname();
  const base = role === "ADMIN" ? "/admin" : "/client";

  // Salariés
  if (pathname.includes("salaries")) {
    return (
      <aside className="fr-sidebar w-70 min-h-screen bg-white shadow-md p-6 flex flex-col gap-2">
        <p className="text-xs text-gray-400 font-semibold uppercase mb-4">Salariés</p>
        <SidebarLink href={`${base}/salaries`} label="👥 Liste des salariés" active={pathname === `${base}/salaries`} />
        <SidebarLink href={`${base}/salaries/nouveau`} label="➕ Ajouter un salarié" active={pathname === `${base}/salaries/nouveau`} />
        {role === "ADMIN" && (
          <SidebarLink href="/admin/salaries/mouvements" label="🔄 Mouvements" active={pathname === "/admin/salaries/mouvements"} />
        )}
        {role === "CLIENT" && (
          <SidebarLink href="/client/salaries/mouvements" label="🔄 Mouvements" active={pathname === "/client/salaries/mouvements"} />
        )}
        <SidebarLink href={`${base}/salaries/echeances`} label="⏰ Échéances" active={pathname === `${base}/salaries/echeances`} />
        <SidebarLink href={`${base}/salaries/demandes`} label={role === "ADMIN" ? "📝 Demandes clients" : "📝 Mes demandes"} active={pathname === `${base}/salaries/demandes`} />
      </aside>
    );
  }

  // Tickets admin (AVANT "entreprises" : /admin/entreprises/tickets contient "entreprises")
  if ((pathname.includes("tickets") || pathname.includes("recrutement")) && role === "ADMIN") {
    return (
      <aside className="fr-sidebar w-70 min-h-screen bg-white shadow-md p-6 flex flex-col gap-2">
        <p className="text-xs text-gray-400 font-semibold uppercase mb-4">Tickets RH</p>
        <SidebarLink href="/admin/tickets" label="🎫 Tous les tickets" active={pathname === "/admin/tickets"} badge={ticketsOuverts} />
        <SidebarLink href="/admin/entreprises/tickets" label="💰 Facturation tickets" active={pathname === "/admin/entreprises/tickets"} />
        <SidebarLink href="/admin/recrutement" label="🎯 Recrutement" active={pathname === "/admin/recrutement"} />
      </aside>
    );
  }

  // Tickets client
  if (pathname.includes("tickets") && role === "CLIENT") {
    return (
      <aside className="fr-sidebar w-70 min-h-screen bg-white shadow-md p-6 flex flex-col gap-2">
        <p className="text-xs text-gray-400 font-semibold uppercase mb-4">Tickets RH</p>
        <SidebarLink href="/client/tickets" label="🎫 Mes tickets" active={pathname === "/client/tickets"} />
        <SidebarLink href="/client/tickets/nouveau" label="➕ Nouveau ticket" active={pathname === "/client/tickets/nouveau"} />
        <SidebarLink href="/client/tickets/recrutement" label="🎯 Demander un recrutement" active={pathname === "/client/tickets/recrutement"} />
        <SidebarLink href="/client/tickets/recrutement/historique" label="📋 Historique recrutement" active={pathname === "/client/tickets/recrutement/historique"} />
      </aside>
    );
  }

  // Abonnement paie client (avant "entreprise" et "paie" pour éviter les conflits)
  if (pathname === "/client/abonnement-paie") {
    return (
      <aside className="fr-sidebar w-70 min-h-screen bg-white shadow-md p-6 flex flex-col gap-2">
        <p className="text-xs text-gray-400 font-semibold uppercase mb-4">Mon entreprise</p>
        <SidebarLink href="/client/entreprise" label="🏢 Informations" active={false} />
        <SidebarLink href="/client/entreprise/facturation" label="🧾 Factures" active={false} />
        <SidebarLink href="/client/entreprise/abonnement" label="💳 Abonnement RH" active={false} />
        <SidebarLink href="/client/abonnement-paie" label="📦 Abonnement Paie" active={true} />
      </aside>
    );
  }

  // Abonnement paie admin (avant "paie")
  if (pathname === "/admin/abonnement-paie") {
    return (
      <aside className="fr-sidebar w-70 min-h-screen bg-white shadow-md p-6 flex flex-col gap-2">
        <p className="text-xs text-gray-400 font-semibold uppercase mb-4">Entreprises</p>
        <SidebarLink href="/admin/entreprises" label="🏢 Liste des entreprises" active={false} />
        <SidebarLink href="/admin/entreprises/nouveau" label="➕ Ajouter une entreprise" active={false} />
        <SidebarLink href="/admin/entreprises/demandes" label="📩 Modifs abonnement" active={false} badge={demandesEnAttente} />
        <SidebarLink href="/admin/entreprises/facturation" label="🧾 Facturation" active={false} />
        <SidebarLink href="/admin/abonnement-paie" label="📦 Abonnements paie" active={true} />
      </aside>
    );
  }

  // Entreprise client
  if (pathname.includes("entreprise") && role === "CLIENT") {
    return (
      <aside className="fr-sidebar w-70 min-h-screen bg-white shadow-md p-6 flex flex-col gap-2">
        <p className="text-xs text-gray-400 font-semibold uppercase mb-4">Mon entreprise</p>
        <SidebarLink href="/client/entreprise" label="🏢 Informations" active={pathname === "/client/entreprise"} />
        <SidebarLink href="/client/entreprise/facturation" label="🧾 Factures" active={pathname === "/client/entreprise/facturation"} />
        <SidebarLink href="/client/entreprise/abonnement" label="💳 Abonnement RH" active={pathname === "/client/entreprise/abonnement"} />
        <SidebarLink href="/client/abonnement-paie" label="📦 Abonnement Paie" active={pathname === "/client/abonnement-paie"} />
      </aside>
    );
  }

  // Entreprises admin
  if (pathname.includes("entreprises") && role === "ADMIN") {
    return (
      <aside className="fr-sidebar w-70 min-h-screen bg-white shadow-md p-6 flex flex-col gap-2">
        <p className="text-xs text-gray-400 font-semibold uppercase mb-4">Entreprises</p>
        <SidebarLink href="/admin/entreprises" label="🏢 Liste des entreprises" active={pathname === "/admin/entreprises"} />
        <SidebarLink href="/admin/entreprises/nouveau" label="➕ Ajouter une entreprise" active={pathname === "/admin/entreprises/nouveau"} />
        <SidebarLink href="/admin/entreprises/demandes" label="📩 Modifs abonnement" active={pathname === "/admin/entreprises/demandes"} badge={demandesEnAttente} />
        <SidebarLink href="/admin/entreprises/facturation" label="🧾 Facturation" active={pathname === "/admin/entreprises/facturation"} />
        <SidebarLink href="/admin/entreprises/prestations" label="🛒 Prestations commandées" active={pathname === "/admin/entreprises/prestations"} />
        <SidebarLink href="/admin/abonnement-paie" label="📦 Abonnements paie" active={pathname === "/admin/abonnement-paie"} />
      </aside>
    );
  }

  // Paie client
  if (pathname.includes("paie") && role === "CLIENT") {
    return (
      <aside className="fr-sidebar w-70 min-h-screen bg-white shadow-md p-6 flex flex-col gap-2">
        <p className="text-xs text-gray-400 font-semibold uppercase mb-4">Paie</p>
        <SidebarLink href="/client/paie" label="📊 Tableau de bord" active={pathname === "/client/paie"} />
        <SidebarLink href="/client/paie/saisie" label="✏️ Saisir des variables" active={pathname === "/client/paie/saisie"} />
        <SidebarLink href="/client/paie/absences" label="🏖️ Absences" active={pathname === "/client/paie/absences"} />
        <SidebarLink href="/client/paie/releves" label="⏱️ Relevés d'heures" active={pathname === "/client/paie/releves"} />
        <SidebarLink href="/client/paie/historique" label="📋 Historique" active={pathname === "/client/paie/historique"} />
        <SidebarLink href="/client/paie/prestations" label="🛒 Prestations" active={pathname === "/client/paie/prestations"} />
      </aside>
    );
  }

  // Paie admin
  if (pathname.includes("paie") && role === "ADMIN") {
    return (
      <aside className="fr-sidebar w-70 min-h-screen bg-white shadow-md p-6 flex flex-col gap-2">
        <p className="text-xs text-gray-400 font-semibold uppercase mb-4">Paie</p>
        <SidebarLink href="/admin/paie" label="📊 Tableau de bord" active={pathname === "/admin/paie"} />
        <SidebarLink href="/admin/paie/variables" label="💰 Variables" active={pathname === "/admin/paie/variables"} />
        <SidebarLink href="/admin/paie/absences" label="🏖️ Absences" active={pathname === "/admin/paie/absences"} />
        <SidebarLink href="/admin/paie/releves" label="⏱️ Relevés d'heures" active={pathname === "/admin/paie/releves"} />
        <SidebarLink href="/admin/paie/historique" label="📋 Historique" active={pathname === "/admin/paie/historique"} />
      </aside>
    );
  }

  // Helpdesk client
  if (pathname.includes("helpdesk") && role === "CLIENT") {
    return (
      <aside className="fr-sidebar w-70 min-h-screen bg-white shadow-md p-6 flex flex-col gap-2">
        <p className="text-xs text-gray-400 font-semibold uppercase mb-4">Helpdesk</p>
        <SidebarLink href="/client/helpdesk" label="🆘 Mes tickets support" active={pathname === "/client/helpdesk"} />
        <SidebarLink href="/client/helpdesk/nouveau" label="➕ Nouveau ticket" active={pathname === "/client/helpdesk/nouveau"} />
      </aside>
    );
  }

  // Helpdesk admin
  if (pathname.includes("helpdesk") && role === "ADMIN") {
    return (
      <aside className="fr-sidebar w-70 min-h-screen bg-white shadow-md p-6 flex flex-col gap-2">
        <p className="text-xs text-gray-400 font-semibold uppercase mb-4">Helpdesk</p>
        <SidebarLink href="/admin/helpdesk" label="🆘 Tous les tickets" active={pathname === "/admin/helpdesk"} />
      </aside>
    );
  }

  return null;
}

function SidebarLink({
  href,
  label,
  active,
  badge = 0,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`
        flex items-center justify-between px-4 py-3 rounded-lg font-semibold transition
        ${active ? "bg-orange-500 text-white" : "text-black hover:bg-gray-100"}
      `}
    >
      <span>{label}</span>
      {badge > 0 && (
        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
          {badge}
        </span>
      )}
    </Link>
  );
}
