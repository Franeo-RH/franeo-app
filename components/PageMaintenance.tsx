import Image from "next/image";
import { formatDate, type EtatMaintenance } from "@/lib/maintenance";

/** Écran affiché pendant une maintenance (tout le monde sauf l'admin) */
export default function PageMaintenance({ etat }: { etat: EtatMaintenance }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow p-10 max-w-lg text-center flex flex-col items-center gap-3">
        <Image src="/FRANEO-Logo-Orange.png" alt="Franeo RH" width={49} height={60} />
        <p className="text-5xl">🛠️</p>
        <h1 className="text-2xl font-bold">Mise à jour en cours</h1>
        <p className="text-gray-600" style={{ whiteSpace: "pre-line" }}>{etat.message || "Franeo est en cours de mise à jour pour vous apporter de nouvelles fonctionnalités. Merci de revenir dans quelques instants."}</p>
        {etat.fin && <p className="text-sm text-gray-500">Retour prévu : {formatDate(etat.fin)}</p>}
        <p className="text-xs text-gray-400">Vos données sont en sécurité. Une question urgente : contact@franeo-rh.com</p>
      </div>
    </div>
  );
}

/** Bandeau d'annonce d'une maintenance programmée */
export function BandeauMaintenance({ etat }: { etat: EtatMaintenance }) {
  if (!etat.annonce || !etat.debut) return null;
  return (
    <div className="fr-pas-imprimer" style={{ background: "#fef3c7", color: "#92400e", borderBottom: "1px solid #fde68a", padding: "8px 16px", fontSize: 14, fontWeight: 600, textAlign: "center" }}>
      🛠️ Maintenance prévue le {formatDate(etat.debut)}{etat.fin ? ` jusqu'au ${formatDate(etat.fin)}` : ""} : l&apos;application sera momentanément indisponible.{etat.message ? ` ${etat.message}` : ""}
    </div>
  );
}
