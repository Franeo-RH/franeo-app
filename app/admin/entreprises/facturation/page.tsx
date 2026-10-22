"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

type Entreprise = { id: string; nom: string };
type Facturation = {
  id: string;
  mois: number;
  annee: number;
  montant: number;
  dateLimitePaie: string | null;
  statut: string;
  commentaire: string | null;
  entreprise: { nom: string };
};

function lignesCommentaire(commentaire: string | null): string[] {
  if (!commentaire) return [];
  return commentaire
    .replace(/ \| /g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function recharger(setFacturations: (data: Facturation[]) => void) {
  fetch("/api/facturation")
    .then(r => r.json())
    .then(data => setFacturations(Array.isArray(data) ? data : []));
}

export default function AdminFacturation() {
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [facturations, setFacturations] = useState<Facturation[]>([]);
  const [mode, setMode] = useState<"" | "generer" | "manuel">("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [detailsSucces, setDetailsSucces] = useState<string[]>([]);
  const [filtreEntreprise, setFiltreEntreprise] = useState("");
  const [filtreAnnee, setFiltreAnnee] = useState(new Date().getFullYear());
  const [filtreMoisExport, setFiltreMoisExport] = useState(new Date().getMonth() + 1);
  const [apercuGeneration, setApercuGeneration] = useState<any>(null);

  const anneeActuelle = new Date().getFullYear();
  const ANNEES = Array.from({ length: 5 }, (_, i) => anneeActuelle - 2 + i);

  const [formGenerer, setFormGenerer] = useState({
    entrepriseId: "",
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
  });

  const [formManuel, setFormManuel] = useState({
    entrepriseId: "",
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
    montant: "",
    dateLimitePaie: "",
    commentaire: "",
  });

  useEffect(() => {
    fetch("/api/entreprises")
      .then(r => r.json())
      .then(data => setEntreprises(Array.isArray(data) ? data : []));
    recharger(setFacturations);
  }, []);

  async function calculerApercu(entrepriseId: string, mois: number, annee: number) {
    if (!entrepriseId || entrepriseId === "tous") { setApercuGeneration(null); return; }

    const entreprise = await fetch(`/api/entreprises/${entrepriseId}`).then(r => r.json());

    if (!entreprise.abonnementId && !entreprise.abonnementPaieId) {
      setApercuGeneration({ erreur: "Cette entreprise n'a aucun abonnement (RH ou paie)." });
      return;
    }

    const salaries = await fetch("/api/salaries").then(r => r.json());
    const salariesEntreprise = (Array.isArray(salaries) ? salaries : []).filter(
      (s: any) => s.entrepriseId === entrepriseId
    );

    // Salariés actifs sur le mois choisi
    const debutMois = new Date(annee, mois - 1, 1);
    const finMois = new Date(annee, mois, 0);
    const nbSalariesMois = salariesEntreprise.filter((s: any) => {
      if (s.statut !== "Actif" || !s.dateDebut) return false;
      if (new Date(s.dateDebut) > finMois) return false;
      if (s.dateFin && new Date(s.dateFin) < debutMois) return false;
      return true;
    }).length;

    let montant = 0;
    const details: string[] = [];

    // ── Abonnement RH ──
    if (entreprise.abonnementId) {
      const abonnements = await fetch("/api/abonnements").then(r => r.json());
      const abo = abonnements.find((a: any) => a.id === entreprise.abonnementId);

      if (abo) {
        montant += abo.prixMensuel;
        details.push(`${abo.nom} : ${abo.prixMensuel} €`);

        const salariesSupp = Math.max(nbSalariesMois - abo.salariesInclus, 0);
        if (salariesSupp > 0 && abo.prixSalarieSupp > 0) {
          const cout = salariesSupp * abo.prixSalarieSupp;
          montant += cout;
          details.push(`${nbSalariesMois} salariés dont ${salariesSupp} supp. (${abo.prixSalarieSupp} €) : ${cout} €`);
        }

        const ticketsSupp = Math.max((entreprise.ticketsUtilises || 0) - abo.ticketsRH, 0);
        if (ticketsSupp > 0 && abo.prixTicketSupp > 0) {
          const cout = ticketsSupp * abo.prixTicketSupp;
          montant += cout;
          details.push(`${ticketsSupp} ticket(s) supp. × ${abo.prixTicketSupp} € : ${cout} €`);
        }
      }
    }

    // ── Abonnement Paie ──
    if (entreprise.abonnementPaieId) {
      const formules = await fetch("/api/abonnement-paie").then(r => r.json());
      const paie = (Array.isArray(formules) ? formules : []).find(
        (f: any) => f.id === entreprise.abonnementPaieId
      );

      if (paie) {
        montant += paie.prixMensuel;
        details.push(`Paie ${paie.nom} : ${paie.prixMensuel} €`);

        const bulletinsSupp = Math.max(nbSalariesMois - paie.bulletinsInclus, 0);
        if (bulletinsSupp > 0 && paie.prixBulletinSupp > 0) {
          const cout = bulletinsSupp * paie.prixBulletinSupp;
          montant += cout;
          details.push(`${nbSalariesMois} bulletins dont ${bulletinsSupp} supp. (${paie.prixBulletinSupp} €) : ${cout} €`);
        }
      }
    }

    setApercuGeneration({ montant: Math.round(montant * 100) / 100, details });
  }

  async function handleGenerer(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur("");
    setSucces("");
    setDetailsSucces([]);

    if (formGenerer.entrepriseId === "tous") {
      let nbGeneres = 0;
      let nbIgnores = 0;
      for (const entreprise of entreprises) {
        const res = await fetch("/api/facturation/generer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formGenerer, entrepriseId: entreprise.id }),
        });
        if (res.ok) nbGeneres++;
        else nbIgnores++;
      }
      setSucces(`✅ ${nbGeneres} facturation(s) générée(s)${nbIgnores > 0 ? ` — ${nbIgnores} ignorée(s) (sans abonnement ou déjà générée)` : ""}`);
      recharger(setFacturations);
      setMode("");
      setApercuGeneration(null);
      setChargement(false);
      return;
    }

    const res = await fetch("/api/facturation/generer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formGenerer),
    });

    const data = await res.json();

    if (!res.ok) {
      setErreur(data.erreur || "Une erreur est survenue");
      setChargement(false);
      return;
    }

    setSucces(`✅ Facturation générée : ${data.montant} €`);
    setDetailsSucces(data.details || []);
    setMode("");
    setApercuGeneration(null);
    recharger(setFacturations);
    setChargement(false);
  }

  async function handleSupprimerGeneration() {
    if (!formGenerer.entrepriseId) {
      setErreur("Sélectionnez d'abord une entreprise (ou « Tous les clients »).");
      return;
    }
    const cible = formGenerer.entrepriseId === "tous"
      ? "de TOUS les clients"
      : `de ${entreprises.find(e => e.id === formGenerer.entrepriseId)?.nom ?? "ce client"}`;
    if (!confirm(`Supprimer la facturation de ${MOIS[formGenerer.mois - 1]} ${formGenerer.annee} ${cible} ?\n\nLes factures déjà payées sont conservées. Une ligne de recrutement ajoutée sur ce mois sera supprimée aussi.`)) return;

    setChargement(true);
    setErreur("");
    setSucces("");
    setDetailsSucces([]);

    const res = await fetch("/api/facturation/supprimer-mois", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formGenerer),
    });
    const data = await res.json();

    if (!res.ok) {
      setErreur(data.erreur || "Une erreur est survenue");
    } else {
      setSucces(
        `🗑️ ${data.supprimees} facturation(s) supprimée(s)${data.payeesIgnorees > 0 ? ` — ${data.payeesIgnorees} déjà payée(s), conservée(s)` : ""}`
      );
      recharger(setFacturations);
    }
    setChargement(false);
  }

  async function handleManuel(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur("");
    setSucces("");
    setDetailsSucces([]);

    const res = await fetch("/api/facturation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formManuel),
    });

    const data = await res.json();

    if (!res.ok) {
      setErreur(data.erreur || "Une erreur est survenue");
      setChargement(false);
      return;
    }

    setSucces("Facturation ajoutée !");
    setMode("");
    recharger(setFacturations);
    setChargement(false);
  }

  async function handleChangerStatut(id: string, statut: string) {
    await fetch(`/api/facturation/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    recharger(setFacturations);
  }

  async function handleSupprimer(id: string) {
    if (!confirm("Supprimer cette facturation ?")) return;
    await fetch(`/api/facturation/${id}`, { method: "DELETE" });
    recharger(setFacturations);
  }

  function handleExportMois() {
    window.location.href = `/api/export?type=facturation-mois&mois=${filtreMoisExport}&annee=${filtreAnnee}`;
  }

  const facturationsFiltre = facturations.filter(f => {
    if (filtreEntreprise && f.entreprise.nom !== filtreEntreprise) return false;
    if (f.annee !== filtreAnnee) return false;
    return true;
  });

  const totalAnnee = facturationsFiltre.reduce((acc, f) => acc + f.montant, 0);
  const totalPaye = facturationsFiltre.filter(f => f.statut === "Payé").reduce((acc, f) => acc + f.montant, 0);
  const totalEnAttente = facturationsFiltre.filter(f => f.statut === "En attente").reduce((acc, f) => acc + f.montant, 0);

  const grille = MOIS.map((nomMois, i) => {
    const moisNum = i + 1;
    const facts = facturationsFiltre.filter(f => f.mois === moisNum);
    return { mois: moisNum, nomMois, facts };
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">🧾 Facturation</h1>
              <p className="text-gray-500 mt-1">Suivi des factures clients</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setMode(mode === "generer" ? "" : "generer"); setErreur(""); setSucces(""); setDetailsSucces([]); setApercuGeneration(null); }}
                className={`px-5 py-2 rounded-lg font-semibold transition ${mode === "generer" ? "bg-gray-800 text-white" : "bg-black text-white hover:bg-gray-800"}`}
              >
                ⚡ Générer le mois
              </button>
              <button
                onClick={() => { setMode(mode === "manuel" ? "" : "manuel"); setErreur(""); setSucces(""); setDetailsSucces([]); }}
                className={`px-5 py-2 rounded-lg font-semibold transition ${mode === "manuel" ? "bg-orange-600 text-white" : "bg-orange-500 text-white hover:bg-orange-600"}`}
              >
                ➕ Ajouter manuellement
              </button>
            </div>
          </div>

          {succes && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-green-600 font-semibold">{succes}</p>
              {detailsSucces.length > 0 && (
                <ul className="mt-2 text-sm text-gray-600 list-disc pl-5">
                  {detailsSucces.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
            </div>
          )}
          {erreur && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"><p className="text-red-600 font-semibold">{erreur}</p></div>}

          {/* Générer */}
          {mode === "generer" && (
            <div className="bg-white rounded-xl shadow p-8 mb-6">
              <h2 className="text-xl font-bold mb-2">⚡ Générer le mois</h2>
              <p className="text-gray-500 text-sm mb-6">Calcule automatiquement : abonnement RH + abonnement paie + suppléments (salariés, tickets, bulletins) sur la base des salariés actifs du mois.</p>
              <form onSubmit={handleGenerer} className="grid grid-cols-3 gap-6 items-end">
                <div>
                  <label className="block text-sm font-semibold mb-1">Entreprise *</label>
                  <select
                    value={formGenerer.entrepriseId}
                    onChange={e => {
                      const val = e.target.value;
                      setFormGenerer({ ...formGenerer, entrepriseId: val });
                      calculerApercu(val, formGenerer.mois, formGenerer.annee);
                    }}
                    className="w-full border rounded-lg px-4 py-3" required
                  >
                    <option value="">Sélectionner...</option>
                    <option value="tous">⚡ Tous les clients</option>
                    {entreprises.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Mois *</label>
                  <select
                    value={formGenerer.mois}
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setFormGenerer({ ...formGenerer, mois: val });
                      calculerApercu(formGenerer.entrepriseId, val, formGenerer.annee);
                    }}
                    className="w-full border rounded-lg px-4 py-3"
                  >
                    {MOIS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Année *</label>
                  <select
                    value={formGenerer.annee}
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setFormGenerer({ ...formGenerer, annee: val });
                      calculerApercu(formGenerer.entrepriseId, formGenerer.mois, val);
                    }}
                    className="w-full border rounded-lg px-4 py-3"
                  >
                    {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                {apercuGeneration && (
                  <div className={`col-span-3 rounded-xl p-4 ${apercuGeneration.erreur ? "bg-red-50 border border-red-200" : "bg-orange-50 border border-orange-200"}`}>
                    {apercuGeneration.erreur ? (
                      <p className="text-red-600">{apercuGeneration.erreur}</p>
                    ) : (
                      <>
                        <p className="font-bold text-orange-600 mb-2">Aperçu du calcul :</p>
                        {apercuGeneration.details.map((d: string, i: number) => (
                          <p key={i} className="text-sm text-gray-600">• {d}</p>
                        ))}
                        <p className="font-bold text-xl mt-3">Total : {apercuGeneration.montant} €</p>
                      </>
                    )}
                  </div>
                )}

                {formGenerer.entrepriseId === "tous" && (
                  <div className="col-span-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-blue-600 font-semibold">⚡ Génération pour tous les clients ({entreprises.length} entreprises) — celles sans abonnement seront ignorées.</p>
                  </div>
                )}

                <div className="col-span-3 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={handleSupprimerGeneration}
                    disabled={chargement}
                    className="bg-white border border-red-300 text-red-600 px-5 py-3 rounded-lg font-semibold hover:bg-red-50 transition disabled:opacity-50"
                  >
                    🗑️ Supprimer la génération du mois
                  </button>
                  <button type="submit" disabled={chargement} className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition">
                    {chargement ? "Génération en cours..." : "⚡ Générer"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Manuel */}
          {mode === "manuel" && (
            <div className="bg-white rounded-xl shadow p-8 mb-6">
              <h2 className="text-xl font-bold mb-6">➕ Facturation manuelle</h2>
              <form onSubmit={handleManuel} className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-1">Entreprise *</label>
                  <select value={formManuel.entrepriseId} onChange={e => setFormManuel({ ...formManuel, entrepriseId: e.target.value })} className="w-full border rounded-lg px-4 py-3" required>
                    <option value="">Sélectionner...</option>
                    {entreprises.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Montant (€) *</label>
                  <input type="number" value={formManuel.montant} onChange={e => setFormManuel({ ...formManuel, montant: e.target.value })} className="w-full border rounded-lg px-4 py-3" placeholder="Ex: 299" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Mois *</label>
                  <select value={formManuel.mois} onChange={e => setFormManuel({ ...formManuel, mois: parseInt(e.target.value) })} className="w-full border rounded-lg px-4 py-3">
                    {MOIS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Année *</label>
                  <select value={formManuel.annee} onChange={e => setFormManuel({ ...formManuel, annee: parseInt(e.target.value) })} className="w-full border rounded-lg px-4 py-3">
                    {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Date limite de paiement</label>
                  <input type="date" value={formManuel.dateLimitePaie} onChange={e => setFormManuel({ ...formManuel, dateLimitePaie: e.target.value })} className="w-full border rounded-lg px-4 py-3" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Commentaire</label>
                  <input type="text" value={formManuel.commentaire} onChange={e => setFormManuel({ ...formManuel, commentaire: e.target.value })} className="w-full border rounded-lg px-4 py-3" placeholder="Ex: Prestation supplémentaire" />
                </div>
                <div className="col-span-2 flex justify-end">
                  <button type="submit" disabled={chargement} className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition">
                    {chargement ? "..." : "✅ Enregistrer"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filtres + Export */}
          <div className="bg-white rounded-xl shadow p-6 mb-6 flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-1">Entreprise</label>
              <select value={filtreEntreprise} onChange={e => setFiltreEntreprise(e.target.value)} className="w-full border rounded-lg px-4 py-3">
                <option value="">Toutes</option>
                {entreprises.map(e => <option key={e.id} value={e.nom}>{e.nom}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-1">Année</label>
              <select value={filtreAnnee} onChange={e => setFiltreAnnee(parseInt(e.target.value))} className="w-full border rounded-lg px-4 py-3">
                {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-1">Exporter le mois</label>
              <select value={filtreMoisExport} onChange={e => setFiltreMoisExport(parseInt(e.target.value))} className="w-full border rounded-lg px-4 py-3">
                {MOIS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <button onClick={handleExportMois} className="bg-green-500 text-white px-5 py-3 rounded-lg font-semibold hover:bg-green-600 transition whitespace-nowrap">
              📥 Exporter Excel
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Total facturé {filtreAnnee}</p>
              <p className="text-3xl font-bold">{totalAnnee.toLocaleString("fr-FR")} €</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Total payé</p>
              <p className="text-3xl font-bold text-green-500">{totalPaye.toLocaleString("fr-FR")} €</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-2">En attente</p>
              <p className="text-3xl font-bold text-orange-500">{totalEnAttente.toLocaleString("fr-FR")} €</p>
            </div>
          </div>

          {/* Grille 12 mois */}
          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h2 className="text-xl font-bold mb-6">📅 Vue annuelle {filtreAnnee}</h2>
            <div className="grid grid-cols-4 gap-4">
              {grille.map(({ mois, nomMois, facts }) => (
                <div key={mois} className={`border rounded-xl p-4 ${
                  facts.length > 0
                    ? facts.every(f => f.statut === "Payé") ? "border-green-300 bg-green-50"
                    : facts.some(f => f.statut === "En retard") ? "border-red-300 bg-red-50"
                    : "border-orange-300 bg-orange-50"
                    : "border-gray-200 bg-gray-50"
                }`}>
                  <p className="font-semibold text-sm mb-1">{nomMois}</p>
                  {facts.length > 0 ? (
                    <>
                      <p className="text-xl font-bold">{facts.reduce((a, f) => a + f.montant, 0).toLocaleString("fr-FR")} €</p>
                      <p className="text-xs text-gray-500 mt-1">{facts.length} facture(s)</p>
                    </>
                  ) : (
                    <p className="text-gray-400 text-sm mt-2">—</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tableau */}
          <div className="bg-white rounded-xl shadow p-8">
            <h2 className="text-xl font-bold mb-6">Détail des facturations</h2>
            {facturationsFiltre.length === 0 ? (
              <p className="text-gray-500">Aucune facturation pour cette période.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Entreprise</th>
                    <th className="pb-3">Mois</th>
                    <th className="pb-3">Montant</th>
                    <th className="pb-3">Échéance</th>
                    <th className="pb-3">Détail</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {facturationsFiltre.map(f => {
                    const lignes = lignesCommentaire(f.commentaire);
                    return (
                      <tr key={f.id} className="border-b hover:bg-gray-50 transition align-top">
                        <td className="py-3 font-semibold">{f.entreprise.nom}</td>
                        <td className="py-3">{MOIS[f.mois - 1]} {f.annee}</td>
                        <td className="py-3 font-bold">{f.montant.toLocaleString("fr-FR")} €</td>
                        <td className="py-3 text-sm text-gray-500">{f.dateLimitePaie ? new Date(f.dateLimitePaie).toLocaleDateString("fr-FR") : "—"}</td>
                        <td className="py-3 text-xs text-gray-600">
                          {lignes.length === 0 ? (
                            "—"
                          ) : (
                            <ul className="flex flex-col gap-1">
                              {lignes.map((l, i) => (
                                <li key={i} className="flex gap-1">
                                  <span className="text-orange-500">•</span>
                                  <span>{l}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="py-3">
                          <select
                            value={f.statut}
                            onChange={e => handleChangerStatut(f.id, e.target.value)}
                            className={`px-3 py-1 rounded-lg text-sm font-semibold border-0 cursor-pointer ${
                              f.statut === "Payé" ? "bg-green-100 text-green-600" :
                              f.statut === "En retard" ? "bg-red-100 text-red-600" :
                              "bg-orange-100 text-orange-600"
                            }`}
                          >
                            <option value="En attente">En attente</option>
                            <option value="Payé">Payé</option>
                            <option value="En retard">En retard</option>
                          </select>
                        </td>
                        <td className="py-3">
                          <button onClick={() => handleSupprimer(f.id)} className="text-red-500 hover:text-red-700 text-sm font-semibold">
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}