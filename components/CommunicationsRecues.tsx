import BandeauCommunications from "@/components/BandeauCommunications";

type Com = { id: string; titre: string; contenu: string; importante: boolean; createdAt: Date; luAt: Date | null };

/** Bloc « Communications » de l'onglet Actualité : non lues à valider, puis l'historique */
export default function CommunicationsRecues({ communications }: { communications: Com[] }) {
  const nonLues = communications.filter((c) => !c.luAt);
  const lues = communications.filter((c) => c.luAt);
  return (
    <section className="bg-white rounded-xl shadow p-6 mb-8" aria-labelledby="t-coms">
      <h2 id="t-coms" className="text-xl font-bold mb-1">📢 Communications</h2>
      <p className="text-gray-500 text-sm mb-4">Les informations publiées par FRANEO RH pour votre entreprise.</p>
      {communications.length === 0 && <p className="text-gray-500 text-sm">Aucune communication pour le moment.</p>}
      <BandeauCommunications communications={nonLues} />
      {lues.length > 0 && (
        <ul className="flex flex-col gap-3 mt-4">
          {lues.map((c) => (
            <li key={c.id} className="border rounded-xl p-4">
              <p className="text-xs text-gray-500">
                {new Date(c.createdAt).toLocaleDateString("fr-FR")} · ✅ lu le {new Date(c.luAt!).toLocaleDateString("fr-FR")}
              </p>
              <p className="font-bold mt-1">{c.importante ? "🔴 " : ""}{c.titre}</p>
              <p className="text-sm text-gray-700 mt-1" style={{ whiteSpace: "pre-line" }}>{c.contenu}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
