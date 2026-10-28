import { connection } from "next/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";
import { LIBELLES_ABSENCE } from "@/lib/espace-salarie";
import { communicationsNonLues } from "@/lib/communications";
import BandeauCommunications from "@/components/BandeauCommunications";
import ReleveHeuresSalarie from "@/components/ReleveHeuresSalarie";
import { libelleRappel, typeDe } from "@/lib/rappels";
import { BoutonAnnulerAbsence, BoutonDeconnexionSalarie, FormulaireAbsenceSalarie } from "@/components/EspaceSalarieActions";

export const dynamic = "force-dynamic";

const MESSAGES_REFUS: Record<string, string> = {
  suspendu: "L'accès de votre entreprise à Franeo est actuellement suspendu.",
  "option-inactive": "L'espace salarié n'est pas activé pour votre entreprise.",
  "compte-coupe": "Votre accès à l'espace salarié a été désactivé par votre employeur.",
  sorti: "Votre contrat est terminé : votre espace salarié n'est plus accessible.",
};

const STATUT: Record<string, { fond: string; texte: string }> = {
  "En attente": { fond: "#fff7ed", texte: "#c2410c" },
  "Validé": { fond: "#dcfce7", texte: "#15803d" },
  "Refusé": { fond: "#fee2e2", texte: "#b91c1c" },
};

const fr = (d: Date) => new Date(d).toLocaleDateString("fr-FR");

export default async function EspaceSalarie() {
  await connection();
  const s = await getSessionSalarie();
  if (!s.ok && s.raison === "non-connecte") redirect("/login");

  const carte: React.CSSProperties = { background: "#ffffff", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: "18px" };

  if (!s.ok) {
    return (
      <div style={{ minHeight: "100vh", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <div style={{ ...carte, maxWidth: "420px", textAlign: "center" }}>
          <p style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>Espace salarié indisponible</p>
          <p style={{ color: "#4b5563", margin: "0 0 16px" }}>{MESSAGES_REFUS[s.raison] || "Accès refusé."} Contactez votre employeur pour plus d&apos;informations.</p>
          <form action="/api/suspendu/deconnexion" method="post">
            <button type="submit" style={{ background: "#111827", color: "#ffffff", border: "none", borderRadius: "10px", padding: "12px 20px", fontWeight: 600 }}>Se déconnecter</button>
          </form>
        </div>
      </div>
    );
  }

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const [absences, rappels, communications] = await Promise.all([
    prisma.absence.findMany({ where: { salarieId: s.salarie.id }, orderBy: { dateDebut: "desc" }, take: 50 }),
    prisma.rappelSalarie.findMany({ where: { salarieId: s.salarie.id, traite: false, dateEcheance: { gte: aujourdhui } }, orderBy: { dateEcheance: "asc" }, take: 10 }),
    communicationsNonLues({ id: s.utilisateur.id, role: "SALARIE", entrepriseId: s.utilisateur.entrepriseId }),
  ]);
  const aVenir = absences.filter((a) => new Date(a.dateFin) >= aujourdhui);
  const passees = absences.filter((a) => new Date(a.dateFin) < aujourdhui).slice(0, 10);

  const ligneAbsence = (a: (typeof absences)[number], annulable: boolean) => {
    const st = STATUT[a.statut] || { fond: "#f3f4f6", texte: "#374151" };
    return (
      <li key={a.id} style={{ borderTop: "1px solid #f3f4f6", padding: "12px 0", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "15px" }}>{LIBELLES_ABSENCE[a.type] || a.type}</p>
          <p style={{ margin: "2px 0 0", fontSize: "14px", color: "#4b5563" }}>{fr(a.dateDebut)}{fr(a.dateDebut) !== fr(a.dateFin) ? ` → ${fr(a.dateFin)}` : ""}</p>
          {a.statut === "Refusé" && a.motifRefus && <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#b91c1c" }}>Motif : {a.motifRefus}</p>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
          <span style={{ background: st.fond, color: st.texte, borderRadius: "999px", padding: "3px 10px", fontSize: "12px", fontWeight: 700 }}>{a.statut}</span>
          {annulable && a.statut === "En attente" && a.declareeParSalarie && <BoutonAnnulerAbsence id={a.id} />}
        </div>
      </li>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "Arial, Helvetica, sans-serif", color: "#111827" }}>
      <header style={{ background: "#000000", color: "#ffffff", padding: "calc(12px + env(safe-area-inset-top)) 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Image src="/FRANEO-Logo-Orange.png" alt="Franeo" width={70} height={24} style={{ objectFit: "contain" }} />
          <span style={{ fontSize: "14px", color: "#d1d5db" }}>Espace salarié</span>
        </div>
        <BoutonDeconnexionSalarie />
      </header>

      <main style={{ maxWidth: "640px", margin: "0 auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={carte}>
          <p style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>Bonjour {s.salarie.prenom} 👋</p>
          <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: "14px" }}>{s.salarie.poste} · {s.utilisateur.entreprise?.nom}</p>
        </div>

        <BandeauCommunications communications={communications} />

        <section style={carte} aria-labelledby="t-demande">
          <h1 id="t-demande" style={{ margin: "0 0 12px", fontSize: "18px" }}>📅 Demander une absence</h1>
          <FormulaireAbsenceSalarie />
        </section>

        <section style={carte} aria-labelledby="t-heures">
          <h2 id="t-heures" style={{ margin: "0 0 12px", fontSize: "18px" }}>⏱️ Mon relevé d&apos;heures</h2>
          <ReleveHeuresSalarie />
        </section>

        <section style={carte} aria-labelledby="t-absences">
          <h2 id="t-absences" style={{ margin: "0 0 4px", fontSize: "18px" }}>Mes absences à venir</h2>
          {aVenir.length === 0 ? (
            <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: "14px" }}>Aucune absence prévue.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{aVenir.map((a) => ligneAbsence(a, true))}</ul>
          )}
        </section>

        {(rappels.length > 0 || s.salarie.dateFin) && (
          <section style={carte} aria-labelledby="t-echeances">
            <h2 id="t-echeances" style={{ margin: "0 0 8px", fontSize: "18px" }}>⏰ Mes échéances</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {rappels.map((r) => (
                <li key={r.id} style={{ borderTop: "1px solid #f3f4f6", padding: "10px 0", display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "14px" }}>
                  <span>{typeDe(r.type).icone} {libelleRappel(r)}</span>
                  <strong style={{ whiteSpace: "nowrap" }}>{fr(r.dateEcheance)}</strong>
                </li>
              ))}
              {s.salarie.dateFin && (
                <li style={{ borderTop: "1px solid #f3f4f6", padding: "10px 0", display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "14px" }}>
                  <span>⏳ Fin de contrat</span>
                  <strong style={{ whiteSpace: "nowrap" }}>{fr(s.salarie.dateFin)}</strong>
                </li>
              )}
            </ul>
          </section>
        )}

        {passees.length > 0 && (
          <section style={carte} aria-labelledby="t-historique">
            <h2 id="t-historique" style={{ margin: "0 0 4px", fontSize: "18px" }}>Historique</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{passees.map((a) => ligneAbsence(a, false))}</ul>
          </section>
        )}

        <p style={{ textAlign: "center", fontSize: "12px", color: "#6b7280", margin: "4px 0 16px" }}>
          Vos demandes sont validées par votre employeur. Pour toute question sur votre paie, adressez-vous à lui.
        </p>
      </main>
    </div>
  );
}
