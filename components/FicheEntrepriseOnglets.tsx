// Onglets de la fiche entreprise (admin) : Salariés, Facturation, Demandes, Journal — rendus côté serveur
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calculerFacture, rangRemise } from "@/lib/facturation";
import { reglageParrainage, texteRecompense } from "@/lib/parrainage";
import GestionRemises from "@/components/GestionRemises";
import CommissionEntreprise from "@/components/CommissionEntreprise";
import BoutonAction from "@/components/BoutonAction";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const date = (d: Date | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
const carte = "bg-white rounded-xl shadow p-6";
const pastille = (texte: string, couleur: string, fond: string) => <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: couleur, background: fond }}>{texte}</span>;

export const ONGLETS_FICHE = [
  { id: "infos", label: "📋 Infos" },
  { id: "salaries", label: "👥 Salariés" },
  { id: "facturation", label: "🧾 Facturation" },
  { id: "remises", label: "🎁 Remises & parrainage" },
  { id: "demandes", label: "📬 Demandes" },
  { id: "journal", label: "📜 Journal" },
] as const;

export function BarreOnglets({ id, actif, compteurs }: { id: string; actif: string; compteurs: Partial<Record<string, number>> }) {
  return (
    <nav className="flex gap-2 flex-wrap mb-6" role="tablist" aria-label="Rubriques de la fiche">
      {ONGLETS_FICHE.map((o) => (
        <Link key={o.id} href={`/admin/entreprises/${id}${o.id === "infos" ? "" : `?onglet=${o.id}`}`} role="tab" aria-selected={actif === o.id}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${actif === o.id ? "bg-orange-500 text-white" : "bg-white text-gray-600 hover:bg-gray-100 shadow-sm"}`}>
          {o.label}{compteurs[o.id] ? <span className="ml-2 rounded-full px-2 text-xs" style={{ background: actif === o.id ? "rgba(255,255,255,.25)" : "#fff7ed", color: actif === o.id ? "#fff" : "#c2410c" }}>{compteurs[o.id]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export async function OngletSalaries({ id }: { id: string }) {
  const maintenant = new Date();
  const salaries = await prisma.salarie.findMany({
    where: { entrepriseId: id },
    select: { id: true, prenom: true, nom: true, poste: true, typeContrat: true, dateDebut: true, dateFin: true, statut: true, compte: { select: { actif: true } } },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });
  const enPoste = salaries.filter((s) => s.statut === "Actif" && (!s.dateFin || s.dateFin >= maintenant));
  const autres = salaries.filter((s) => !enPoste.includes(s));
  const ligne = (s: (typeof salaries)[number]) => (
    <tr key={s.id} className="border-b last:border-0">
      <td data-label="Salarié" className="py-2 font-semibold"><Link href={`/admin/salaries/${s.id}`} className="hover:text-orange-600">{s.prenom} {s.nom}</Link></td>
      <td data-label="Poste" className="py-2">{s.poste || "—"}</td>
      <td data-label="Contrat" className="py-2">{s.typeContrat || "—"}</td>
      <td data-label="Entrée" className="py-2">{date(s.dateDebut)}</td>
      <td data-label="Sortie" className="py-2">{date(s.dateFin)}</td>
      <td data-label="Espace" className="py-2">{s.compte ? (s.compte.actif ? "📱 Actif" : "⏸️ Coupé") : "—"}</td>
      <td data-label="" className="py-2 text-right whitespace-nowrap">
        <Link href={`/admin/salaries/${s.id}`} className="text-orange-600 font-semibold hover:underline mr-3">Fiche</Link>
        <Link href={`/admin/salaries/${s.id}/modifier`} className="text-gray-700 font-semibold hover:underline">✏️ Modifier</Link>
      </td>
    </tr>
  );
  const tableau = (liste: typeof salaries) => (
    <table className="w-full text-sm text-left">
      <thead><tr className="text-gray-500 border-b"><th className="pb-2">Salarié</th><th className="pb-2">Poste</th><th className="pb-2">Contrat</th><th className="pb-2">Entrée</th><th className="pb-2">Sortie</th><th className="pb-2">Espace</th><th /></tr></thead>
      <tbody>{liste.map(ligne)}</tbody>
    </table>
  );
  return (
    <div className="flex flex-col gap-6">
      <div className={carte}>
        <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
          <h2 className="text-lg font-bold">👥 En poste ({enPoste.length})</h2>
          <div className="flex gap-2 flex-wrap text-sm font-semibold">
            <Link href={`/admin/salaries?entreprise=${id}`} className="border rounded-lg px-3 py-2 hover:bg-gray-50">Liste complète et filtres</Link>
            <Link href="/admin/salaries/nouveau" className="bg-orange-500 text-white rounded-lg px-3 py-2 hover:bg-orange-600">➕ Ajouter un salarié</Link>
          </div>
        </div>
        {enPoste.length === 0 ? <p className="text-gray-500 text-sm">Aucun salarié en poste.</p> : tableau(enPoste)}
      </div>
      {autres.length > 0 && (
        <details className={carte}>
          <summary className="font-bold cursor-pointer">📦 Sortis ou inactifs ({autres.length})</summary>
          <div className="mt-4">{tableau(autres)}</div>
        </details>
      )}
    </div>
  );
}

export async function OngletFacturation({ id }: { id: string }) {
  const maintenant = new Date();
  const mois = maintenant.getMonth() + 1, annee = maintenant.getFullYear();
  const [factures, estimation] = await Promise.all([
    prisma.facturation.findMany({ where: { entrepriseId: id }, orderBy: [{ annee: "desc" }, { mois: "desc" }] }),
    calculerFacture(id, mois, annee),
  ]);
  const total = factures.reduce((t, f) => t + f.montant, 0);
  const annuel = factures.filter((f) => f.annee === annee).reduce((t, f) => t + f.montant, 0);
  const attente = factures.filter((f) => f.statut !== "Payé").reduce((t, f) => t + f.montant, 0);
  const dejaFacture = factures.some((f) => f.mois === mois && f.annee === annee);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {[
          { l: `Facturé ${annee}`, v: eur(annuel) },
          { l: "Depuis le début", v: eur(total) },
          { l: "En attente de paiement", v: eur(attente), alerte: attente > 0 },
          { l: `${MOIS[mois - 1]} ${dejaFacture ? "(facturé)" : "(estimation)"}`, v: eur(estimation?.montant ?? 0) },
        ].map((k) => (
          <div key={k.l} className="bg-white rounded-xl shadow p-4">
            <p className="text-xs font-semibold text-gray-500">{k.l}</p>
            <p className="text-2xl font-bold" style={{ color: k.alerte ? "#dc2626" : "#111827" }}>{k.v}</p>
          </div>
        ))}
      </div>
      {!dejaFacture && estimation && estimation.details.length > 0 && (
        <div className={carte}>
          <h2 className="text-lg font-bold mb-3">🧮 Estimation de {MOIS[mois - 1]}</h2>
          <ul className="text-sm flex flex-col gap-1">{estimation.details.map((d, i) => <li key={i}>• {d}</li>)}</ul>
        </div>
      )}
      <div className={carte}>
        <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
          <h2 className="text-lg font-bold">🧾 Factures ({factures.length})</h2>
          <span className="flex gap-4 items-center">
            <BoutonAction url="/api/admin/bilan-mensuel" corps={{ entrepriseId: id }} label="📊 Envoyer le bilan du mois dernier" confirmer="Envoyer maintenant le bilan du mois dernier aux dirigeants ?" />
            <Link href="/admin/entreprises/facturation" className="text-sm font-semibold text-orange-600 hover:underline">Gérer la facturation →</Link>
          </span>
        </div>
        {factures.length === 0 ? <p className="text-sm text-gray-500">Aucune facture pour l&apos;instant.</p> : (
          <table className="w-full text-sm text-left">
            <thead><tr className="text-gray-500 border-b"><th className="pb-2">Mois</th><th className="pb-2">Montant</th><th className="pb-2">Statut</th><th className="pb-2">Date limite</th><th className="pb-2">Relances</th></tr></thead>
            <tbody>
              {factures.map((f) => (
                <tr key={f.id} className="border-b last:border-0">
                  <td data-label="Mois" className="py-2 font-semibold">{MOIS[f.mois - 1]} {f.annee}</td>
                  <td data-label="Montant" className="py-2">{eur(f.montant)}</td>
                  <td data-label="Statut" className="py-2">{f.statut === "Payé" ? pastille("Payé", "#15803d", "#dcfce7") : pastille(f.statut, "#b45309", "#fef3c7")}</td>
                  <td data-label="Date limite" className="py-2">{date(f.dateLimitePaie)}</td>
                  <td data-label="Relances" className="py-2">
                    {f.relances ? `${f.relances} (le ${date(f.derniereRelance)}) ` : ""}
                    {f.statut !== "Payé" && <BoutonAction url="/api/admin/relances" corps={{ facturationId: f.id }} label="✉️ Relancer" confirmer="Envoyer une relance de paiement au client ?" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export async function OngletDemandes({ id }: { id: string }) {
  const [devis, services, demandesSal, tickets, questions] = await Promise.all([
    prisma.devis.findMany({ where: { entrepriseId: id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, statut: true, totalIndicatif: true, montantPropose: true, createdAt: true } }),
    prisma.demandeService.findMany({ where: { entrepriseId: id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, type: true, statut: true, options: true, createdAt: true } }),
    prisma.demandeSalarie.findMany({ where: { entrepriseId: id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, type: true, statut: true, resume: true, createdAt: true } }),
    prisma.ticket.findMany({ where: { entrepriseId: id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, titre: true, statut: true, createdAt: true } }),
    prisma.questionRH.findMany({ where: { entrepriseId: id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, sujet: true, statut: true, createdAt: true } }),
  ]);
  const enCours = (s: string) => ["EN_ATTENTE", "EN_COURS", "En attente", "OUVERTE", "Reçue"].includes(s) || (s !== "Clôturé" && s !== "CLOSE" && s !== "TRAITEE" && s !== "VALIDEE" && s !== "REFUSEE" && s !== "ACCEPTE" && s !== "REFUSE");
  const bloc = (titre: string, lien: string, lignes: { id: string; texte: string; statut: string; date: Date; href?: string }[]) => (
    <div className={carte}>
      <div className="flex justify-between items-center gap-3 mb-3">
        <h2 className="text-lg font-bold">{titre} ({lignes.length})</h2>
        <Link href={lien} className="text-sm font-semibold text-orange-600 hover:underline">Tout voir →</Link>
      </div>
      {lignes.length === 0 ? <p className="text-sm text-gray-500">Aucune demande.</p> : (
        <ul className="flex flex-col">
          {lignes.map((l) => (
            <li key={l.id} className="flex justify-between gap-3 py-2 border-b last:border-0 text-sm">
              {l.href ? <Link href={l.href} className="font-semibold hover:text-orange-600 min-w-0 truncate">{l.texte}</Link> : <span className="font-semibold min-w-0 truncate">{l.texte}</span>}
              <span className="flex gap-2 items-center shrink-0">
                {enCours(l.statut) ? pastille(l.statut, "#b45309", "#fef3c7") : pastille(l.statut, "#4b5563", "#f3f4f6")}
                <span className="text-xs text-gray-400">{date(l.date)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
      {bloc("📝 Demandes salariés", "/admin/paie/demandes", demandesSal.map((d) => ({ id: d.id, texte: d.resume || d.type, statut: d.statut, date: d.createdAt })))}
      {bloc("🧾 Devis", "/admin/entreprises/devis", devis.map((d) => ({ id: d.id, texte: `Devis ${d.montantPropose != null ? eur(d.montantPropose) : `indicatif ${eur(d.totalIndicatif)}`}`, statut: d.statut, date: d.createdAt })))}
      {bloc("📬 Apps, options & formations", "/admin/entreprises/demandes-services", services.map((d) => ({ id: d.id, texte: d.options[0] || d.type, statut: d.statut, date: d.createdAt })))}
      {bloc("🎫 Tickets RH", "/admin/tickets", tickets.map((t) => ({ id: t.id, texte: t.titre, statut: t.statut, date: t.createdAt, href: `/admin/tickets/${t.id}` })))}
      {bloc("💬 Conseil RH ponctuel", "/admin/tickets/questions", questions.map((q) => ({ id: q.id, texte: q.sujet, statut: q.statut, date: q.createdAt })))}
    </div>
  );
}

export async function OngletJournal({ id, du, au }: { id: string; du?: string; au?: string }) {
  const j = (v?: string, fin = false) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T${fin ? "23:59:59" : "00:00:00"}`) : null);
  const debut = j(du), fin = j(au, true);
  const periode = debut || fin ? { createdAt: { ...(debut ? { gte: debut } : {}), ...(fin ? { lte: fin } : {}) } } : {};
  const [audit, paie] = await Promise.all([
    prisma.journalAudit.findMany({ where: { entrepriseId: id, ...periode }, orderBy: { createdAt: "desc" }, take: 150 }),
    prisma.journalPaie.findMany({ where: { entrepriseId: id, ...periode }, orderBy: { createdAt: "desc" }, take: 150 }),
  ]);
  const lignes = [
    ...audit.map((a) => ({ id: a.id, date: a.createdAt, icone: "🔐", qui: a.email || "—", texte: [a.action, a.cible, a.details].filter(Boolean).join(" · ") })),
    ...paie.map((p) => ({ id: p.id, date: p.createdAt, icone: "💰", qui: p.auteur, texte: `${p.action} · ${p.detail}` })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 200);
  return (
    <div className={carte}>
      <form method="get" className="flex gap-2 flex-wrap items-center mb-4 text-sm">
        <input type="hidden" name="onglet" value="journal" />
        <h2 className="text-lg font-bold mr-auto">📜 Journal du client</h2>
        <label className="flex items-center gap-1">Du <input type="date" name="du" defaultValue={du} className="border rounded-lg px-2 py-1.5" /></label>
        <label className="flex items-center gap-1">au <input type="date" name="au" defaultValue={au} className="border rounded-lg px-2 py-1.5" /></label>
        <button type="submit" className="bg-black text-white rounded-lg px-3 py-1.5 font-semibold">Filtrer</button>
      </form>
      {lignes.length === 0 ? <p className="text-sm text-gray-500">Aucun événement sur la période.</p> : (
        <ul className="flex flex-col text-sm">
          {lignes.map((l) => (
            <li key={l.id} className="flex gap-3 py-2 border-b last:border-0">
              <span>{l.icone}</span>
              <span className="min-w-0 flex-1"><span className="font-semibold">{l.texte}</span><span className="block text-xs text-gray-500">{l.qui} · {new Date(l.date).toLocaleString("fr-FR")}</span></span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-gray-400 mt-3">🔐 Connexions, exports, droits, suppressions · 💰 Saisies et modifications de paie.</p>
    </div>
  );
}

/** Période lisible d'une remise datée et son état ce mois-ci */
function periodeRemise(r: { moisDebut: number; anneeDebut: number; nbMois: number | null }, mois: number, annee: number) {
  const debut = `${MOIS[r.moisDebut - 1]} ${r.anneeDebut}`;
  let periode = `dès ${debut}, sans fin`;
  if (r.nbMois != null) {
    const finIdx = r.anneeDebut * 12 + (r.moisDebut - 1) + r.nbMois - 1;
    periode = r.nbMois === 1 ? debut : `${debut} → ${MOIS[finIdx % 12]} ${Math.floor(finIdx / 12)} (${r.nbMois} mois)`;
  }
  const etat: "EN_COURS" | "A_VENIR" | "TERMINEE" = rangRemise(r, mois, annee) != null
    ? "EN_COURS"
    : annee * 12 + mois < r.anneeDebut * 12 + r.moisDebut ? "A_VENIR" : "TERMINEE";
  return { periode, etat };
}

export async function OngletRemises({ id }: { id: string }) {
  const maintenant = new Date();
  const mois = maintenant.getMonth() + 1, annee = maintenant.getFullYear();
  const [entreprise, filleuls, reglage] = await Promise.all([
    prisma.entreprise.findUnique({
      where: { id },
      select: { remisePct: true, codeParrainage: true, parrainId: true, commissionPct: true, commissionBeneficiaire: true, commissionMoisDebut: true, commissionAnneeDebut: true, commissionNbMois: true, commissionSource: true, remises: { orderBy: [{ anneeDebut: "desc" }, { moisDebut: "desc" }] } },
    }),
    prisma.entreprise.findMany({ where: { parrainId: id }, select: { id: true, nom: true, actif: true, createdAt: true }, orderBy: { createdAt: "desc" } }),
    reglageParrainage(),
  ]);
  if (!entreprise) return null;
  const parrain = entreprise.parrainId ? await prisma.entreprise.findUnique({ where: { id: entreprise.parrainId }, select: { id: true, nom: true } }) : null;
  const base = (process.env.NEXT_PUBLIC_URL || process.env.APP_URL || "https://app.franeo-rh.com").replace(/\/$/, "");
  const remises = entreprise.remises.map((r) => ({ id: r.id, libelle: r.libelle, motif: r.motif, type: r.type, valeur: r.valeur, portee: r.portee, ...periodeRemise(r, mois, annee) }));
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="bg-white rounded-xl shadow p-4"><p className="text-xs font-semibold text-gray-500">Remise permanente</p><p className="text-2xl font-bold">{entreprise.remisePct ? `${entreprise.remisePct} %` : "—"}</p></div>
        <div className="bg-white rounded-xl shadow p-4"><p className="text-xs font-semibold text-gray-500">Remises en cours</p><p className="text-2xl font-bold">{remises.filter((r) => r.etat === "EN_COURS").length}</p></div>
        <div className="bg-white rounded-xl shadow p-4"><p className="text-xs font-semibold text-gray-500">Filleules</p><p className="text-2xl font-bold">{filleuls.length}</p></div>
        <div className="bg-white rounded-xl shadow p-4"><p className="text-xs font-semibold text-gray-500">Récompense de parrainage</p><p className="text-sm font-semibold mt-1">{texteRecompense(reglage)}</p><Link href="/admin/entreprises/remises" className="text-xs text-orange-600 hover:underline">Régler</Link></div>
      </div>
      <GestionRemises
        entrepriseId={id}
        code={entreprise.codeParrainage}
        lienParrainage={entreprise.codeParrainage ? `${base}/login?parrain=${encodeURIComponent(entreprise.codeParrainage)}` : null}
        parrain={parrain}
        remises={remises}
        moisCourant={`${annee}-${String(mois).padStart(2, "0")}`}
      />
      <CommissionEntreprise
        entrepriseId={id}
        moisCourant={`${annee}-${String(mois).padStart(2, "0")}`}
        commission={entreprise.commissionPct ? {
          pct: entreprise.commissionPct, beneficiaire: entreprise.commissionBeneficiaire, nbMois: entreprise.commissionNbMois, source: entreprise.commissionSource,
          debut: entreprise.commissionMoisDebut && entreprise.commissionAnneeDebut ? `${entreprise.commissionAnneeDebut}-${String(entreprise.commissionMoisDebut).padStart(2, "0")}` : null,
        } : null}
      />
      {filleuls.length > 0 && (
        <div className={carte}>
          <h2 className="text-lg font-bold mb-3">🌱 Entreprises parrainées ({filleuls.length})</h2>
          <ul className="text-sm flex flex-col gap-1">
            {filleuls.map((f) => <li key={f.id}>• <Link href={`/admin/entreprises/${f.id}`} className="font-semibold hover:text-orange-600">{f.nom}</Link> — depuis le {date(f.createdAt)}{f.actif === false ? " (suspendue)" : ""}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
