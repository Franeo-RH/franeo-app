"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { aDroit, droitPourChemin } from "@/lib/droits";
import { useDroits } from "@/components/useDroits";

interface SidebarProps {
  role: "ADMIN" | "CLIENT";
  demandesEnAttente?: number;
  ticketsOuverts?: number;
}

type Item = { href: string; label: string; badge?: number; aussi?: string[] };

/** Liste des liens de la barre latérale selon l'onglet ouvert */
function rubrique(pathname: string, role: "ADMIN" | "CLIENT", demandesEnAttente: number, ticketsOuverts: number): { titre: string; items: Item[] } | null {
  const dans = (...mots: string[]) => mots.some((m) => pathname.includes(m));

  if (role === "ADMIN") {
    if (dans("/admin/tickets", "/admin/recrutement", "/admin/entreprises/tickets")) {
      return { titre: "Tickets RH", items: [
        { href: "/admin/tickets", label: "🎫 Tous les tickets", badge: ticketsOuverts },
        { href: "/admin/tickets/questions", label: "💬 Demandes RH ponctuelles" },
        { href: "/admin/entreprises/tickets", label: "💰 Facturation tickets" },
        { href: "/admin/recrutement", label: "🎯 Recrutement" },
      ] };
    }
    if (dans("/admin/entreprises", "/admin/abonnement-paie", "/admin/abonnements-rh")) {
      return { titre: "Entreprises", items: [
        { href: "/admin/entreprises/nouveau", label: "➕ Ajouter une entreprise" },
        { href: "/admin/entreprises", label: "🏢 Liste des entreprises" },
        { href: "/admin/entreprises/demandes", label: "📦 Modifier un abonnement", badge: demandesEnAttente, aussi: ["/admin/abonnement-paie", "/admin/abonnements-rh"] },
        { href: "/admin/entreprises/facturation", label: "🧾 Facturation" },
        { href: "/admin/entreprises/prestations", label: "➕ Prestations supplémentaires" },
        { href: "/admin/entreprises/devis", label: "🧾 Demandes de devis" },
      ] };
    }
    if (dans("/admin/salaries")) {
      return { titre: "Salariés", items: [
        { href: "/admin/salaries", label: "👥 Liste des salariés" },
        { href: "/admin/salaries/mouvements", label: "🔄 Mouvements" },
        { href: "/admin/salaries/echeances", label: "⏰ Échéances" },
        { href: "/admin/salaries/demandes", label: "📝 Demandes clients" },
        { href: "/admin/salaries/nouveau", label: "➕ Ajouter un salarié" },
        { href: "/admin/salaries/acces", label: "📱 Gestion des accès" },
        { href: "/admin/salaries/absences", label: "🏖️ Absences" },
      ] };
    }
    if (dans("/admin/paie")) {
      return { titre: "Paie", items: [
        { href: "/admin/paie", label: "📊 Tableau de bord" },
        { href: "/admin/paie/variables", label: "💰 Variables" },
        { href: "/admin/paie/releves", label: "⏱️ Relevés d'heures" },
        { href: "/admin/paie/historique", label: "📋 Historique" },
      ] };
    }
    if (dans("/admin/actualites", "/admin/communication", "/admin/faq")) {
      return { titre: "Communication", items: [
        { href: "/admin/communication", label: "📢 Communications" },
        { href: "/admin/actualites", label: "📰 Actualité RH" },
        { href: "/admin/faq", label: "❓ FAQ" },
      ] };
    }
    if (dans("/admin/helpdesk")) {
      return { titre: "Helpdesk", items: [
        { href: "/admin/helpdesk", label: "🆘 Tous les tickets" },
      ] };
    }
    return null;
  }

  // ── Client ──
  if (dans("/client/tickets")) {
    return { titre: "Tickets RH", items: [
      { href: "/client/tickets", label: "🎫 Mes tickets" },
      { href: "/client/tickets/nouveau", label: "➕ Nouveau ticket" },
      { href: "/client/tickets/questions", label: "💬 Demande RH ponctuelle" },
      { href: "/client/tickets/recrutement", label: "🎯 Demander un recrutement" },
      { href: "/client/tickets/recrutement/historique", label: "📋 Historique recrutement" },
    ] };
  }
  if (dans("/client/entreprise", "/client/abonnement-paie")) {
    return { titre: "Mon entreprise", items: [
      { href: "/client/entreprise", label: "🏢 Informations" },
      { href: "/client/entreprise/facturation", label: "🧾 Mes factures" },
      { href: "/client/entreprise/abonnement", label: "📦 Gestion de mes abonnements", aussi: ["/client/abonnement-paie"] },
      { href: "/client/entreprise/supplements", label: "➕ Mes suppléments" },
      { href: "/client/entreprise/devis", label: "🧾 Demande de devis" },
    ] };
  }
  if (dans("/client/salaries")) {
    return { titre: "Salariés", items: [
      { href: "/client/salaries", label: "👥 Liste des salariés" },
      { href: "/client/salaries/mouvements", label: "🔄 Mouvements" },
      { href: "/client/salaries/echeances", label: "⏰ Échéances" },
      { href: "/client/salaries/absences", label: "🏖️ Absences" },
      { href: "/client/salaries/demandes", label: "📝 Mes demandes", aussi: ["/client/salaries/nouveau"] },
    ] };
  }
  if (dans("/client/paie")) {
    return { titre: "Paie", items: [
      { href: "/client/paie", label: "📊 Tableau de bord" },
      { href: "/client/paie/saisie", label: "✏️ Saisir des variables" },
      { href: "/client/paie/releves", label: "⏱️ Relevés d'heures" },
      { href: "/client/paie/historique", label: "📋 Historique" },
    ] };
  }
  if (dans("/client/actualites", "/client/faq")) {
    return { titre: "Communication", items: [
      { href: "/client/actualites", label: "📢 Communications & actualité RH" },
      { href: "/client/faq", label: "❓ FAQ" },
    ] };
  }
  if (dans("/client/helpdesk")) {
    return { titre: "Helpdesk", items: [
      { href: "/client/helpdesk", label: "🆘 Mes tickets support" },
      { href: "/client/helpdesk/nouveau", label: "➕ Nouveau ticket" },
    ] };
  }
  return null;
}

export default function Sidebar({ role, demandesEnAttente = 0, ticketsOuverts = 0 }: SidebarProps) {
  const pathname = usePathname();
  const moi = useDroits();
  const brut = rubrique(pathname, role, demandesEnAttente, ticketsOuverts);
  if (!brut) return null;
  // Client : on cache les liens dont le droit a été retiré par l'admin
  const r = role === "CLIENT" && moi
    ? { ...brut, items: brut.items.filter((it) => { const d = droitPourChemin(it.href); return !d || aDroit(moi.permissions, d); }) }
    : brut;

  // Lien actif : le plus long chemin qui correspond (ex. /admin/paie/variables plutôt que /admin/paie)
  const correspond = (h: string) => pathname === h || pathname.startsWith(h + "/");
  let actif: Item | null = null;
  let longueur = -1;
  for (const it of r.items) {
    for (const h of [it.href, ...(it.aussi || [])]) {
      if (correspond(h) && h.length > longueur) { actif = it; longueur = h.length; }
    }
  }

  return (
    <aside className="fr-sidebar w-70 min-h-screen bg-white shadow-md p-6 flex flex-col gap-2">
      <p className="text-xs text-gray-400 font-semibold uppercase mb-4">{r.titre}</p>
      {r.items.map((it) => (
        <SidebarLink key={it.href} href={it.href} label={it.label} active={actif === it} badge={it.badge} />
      ))}
    </aside>
  );
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
