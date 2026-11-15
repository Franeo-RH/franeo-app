"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { aDroit, droitPourChemin } from "@/lib/droits";
import { useDroits } from "@/components/useDroits";

interface SidebarProps {
  role: "ADMIN" | "CLIENT";
  demandesEnAttente?: number;
  ticketsOuverts?: number;
}

/** `groupe` : les liens d'un même groupe sont rangés sous un intertitre repliable */
type Item = { href: string; label: string; badge?: number; aussi?: string[]; groupe?: string };

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
        { href: "/admin/entreprises", label: "🏢 Liste des entreprises" },
        { href: "/admin/entreprises/nouveau", label: "➕ Ajouter une entreprise" },
        { href: "/admin/entreprises/nouveaux-clients", label: "🆕 Nouveaux clients" },
        { href: "/admin/entreprises/demandes", label: "📦 Abonnements", badge: demandesEnAttente, aussi: ["/admin/abonnement-paie", "/admin/abonnements-rh"], groupe: "💳 Abonnements & facturation" },
        { href: "/admin/entreprises/facturation", label: "🧾 Facturation", groupe: "💳 Abonnements & facturation" },
        { href: "/admin/entreprises/prestations", label: "➕ Prestations supplémentaires", groupe: "💳 Abonnements & facturation" },
        { href: "/admin/entreprises/devis", label: "🧾 Demandes de devis", groupe: "📬 Demandes des clients" },
        { href: "/admin/entreprises/demandes-services", label: "📬 Apps, options & formations", groupe: "📬 Demandes des clients" },
      ] };
    }
    if (dans("/admin/salaries")) {
      return { titre: "Salariés", items: [
        { href: "/admin/salaries", label: "👥 Liste des salariés" },
        { href: "/admin/salaries/nouveau", label: "➕ Ajouter un salarié" },
        { href: "/admin/salaries/demandes", label: "📝 Demandes clients" },
        { href: "/admin/salaries/mouvements", label: "🔄 Mouvements", groupe: "📂 Suivi RH" },
        { href: "/admin/salaries/echeances", label: "⏰ Échéances", groupe: "📂 Suivi RH" },
        { href: "/admin/salaries/contrats", label: "📝 Contrats générés", groupe: "📂 Suivi RH" },
        { href: "/admin/salaries/absences", label: "🏖️ Absences", groupe: "🕒 Temps & absences" },
        { href: "/admin/salaries/pointages", label: "📍 Journal des pointages", groupe: "🕒 Temps & absences" },
        { href: "/admin/salaries/acces", label: "📱 Gestion des accès", groupe: "🔐 Accès & sécurité" },
        { href: "/admin/salaries/rgpd", label: "🔐 RGPD & sécurité", groupe: "🔐 Accès & sécurité" },
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
      { href: "/client/salaries", label: "👥 Liste des salariés", groupe: "👥 Équipe" },
      { href: "/client/salaries/services", label: "🧩 Services", groupe: "👥 Équipe" },
      { href: "/client/salaries/mouvements", label: "🔄 Mouvements", groupe: "👥 Équipe" },
      { href: "/client/salaries/demandes", label: "📝 Mes demandes", aussi: ["/client/salaries/nouveau"], groupe: "👥 Équipe" },
      { href: "/client/salaries/releves", label: "⏱️ Relevés", groupe: "🕒 Temps & absences" },
      { href: "/client/salaries/pointages", label: "📍 Badge & présences", groupe: "🕒 Temps & absences" },
      { href: "/client/salaries/absences", label: "🏖️ Absences", groupe: "🕒 Temps & absences" },
      { href: "/client/salaries/conges", label: "🌴 Soldes de congés", groupe: "🕒 Temps & absences" },
      { href: "/client/salaries/documents", label: "📁 Documents", groupe: "📂 Dossiers" },
      { href: "/client/salaries/contrats", label: "📝 Contrats", groupe: "📂 Dossiers" },
      { href: "/client/salaries/echeances", label: "⏰ Échéances", groupe: "📂 Dossiers" },
      { href: "/client/salaries/frais", label: "🧾 Notes de frais", groupe: "💬 Demandes des salariés" },
      { href: "/client/salaries/questions", label: "💬 Questions", groupe: "💬 Demandes des salariés" },
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
      { href: "/client/actualites/mises-a-jour", label: "🚀 Mises à jour" },
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
  // Téléphone : les rubriques sont dans un menu déroulant, refermé à chaque changement de page
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => { setOuvert(false); }, [pathname]);
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

  const totalBadges = r.items.reduce((t, it) => t + (it.badge ?? 0), 0);
  // Liens regroupés : un bloc par groupe (dans l'ordre d'apparition), les liens sans groupe restent seuls
  const blocs: { groupe?: string; items: Item[] }[] = [];
  for (const it of r.items) {
    const dernier = blocs[blocs.length - 1];
    const existant = it.groupe ? blocs.find((b) => b.groupe === it.groupe) : undefined;
    if (existant) existant.items.push(it);
    else if (!it.groupe && dernier && !dernier.groupe) dernier.items.push(it);
    else blocs.push({ groupe: it.groupe, items: [it] });
  }
  const [iconeActif, ...texteActif] = (actif?.label ?? r.titre).split(" ");
  const aIconeActif = !!iconeActif && !/[A-Za-zÀ-ÿ0-9]/.test(iconeActif);

  return (
    <>
      {/* Ordinateur : barre latérale */}
      <aside className="fr-sidebar" aria-label={r.titre}>
        <p className="fr-side-titre">{r.titre}</p>
        {blocs.map((b) => b.groupe ? (
          <GroupeSidebar key={b.groupe} titre={b.groupe} contientActif={b.items.includes(actif as Item)} badge={b.items.reduce((t, it) => t + (it.badge ?? 0), 0)}>
            {b.items.map((it) => <SidebarLink key={it.href} href={it.href} label={it.label} active={actif === it} badge={it.badge} />)}
          </GroupeSidebar>
        ) : b.items.map((it) => (
          <SidebarLink key={it.href} href={it.href} label={it.label} active={actif === it} badge={it.badge} />
        )))}
      </aside>

      {/* Téléphone : menu déroulant */}
      <div className={`fr-deroulant${ouvert ? " ouvert" : ""}`}>
        <button type="button" className="fr-deroulant-bouton" aria-expanded={ouvert} aria-haspopup="true" onClick={() => setOuvert((o) => !o)}>
          {aIconeActif && <span aria-hidden="true" style={{ fontSize: "20px" }}>{iconeActif}</span>}
          <span style={{ minWidth: 0, textAlign: "left" }}>
            <span className="fr-deroulant-petit">{r.titre}</span>
            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{aIconeActif ? texteActif.join(" ") : actif?.label ?? "Choisir une rubrique"}</span>
          </span>
          {totalBadges > 0 && !ouvert && <span className="fr-side-badge">{totalBadges}</span>}
          <span className="fr-deroulant-fleche" aria-hidden="true">▾</span>
        </button>
        {ouvert && (
          <>
            <div className="fr-deroulant-fond" onClick={() => setOuvert(false)} aria-hidden="true" />
            <nav className="fr-deroulant-panneau" aria-label={r.titre}>
              {blocs.map((b, i) => (
                <div key={b.groupe ?? `sans-groupe-${i}`}>
                  {b.groupe && <p className="fr-deroulant-groupe">{b.groupe}</p>}
                  {b.items.map((it) => (
                    <SidebarLink key={it.href} href={it.href} label={it.label} active={actif === it} badge={it.badge} classe="fr-deroulant-lien" />
                  ))}
                </div>
              ))}
            </nav>
          </>
        )}
      </div>
    </>
  );
}

function SidebarLink({
  href,
  label,
  active,
  badge = 0,
  classe = "fr-side-lien",
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
  classe?: string;
}) {
  // « 👥 Liste des salariés » : l'icône et le texte sont séparés pour un alignement propre
  const [icone, ...reste] = label.split(" ");
  const aIcone = !!icone && !/[A-Za-zÀ-ÿ0-9]/.test(icone);
  return (
    <Link href={href} className={`${classe}${active ? " fr-actif" : ""}`} aria-current={active ? "page" : undefined}>
      {aIcone && <span className="fr-side-icone" aria-hidden="true">{icone}</span>}
      <span className="fr-side-texte">{aIcone ? reste.join(" ") : label}</span>
      {badge > 0 && <span className="fr-side-badge">{badge}</span>}
    </Link>
  );
}

/** Intertitre repliable d'un groupe de liens (ouvert s'il contient la page affichée ; choix mémorisé) */
function GroupeSidebar({ titre, contientActif, badge, children }: { titre: string; contientActif: boolean; badge: number; children: React.ReactNode }) {
  const cle = `franeo-side-${titre}`;
  const [ouvert, setOuvert] = useState(true);
  useEffect(() => {
    if (contientActif) { setOuvert(true); return; }
    try { const v = localStorage.getItem(cle); if (v !== null) setOuvert(v === "1"); } catch { /* navigation privée */ }
  }, [cle, contientActif]);
  const basculer = () => setOuvert((o) => { try { localStorage.setItem(cle, o ? "0" : "1"); } catch { /* navigation privée */ } return !o; });
  const [icone, ...reste] = titre.split(" ");
  return (
    <div className="fr-side-groupe">
      <button type="button" className="fr-side-groupe-titre" aria-expanded={ouvert} onClick={basculer}>
        <span className="fr-side-icone" aria-hidden="true">{icone}</span>
        <span className="fr-side-texte">{reste.join(" ")}</span>
        {!ouvert && badge > 0 && <span className="fr-side-badge">{badge}</span>}
        <span aria-hidden="true" style={{ transform: ouvert ? "rotate(90deg)" : "none", transition: "transform .15s", fontSize: 11 }}>▶</span>
      </button>
      {ouvert && <div className="fr-side-groupe-liens">{children}</div>}
    </div>
  );
}
