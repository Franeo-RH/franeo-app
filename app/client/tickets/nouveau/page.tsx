"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ModaleSurcout from "@/components/ModaleSurcout";
import type { Surcout } from "@/lib/surcout";

export default function NouveauTicket() {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [surcout, setSurcout] = useState<Surcout | null>(null);
  const [prenom, setPrenom] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  const [form, setForm] = useState({
    titre: "",
    description: "",
  });

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(data => {
      if (data.prenom) setPrenom(data.prenom);
      if (data.permissions) setPermissions(data.permissions);
    });
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await envoyer(false);
  }

  async function envoyer(accepteSurcout: boolean) {
    setChargement(true);
    setErreur("");

    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, accepteSurcout }),
    });

    const data = await res.json();

    // Supplément : on demande l'accord du client
    if (res.status === 402 && data.surcoutRequis) {
      setSurcout(data.surcout);
      setChargement(false);
      return;
    }

    if (!res.ok) {
      setErreur(data.erreur || "Une erreur est survenue");
      setChargement(false);
      return;
    }

    setSurcout(null);
    router.push("/client/tickets");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom={prenom} permissions={permissions} />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold">➕ Nouveau ticket RH</h1>
            <button
              onClick={() => router.push("/client/tickets")}
              className="bg-white border px-5 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              ← Retour
            </button>
          </div>

          <div className="bg-white rounded-xl shadow p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

              <div>
                <label className="block text-sm font-semibold mb-1">Titre *</label>
                <input
                  type="text"
                  name="titre"
                  value={form.titre}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-4 py-3"
                  placeholder="Ex: Question sur un contrat CDD"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Description *</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-4 py-3 h-40 resize-none"
                  placeholder="Décrivez votre demande en détail..."
                  required
                />
              </div>

              {erreur && <p className="text-red-500">{erreur}</p>}

              <button
                type="submit"
                disabled={chargement}
                className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition self-end"
              >
                {chargement ? "Envoi..." : "✅ Envoyer le ticket"}
              </button>

            </form>
          </div>

        </main>
      </div>
      {surcout && (
        <ModaleSurcout
          surcout={surcout}
          chargement={chargement}
          onAnnuler={() => { setSurcout(null); setChargement(false); }}
          onAccepter={() => envoyer(true)}
        />
      )}
    </div>
  );
}