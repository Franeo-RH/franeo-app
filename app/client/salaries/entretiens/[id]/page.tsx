import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { TRAME_ENTRETIEN, TYPES_ENTRETIEN } from "@/lib/entretiens";
import BoutonImprimer from "@/components/BoutonImprimer";

/** Compte rendu d'entretien prêt à imprimer (ou enregistrer en PDF depuis le navigateur) */
export default async function ImprimerEntretien({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) redirect("/login");
  const e = await prisma.entretien.findFirst({
    where: { id: (await params).id, entrepriseId: session.entrepriseId },
    include: { salarie: { select: { prenom: true, nom: true, poste: true, dateDebut: true } } },
  });
  if (!e) notFound();
  const cr = (e.compteRendu ?? {}) as Record<string, string>;
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 32, fontFamily: "Arial, sans-serif", color: "#111827", background: "#fff" }}>
      <div className="fr-pas-imprimer" style={{ marginBottom: 16 }}><BoutonImprimer /></div>
      <h1 style={{ fontSize: 22, margin: 0 }}>{TYPES_ENTRETIEN[e.type]?.label ?? "Entretien"}</h1>
      <p style={{ color: "#4b5563" }}>{session.entreprise?.nom} · {new Date(e.date).toLocaleDateString("fr-FR")}{e.responsable ? ` · conduit par ${e.responsable}` : ""}</p>
      <table style={{ width: "100%", borderCollapse: "collapse", margin: "16px 0", fontSize: 14 }}>
        <tbody>
          <tr><td style={{ padding: 6, border: "1px solid #e5e7eb", width: "35%", fontWeight: 700 }}>Salarié</td><td style={{ padding: 6, border: "1px solid #e5e7eb" }}>{e.salarie.prenom} {e.salarie.nom}</td></tr>
          <tr><td style={{ padding: 6, border: "1px solid #e5e7eb", fontWeight: 700 }}>Poste</td><td style={{ padding: 6, border: "1px solid #e5e7eb" }}>{e.salarie.poste}</td></tr>
          <tr><td style={{ padding: 6, border: "1px solid #e5e7eb", fontWeight: 700 }}>Date d&apos;entrée</td><td style={{ padding: 6, border: "1px solid #e5e7eb" }}>{e.salarie.dateDebut ? new Date(e.salarie.dateDebut).toLocaleDateString("fr-FR") : "—"}</td></tr>
        </tbody>
      </table>
      {TRAME_ENTRETIEN.filter((t) => (!t.types || t.types.includes(e.type)) && cr[t.cle]?.trim()).map((t) => (
        <div key={t.cle} style={{ marginBottom: 14, breakInside: "avoid" }}>
          <h2 style={{ fontSize: 15, margin: "0 0 4px", color: "#c2410c" }}>{t.label}</h2>
          <p style={{ whiteSpace: "pre-line", margin: 0, fontSize: 14 }}>{cr[t.cle]}</p>
        </div>
      ))}
      <div style={{ display: "flex", gap: 24, marginTop: 40, fontSize: 14 }}>
        <div style={{ flex: 1, borderTop: "1px solid #9ca3af", paddingTop: 6 }}>Signature du salarié</div>
        <div style={{ flex: 1, borderTop: "1px solid #9ca3af", paddingTop: 6 }}>Signature du responsable</div>
      </div>
      <p style={{ fontSize: 11, color: "#6b7280", marginTop: 24 }}>Une copie de ce compte rendu est remise au salarié (art. L6315-1 du Code du travail pour l&apos;entretien professionnel).</p>
    </div>
  );
}
