"use client";

import Image from "next/image";
import { useState } from "react";
import { appFraneo } from "@/lib/apps-franeo";

/** Après une demande de recrutement : lien vers Franeo Jobs et ouverture rapide d'une discussion pour obtenir les accès */
export default function BandeauFraneoJobs({ poste }: { poste?: string }) {
  const jobs = appFraneo("JOBS")!;
  const [etat, setEtat] = useState<"" | "envoi" | "ok" | "erreur">("");
  async function ouvrir() {
    setEtat("envoi");
    const res = await fetch("/api/questions-rh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sujet: "Accès à Franeo Jobs", contenu: `Bonjour, je souhaite obtenir mes accès à Franeo Jobs pour suivre ${poste ? `le recrutement « ${poste} »` : "mes recrutements"} (candidatures et CV). Merci !` }),
    });
    setEtat(res.ok ? "ok" : "erreur");
  }
  return (
    <div className="rounded-xl p-5 flex gap-4 items-center flex-wrap" style={{ background: jobs.fond, border: `2px solid ${jobs.couleur}` }}>
      <Image src={jobs.logo} alt="" width={48} height={48} style={{ objectFit: "contain" }} />
      <div className="flex-1" style={{ minWidth: 220 }}>
        <p className="font-bold" style={{ color: jobs.couleur }}>✅ Demande de recrutement envoyée !</p>
        <p className="text-sm text-gray-700">Suivez les candidatures et les CV reçus dans Franeo Jobs.</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <a href={jobs.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg font-semibold text-white" style={{ background: jobs.couleur }}>Ouvrir Franeo Jobs ↗</a>
        {etat === "ok"
          ? <a href="/client/tickets/questions" className="px-4 py-2 rounded-lg font-semibold border" style={{ borderColor: jobs.couleur, color: jobs.couleur }}>✅ Discussion ouverte — voir</a>
          : <button type="button" disabled={etat === "envoi"} onClick={ouvrir} className="px-4 py-2 rounded-lg font-semibold border bg-white" style={{ borderColor: jobs.couleur, color: jobs.couleur }}>{etat === "envoi" ? "…" : "💬 Obtenir mes accès rapidement"}</button>}
      </div>
      {etat === "erreur" && <p className="text-sm text-red-600 w-full">Impossible d&apos;ouvrir la discussion. Réessayez depuis « Nouvelle demande ponctuelle ».</p>}
    </div>
  );
}
