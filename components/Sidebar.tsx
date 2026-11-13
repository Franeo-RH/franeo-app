"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
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
        { href: "/admin/entreprises/nouveaux-clients", label: "🆕 Nouveaux clients" },
        { href: "/admin/entreprises/demandes", label: "📦 Modifier un abonnement", badge: demandesEnAttente, aussi: ["/admin/abonnement-paie", "/admin/abonnements-rh"] },
        { href: "/admin/entreprises/facturation", label: "🧾 Facturation" },
        { href: "/admin/entreprises/prestations", label: "➕ Prestations supplémentaires" },
        { href: "/admin/entreprises/devis", label: "🧾 Demandes de devis" },
        { href: "/admin/entreprises/demandes-services", label: "📱 Apps, audits & formations" },
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
        { href: "/admin/salaries/contrats", label: "📝 Contrats générés" },
        { href: "/admin/salaries/pointages", label: "📍 Journal des pointages" },
      ] };
    }
    if (dans("/admin/paie")) {
      return { titre: "Paie", items: [
        { href: "/admin/paie", label: "📊 Tableau de bord" },
        { href: "/admin/paie/variables", label: "💰 Variables" },
        { href: "/admin/paie/releves", label: "⏱️ Relevés d'heures" },
        { href: "/admin/paie/historique", label: "📋 Historique" },
        { href: "/admin/paie/clotures", label: "🔒 Clôtures & journal" },
      ] };
    }
    if (dans("/admin/actualites", "/admin/communication", "/admin/faq")) {
      return { titre: "Communication", items: [
        { href: "/admin/communication", label: "📢 Communications" },
        { href: "/admin/actualites", label: "📰 Actualité RH" },
        { href: "/admin/faq", label: "❓ FAQ" },
        { href: "/admin/communication/buddy", label: "🤖 Questions Buddy" },
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
      { href: "/client/tickets/questions", label: "💬 Mes demandes ponctuelles" },
      { href: "/client/tickets/questions/nouvelle", label: "➕ Nouvelle demande ponctuelle" },
      { href: "/client/tickets/recrutement", label: "🎯 Demander un recrutement", aussi: ["/client/tickets/recrutement/historique"] },
      { href: "/client/tickets/audit", label: "🔍 Demander un audit" },
      { href: "/client/tickets/historique", label: "📋 Historique des demandes" },
    ] };
  }
  if (dans("/client/entreprise", "/client/abonnement-paie")) {
    return { titre: "Mon entreprise", items: [
      { href: "/client/entreprise", label: "🏢 Informations & établissements" },
      { href: "/client/entreprise/facturation", label: "🧾 Mes factures" },
      { href: "/client/entreprise/abonnement", label: "📦 Gestion de mes abonnements", aussi: ["/client/abonnement-paie"] },
      { href: "/client/entreprise/supplements", label: "➕ Mes suppléments" },
      { href: "/client/entreprise/devis", label: "📱 Autres apps & demandes" },
    ] };
  }
  if (dans("/client/salaries")) {
    return { titre: "Gestion RH", items: [
      { href: "/client/salaries/tableau-de-bord", label: "📊 Tableau de bord" },
      { href: "/client/salaries", label: "👥 Liste des salariés" },
      { href: "/client/salaries/services", label: "🧩 Services" },
      { href: "/client/salaries/documents", label: "📁 Documents" },
      { href: "/client/salaries/contrats", label: "📝 Contrats" },
      { href: "/client/salaries/releves", label: "⏱️ Relevés" },
      { href: "/client/salaries/pointages", label: "📍 Badge & présences" },
      { href: "/client/salaries/absences", label: "🏖️ Absences" },
      { href: "/client/salaries/frais", label: "🧾 Notes de frais" },
      { href: "/client/salaries/questions", label: "💬 Questions des salariés" },
      { href: "/client/salaries/mouvements", label: "🔄 Mouvements" },
      { href: "/client/salaries/echeances", label: "⏰ Échéances" },
      { href: "/client/salaries/demandes", label: "📝 Mes demandes", aussi: ["/client/salaries/nouveau"] },
    ] };
  }
  if (dans("/client/projets")) {
    return { titre: "Projets 🚧", items: [
      { href: "/client/projets/tableau-de-bord", label: "📊 Tableau de bord" },
      { href: "/client/projets", label: "📐 Projets" },
      { href: "/client/projets/planning", label: "🗓️ Planning" },
      { href: "/client/projets/rentabilite", label: "📈 Rentabilité & coûts" },
    ] };
  }
  if (dans("/client/paie")) {
    return { titre: "Paie", items: [
      { href: "/client/paie", label: "📊 Tableau de bord" },
      { href: "/client/paie/saisie", label: "✏️ Saisir des variables" },
      { href: "/client/paie/import", label: "📥 Importer en masse" },
      { href: "/client/paie/controle", label: "🔎 Contrôle avant paie" },
      { href: "/client/paie/historique", label: "📋 Historique" },
      { href: "/client/paie/journal", label: "🕓 Journal des saisies" },
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
  const ref = useRef<HTMLElement>(null);
  // Téléphone : la rubrique active reste visible dans la barre qui défile
  useEffect(() => {
    const a = ref.current?.querySelector<HTMLElement>(".fr-actif");
    if (a && ref.current && ref.current.scrollWidth > ref.current.clientWidth) {
      ref.current.scrollTo({ left: a.offsetLeft - 12, behavior: "smooth" });
    }
  }, [pathname]);
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
    <aside ref={ref} className="fr-sidebar" aria-label={r.titre}>
      <p className="fr-side-titre">{r.titre}</p>
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
  // « 👥 Liste des salariés » : l'icône et le texte sont séparés pour un alignement propre
  const [icone, ...reste] = label.split(" ");
  const aIcone = !!icone && !/[A-Za-zÀ-ÿ0-9]/.test(icone);
  return (
    <Link href={href} className={`fr-side-lien${active ? " fr-actif" : ""}`} aria-current={active ? "page" : undefined}>
      {aIcone && <span className="fr-side-icone" aria-hidden="true">{icone}</span>}
      <span className="fr-side-texte">{aIcone ? reste.join(" ") : label}</span>
      {badge > 0 && <span className="fr-side-badge">{badge}</span>}
    </Link>
  );
}
