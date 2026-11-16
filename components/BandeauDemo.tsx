import DemandeAcces from "@/components/DemandeAcces";
import DemoLectureSeule from "@/components/DemoLectureSeule";

export default function BandeauDemo() {
  return (
    <div className="bg-blue-600 text-white text-sm font-medium px-4 py-2" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap", textAlign: "center", position: "sticky", top: 0, zIndex: 60 }}>
      <span>🧪 Démo en consultation — données fictives : visitez toutes les pages librement. Ça vous plaît ?</span>
      <DemandeAcces />
      <DemoLectureSeule />
    </div>
  );
}
