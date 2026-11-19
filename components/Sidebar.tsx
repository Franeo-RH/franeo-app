"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
        { href: "/admin/entreprises/cabinets", label: "🏛️ Cabinets comptables" },
        { href: "/admin/entreprises/demandes", label: "📦 Abonnements", badge: demandesEnAttente, aussi: ["/admin/abonnement-paie", "/admin/abonnements-rh"], groupe: "💳 Abonnements & facturation" },
        { href: "/admin/entreprises/facturation", label: "🧾 Facturation", groupe: "💳 Abonnements & facturation" },
        { href: "/admin/entreprises/prestations", label: "➕ Prestations supplémentaires", groupe: "💳 Abonnements & facturation" },
        { href: "/admin/entreprises/remises", label: "🎁 Remises & parrainage", groupe: "💳 Abonnements & facturation" },
        { href: "/admin/entreprises/devis", label: "🧾 Demandes de devis", groupe: "📬 Demandes des clients" },
        { href: "/admin/entreprises/demandes-services", label: "📬 Apps, options & formations", groupe: "📬 Demandes des clients" },
      ] };
    }
    if (dans("/admin/salaries", "/admin/documentaire")) {
      return { titre: "Documentaire", items: [
        { href: "/admin/documentaire", label: "🗂️ Vue d'ensemble" },
        { href: "/admin/salaries/mouvements", label: "🔄 Mouvements", groupe: "📂 Suivi général" },
        { href: "/admin/salaries/echeances", label: "⏰ Échéances", groupe: "📂 Suivi général" },
        { href: "/admin/salaries/accidents", label: "🩹 Accidents du travail", groupe: "📂 Suivi général" },
        { href: "/admin/salaries/pointages", label: "📍 Journal des pointages", groupe: "📜 Journaux" },
        { href: "/admin/salaries/rgpd", label: "🔐 Journal d'activité & RGPD", groupe: "📜 Journaux" },
        { href: "/admin/salaries/acces", label: "📱 Accès des salariés", groupe: "🔑 Accès" },
        { href: "/admin/documentaire/modeles", label: "📄 Modèles de contrats", groupe: "📝 Modèles" },
        { href: "/admin/salaries/courriers", label: "✉️ Modèles de courriers", groupe: "📝 Modèles" },
        { href: "/admin/salaries/contrats", label: "🧐 Contrats générés", groupe: "📝 Modèles" },
      ] };
    }
    if (dans("/admin/paie")) {
      return { titre: "Paie", items: [
        { href: "/admin/paie", label: "📊 Tableau de bord" },
        { href: "/admin/paie/variables", label: "💰 Variables" },
        { href: "/admin/paie/releves", label: "⏱️ Relevés d'heures" },
        { href: "/admin/paie/historique", label: "📋 Historique" },
        { href: "/admin/paie/clotures", label: "🔒 Clôtures & journal" },
        { href: "/admin/paie/absences", label: "🏖️ Absences" },
        { href: "/admin/paie/demandes", label: "📝 Demandes de modification" },
      ] };
    }
    if (dans("/admin/actualites", "/admin/communication", "/admin/faq")) {
      return { titre: "Communication", items: [
        { href: "/admin/communication", label: "📢 Communications" },
        { href: "/admin/actualites", label: "📰 Actualité RH" },
        { href: "/admin/faq", label: "❓ FAQ" },
        { href: "/admin/communication/buddy", label: "🤖 Buddy (questions et réponses)" },
        { href: "/admin/communication/maintenance", label: "🛠️ Maintenance & mises à jour" },
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
      { href: "/client/salaries/suivi-medical", label: "🩺 Suivi médical", groupe: "📂 Dossiers" },
      { href: "/client/salaries/courriers", label: "✉️ Courriers & modèles", groupe: "📂 Dossiers" },
      { href: "/client/salaries/accidents", label: "🩹 Accidents du travail", groupe: "📂 Dossiers" },
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
      { href: "/client/paie/sorties", label: "🚪 Déclarer une sortie" },
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
    ? { ...brut, items: brut.items.filter((it) => {
        if (moi.sansTickets && it.href === "/client/tickets") return false; // client d'un cabinet : pas de tickets RH
        const d = droitPourChemin(it.href); return !d || aDroit(moi.permissions, d);
      }) }
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
        {/* Logo de l'entreprise cliente en bas de la barre (s'il a été ajouté) */}
        {role === "CLIENT" && moi?.logoVersion && (
          <div className="fr-side-pied">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/entreprises/logo?v=${moi.logoVersion}`} alt="Logo de l'entreprise" className="fr-side-logo-client" />
          </div>
        )}
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

/** Groupe de liens : au survol (ou au clic), la liste s'ouvre à droite de la barre latérale */
function GroupeSidebar({ titre, contientActif, badge, children }: { titre: string; contientActif: boolean; badge: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const annuler = () => { if (minuterie.current) { clearTimeout(minuterie.current); minuterie.current = null; } };
  const ouvrir = () => {
    annuler();
    const r = bouton.current?.getBoundingClientRect();
    if (!r) return;
    // Le menu reste dans l'écran même pour un groupe placé en bas de la barre
    const hauteur = Math.min(420, window.innerHeight - 16);
    setPos({ left: r.right + 6, top: Math.max(8, Math.min(r.top - 6, window.innerHeight - hauteur - 8)) });
  };
  const fermerBientot = () => { annuler(); minuterie.current = setTimeout(() => setPos(null), 180); };
  const fermer = () => { annuler(); setPos(null); };

  // Fermé après un clic sur un lien (changement de page), au défilement et avec Échap
  useEffect(() => { fermer(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pos) return;
    const touche = (e: KeyboardEvent) => { if (e.key === "Escape") { fermer(); bouton.current?.focus(); } };
    const defile = () => fermer();
    window.addEventListener("keydown", touche);
    window.addEventListener("resize", defile);
    document.querySelector(".fr-sidebar")?.addEventListener("scroll", defile);
    return () => {
      window.removeEventListener("keydown", touche);
      window.removeEventListener("resize", defile);
      document.querySelector(".fr-sidebar")?.removeEventListener("scroll", defile);
    };
  }, [pos]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => annuler, []);

  const [icone, ...reste] = titre.split(" ");
  return (
    <div className="fr-side-groupe" onMouseEnter={ouvrir} onMouseLeave={fermerBientot}>
      <button
        ref={bouton}
        type="button"
        className={`fr-side-groupe-titre${contientActif ? " fr-actif" : ""}${pos ? " fr-ouvert" : ""}`}
        aria-expanded={!!pos}
        aria-haspopup="true"
        onClick={() => (pos ? fermer() : ouvrir())}
      >
        <span className="fr-side-icone" aria-hidden="true">{icone}</span>
        <span className="fr-side-texte">{reste.join(" ")}</span>
        {badge > 0 && <span className="fr-side-badge">{badge}</span>}
        <span aria-hidden="true" className="fr-side-groupe-fleche">›</span>
      </button>
      {pos && (
        <div className="fr-side-volet" role="menu" aria-label={reste.join(" ")} style={{ top: pos.top, left: pos.left }} onMouseEnter={annuler} onMouseLeave={fermerBientot}>
          <p className="fr-side-volet-titre">{titre}</p>
          {children}
        </div>
      )}
    </div>
  );
}
