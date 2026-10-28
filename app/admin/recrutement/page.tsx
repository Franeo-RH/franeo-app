import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonSupprimerRecrutement from "@/components/BoutonSupprimerRecrutement";
import ActionsRecrutement from "@/components/ActionsRecrutement";
import { categorieRecrutement, ETAPES_RECRUTEMENT, LANCEMENT_RECRUTEMENT } from "@/lib/recrutement";
import { BoutonExportComplet, BoutonModifierAdmin } from "@/components/OutilsAdmin";

export const dynamic = "force-dynamic";

const fr = (d: Date | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export default async function AdminRecrutement({ searchParams }: { searchParams: Promise<{ onglet?: string; entreprise?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const { onglet = "demande", entreprise = "" } = await searchParams;
  const etape = ETAPES_RECRUTEMENT.find((e) => e.cle === onglet) ?? ETAPES_RECRUTEMENT[0];

  const [tous, entreprises] = await Promise.all([
    prisma.demandeRecrutement.findMany({
      where: { entreprise: { demo: false }, ...(entreprise ? { entrepriseId: entreprise } : {}) },
      include: { entreprise: { select: { nom: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.entreprise.findMany({ where: { demo: false }, select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
  ]);
  const recrutements = tous.filter((r) => (etape.statuts as readonly string[]).includes(r.statut) || (etape.cle === "en-cours" && !ETAPES_RECRUTEMENT.some((e) => (e.statuts as readonly string[]).includes(r.statut))));
  const compte = (cle: string) => {
    const e = ETAPES_RECRUTEMENT.find((x) => x.cle === cle)!;
    return tous.filter((r) => (e.statuts as readonly string[]).includes(r.statut)).length;
  };
  const lien = (o: string) => `/admin/recrutement?onglet=${o}${entreprise ? `&entreprise=${entreprise}` : ""}`;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">🎯 Recrutement</h1>
              <div className="flex gap-2 flex-wrap mt-3"><BoutonExportComplet jeu="recrutements" /></div>
              <p className="text-gray-500 mt-1">Lancement {LANCEMENT_RECRUTEMENT} € à la demande, puis primes au succès déclenchées ici. Tout est ajouté automatiquement à la facture du mois.</p>
            </div>
            <form method="get" className="flex gap-2 items-center">
              <input type="hidden" name="onglet" value={etape.cle} />
              <select name="entreprise" defaultValue={entreprise} className="border rounded-lg px-3 py-2" aria-label="Entreprise">
                <option value="">Toutes les entreprises</option>
                {entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
              <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold">Filtrer</button>
            </form>
          </div>

          <div role="tablist" className="flex gap-2 mb-6 flex-wrap">
            {ETAPES_RECRUTEMENT.map((e) => (
              <Link key={e.cle} href={lien(e.cle)} role="tab" aria-selected={etape.cle === e.cle}
                className={`px-5 py-2 rounded-lg font-semibold ${etape.cle === e.cle ? "bg-orange-500 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>
                {e.label} ({compte(e.cle)})
              </Link>
            ))}
          </div>

          {recrutements.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Aucun recrutement dans cet onglet.</div>
          ) : (
            <div className="flex flex-col gap-5">
              {recrutements.map((r) => {
                const cat = categorieRecrutement(r.categorie);
                const factures = [
                  r.facturationAuto ? LANCEMENT_RECRUTEMENT : 0,
                  r.signatureAt ? cat.signature : 0,
                  r.finEssaiAt ? cat.finEssai : 0,
                ].reduce((a, b) => a + b, 0);
                return (
                  <div key={r.id} className="bg-white rounded-xl shadow p-6">
                    <div className="flex justify-between items-start gap-4 flex-wrap">
                      <div>
                        <h2 className="text-xl font-bold">{r.poste}</h2>
                        <p className="text-gray-500">{r.entreprise.nom} — {r.typeContrat} · <strong>{cat.label}</strong></p>
                        <p className="text-gray-400 text-sm mt-1">Reçue le {fr(r.createdAt)} · statut : {r.statut}{r.candidat ? ` · candidat : ${r.candidat}` : ""}</p>
                      </div>
                      <div className="flex gap-1 items-center"><BoutonModifierAdmin modele="demandeRecrutement" id={r.id} valeurs={{ poste: r.poste, statut: r.statut, candidat: r.candidat, categorie: r.categorie }} /><BoutonSupprimerRecrutement id={r.id} poste={r.poste} /></div>
                    </div>

                    <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                      {[
                        { t: "Lancement", m: LANCEMENT_RECRUTEMENT, d: r.facturationAuto ? r.createdAt : null, ok: true },
                        { t: "Signature du contrat", m: cat.signature, d: r.signatureAt, ok: !!r.signatureAt },
                        { t: "Fin de période d'essai", m: cat.finEssai, d: r.finEssaiAt, ok: !!r.finEssaiAt },
                      ].map((x) => (
                        <div key={x.t} style={{ borderRadius: "12px", padding: "12px", background: x.ok ? "#dcfce7" : "#f3f4f6" }}>
                          <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>{x.t}</p>
                          <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800 }}>{x.m} €</p>
                          <p style={{ margin: 0, fontSize: "12px", color: x.ok ? "#15803d" : "#6b7280" }}>{x.ok ? (x.d ? `facturé · ${fr(x.d)}` : "facturé à part") : "à déclencher"}</p>
                        </div>
                      ))}
                      <div style={{ borderRadius: "12px", padding: "12px", background: "#fff7ed" }}>
                        <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#c2410c" }}>Déjà facturé</p>
                        <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800 }}>{factures} €</p>
                        <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>sur {LANCEMENT_RECRUTEMENT + cat.signature + cat.finEssai} €</p>
                      </div>
                    </div>

                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-semibold text-orange-600">Voir la demande</summary>
                      <div className="grid gap-4 mt-3 text-sm" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                        <p><strong>💰 Rémunération :</strong> {r.salaireMini && r.salaireMaxi ? `${r.salaireMini} — ${r.salaireMaxi} €/mois` : "non précisée"}{r.primes ? ` · ${r.primes}` : ""}</p>
                        <p><strong>📅 Démarrage :</strong> {r.dateDebut ? fr(r.dateDebut) : "dès que possible"}</p>
                        <p><strong>🎓 Expérience / formation :</strong> {r.experience || "—"} · {r.formation || "—"}</p>
                        <p className="whitespace-pre-line"><strong>📋 Missions :</strong> {r.missions}</p>
                        <p className="whitespace-pre-line"><strong>👤 Profil recherché :</strong> {r.profil}</p>
                        {r.commentaire && <p className="whitespace-pre-line"><strong>💬 Commentaire :</strong> {r.commentaire}</p>}
                      </div>
                    </details>

                    <div className="mt-4">
                      <ActionsRecrutement
                        id={r.id}
                        statut={r.statut}
                        signatureAt={r.signatureAt ? r.signatureAt.toISOString() : null}
                        finEssaiAt={r.finEssaiAt ? r.finEssaiAt.toISOString() : null}
                        primeSignature={cat.signature}
                        primeFinEssai={cat.finEssai}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
