import { connection } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionCabinet, portefeuille, tarifCabinet, euros, TEXTE_CONSEIL_CABINET } from "@/lib/cabinet";
import PortefeuilleCabinet from "@/components/cabinet/PortefeuilleCabinet";

export const dynamic = "force-dynamic";

export default async function PagePortefeuille() {
  await connection();
  const session = await getSessionCabinet();
  if (!session) redirect("/login");
  const mode = session.modeCabinet;
  const [clients, cabinet] = await Promise.all([
    portefeuille(mode),
    prisma.cabinet.findUnique({ where: { id: mode.cabinetId }, select: { tarifForfait: true, tarifParClient: true, tarifNote: true, _count: { select: { entreprises: { where: { actif: true } } } } } }),
  ]);
  const somme = (k: "salaries" | "absences" | "variables" | "echeances" | "demandes") => clients.reduce((t, c) => t + c[k], 0);
  const chiffres = [
    { n: clients.length, l: "dossiers clients", icone: "🗂️" },
    { n: somme("salaries"), l: "salariés suivis", icone: "👥" },
    { n: somme("absences") + somme("demandes"), l: "validations en attente", icone: "✅", alerte: somme("absences") + somme("demandes") > 0 },
    { n: somme("variables"), l: "variables de paie à intégrer", icone: "💰", alerte: somme("variables") > 0 },
    { n: somme("echeances"), l: "échéances sous 30 jours", icone: "⏰", alerte: somme("echeances") > 0 },
  ];
  const tarif = cabinet ? tarifCabinet(cabinet, cabinet._count.entreprises) : null;
  const mois = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-5">
      <div className="fr-cab-hero">
        <div>
          <p className="fr-cab-petit">Portefeuille · {mois}</p>
          <h1 className="fr-cab-titre">Bonjour {session.prenom} 👋</h1>
          <p className="text-gray-600">Un seul accès pour tous vos clients : ouvrez un dossier pour saisir, valider ou déposer des documents comme le dirigeant.</p>
        </div>
      </div>

      <div className="fr-cab-chiffres">
        {chiffres.map((c) => (
          <div key={c.l} className={`fr-verre fr-cab-chiffre${c.alerte ? " fr-alerte" : ""}`}>
            <span className="fr-cab-chiffre-icone" aria-hidden="true">{c.icone}</span>
            <strong>{c.n}</strong>
            <span>{c.l}</span>
          </div>
        ))}
      </div>

      <PortefeuilleCabinet clients={clients} />

      <p className="text-sm text-gray-500 px-1">💬 {TEXTE_CONSEIL_CABINET} Ouvrez le dossier du client, puis Tickets › Conseil RH ponctuel.</p>

      {mode.gerant && tarif?.defini && (
        <div className="fr-verre p-6 flex flex-col gap-2">
          <h2 className="text-lg font-bold">💶 Votre tarif cabinet</h2>
          <div className="flex gap-6 flex-wrap text-sm">
            {tarif.forfait > 0 && <span>Forfait : <strong>{euros(tarif.forfait)}</strong> / mois</span>}
            {tarif.parClient > 0 && <span>Par dossier client : <strong>{euros(tarif.parClient)}</strong> / mois</span>}
            {(tarif.forfait > 0 || tarif.parClient > 0) && <span>Ce mois-ci : <strong>{euros(tarif.total)}</strong> ({cabinet!._count.entreprises} dossier{cabinet!._count.entreprises > 1 ? "s" : ""})</span>}
          </div>
          {cabinet?.tarifNote && <p className="text-sm text-gray-600" style={{ whiteSpace: "pre-line" }}>{cabinet.tarifNote}</p>}
          <p className="text-xs text-gray-400">Tarif sur mesure défini avec FRANEO RH · TVA non applicable, art. 293 B du CGI.</p>
        </div>
      )}
    </div>
  );
}
