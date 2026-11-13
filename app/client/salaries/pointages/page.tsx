import CadreClient from "@/components/CadreClient";
import TableauPresences from "@/components/TableauPresences";
import JournalPointages from "@/components/JournalPointages";

export default function PagePointages() {
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">📍 Badge & présences</h1>
        <p className="text-gray-500 mt-1">Pointages des salariés depuis leur espace, avec l&apos;adresse où chaque pointage a été fait (position prise uniquement au moment du clic). Les heures remplissent automatiquement les relevés mensuels.</p>
      </div>
      <h2 className="text-xl font-bold">Présences par jour</h2>
      <TableauPresences api="/api/pointages" exportCsv />
      <h2 className="text-xl font-bold mt-4">🕓 Journal des pointages</h2>
      <JournalPointages />
    </CadreClient>
  );
}
