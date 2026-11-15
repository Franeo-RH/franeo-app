"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ResultatActivation, { type Activation } from "@/components/ResultatActivation";

export default function FormulaireModifierAcces({
  userId,
  prenomActuel,
  emailActuel,
}: {
  userId: string;
  prenomActuel: string;
  emailActuel: string;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [onglet, setOnglet] = useState<"infos" | "motdepasse">("infos");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  const [formInfos, setFormInfos] = useState({
    prenom: prenomActuel,
    email: emailActuel,
  });

  const [activation, setActivation] = useState<Activation | null>(null);

  async function handleSauvegarderInfos(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur("");
    setSucces("");

    const res = await fetch(`/api/utilisateurs/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formInfos),
    });

    const data = await res.json();

    if (!res.ok) {
      setErreur(data.erreur || "Une erreur est survenue");
    } else {
      setSucces("Informations mises à jour !");
      router.refresh();
    }
    setChargement(false);
  }

  // L'admin ne choisit jamais le mot de passe : le client reçoit un lien pour le faire lui-même
  async function handleEnvoyerLien() {
    setChargement(true);
    setErreur("");
    setActivation(null);
    const res = await fetch(`/api/utilisateurs/${userId}/activation`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setErreur(data.erreur || "Une erreur est survenue");
    else setActivation({ email: data.email, mailEnvoye: !!data.mailEnvoye, lien: data.lien ?? null });
    setChargement(false);
  }

  return (
    <div>
      <button
        onClick={() => { setOuvert(!ouvert); setErreur(""); setSucces(""); setActivation(null); }}
        className="bg-orange-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-orange-600 transition"
      >
        ✏️ Modifier
      </button>

      {ouvert && (
        <div className="mt-4 border rounded-xl p-6 bg-gray-50">
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setOnglet("infos")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${onglet === "infos" ? "bg-orange-500 text-white" : "bg-white border"}`}
            >
              Informations
            </button>
            <button
              onClick={() => setOnglet("motdepasse")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${onglet === "motdepasse" ? "bg-orange-500 text-white" : "bg-white border"}`}
            >
              Mot de passe
            </button>
          </div>

          {onglet === "infos" && (
            <form onSubmit={handleSauvegarderInfos} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Prénom</label>
                <input
                  type="text"
                  value={formInfos.prenom}
                  onChange={(e) => setFormInfos({ ...formInfos, prenom: e.target.value })}
                  className="w-full border rounded-lg px-4 py-3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={formInfos.email}
                  onChange={(e) => setFormInfos({ ...formInfos, email: e.target.value })}
                  className="w-full border rounded-lg px-4 py-3"
                  required
                />
              </div>
              {erreur && <p className="text-red-500 text-sm">{erreur}</p>}
              {succes && <p className="text-green-500 text-sm">{succes}</p>}
              <button type="submit" disabled={chargement} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold self-end">
                {chargement ? "..." : "✅ Sauvegarder"}
              </button>
            </form>
          )}

          {onglet === "motdepasse" && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-gray-600">
                Pour des raisons de sécurité, vous ne voyez pas le mot de passe du client et vous ne le choisissez pas.
                Envoyez-lui un lien : il choisira un nouveau mot de passe (lien valable 7 jours, à usage unique).
              </p>
              {erreur && <p className="text-red-500 text-sm">{erreur}</p>}
              {activation && <ResultatActivation r={activation} />}
              <button type="button" onClick={handleEnvoyerLien} disabled={chargement} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold self-end">
                {chargement ? "..." : "📧 Envoyer un lien d'activation"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}