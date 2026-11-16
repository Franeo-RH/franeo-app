import CadreClient from "@/components/CadreClient";
import AccidentsTravail from "@/components/AccidentsTravail";

export default function PageAccidents() {
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">🩹 Accidents du travail</h1>
        <p className="text-gray-500 mt-1">Les accidents déclarés par vos salariés depuis leur espace, ou par vous. Pour chacun : les informations de la déclaration (DAT, sous 48 heures), vos éventuelles réserves, les réponses au questionnaire de la CPAM et la décision.</p>
      </div>
      <AccidentsTravail />
    </CadreClient>
  );
}
