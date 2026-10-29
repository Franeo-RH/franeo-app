import DemandeAcces from "@/components/DemandeAcces";

export default function BandeauDemo() {
  return (
    <div className="bg-blue-600 text-white text-sm font-medium px-4 py-2" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap", textAlign: "center", position: "sticky", top: 0, zIndex: 60 }}>
      <span>🧪 Démo — données fictives, réinitialisées chaque nuit. Ça vous plaît ?</span>
      <DemandeAcces />
    </div>
  );
}
