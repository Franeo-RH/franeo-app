"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

function FormulaireReinit() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [form, setForm] = useState({
    motDePasse: "",
    confirmation: "",
  });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");

    if (form.motDePasse !== form.confirmation) {
      setErreur("Les mots de passe ne correspondent pas");
      return;
    }

    if (form.motDePasse.length < 6) {
      setErreur("Le mot de passe doit faire au moins 6 caractères");
      return;
    }

    setChargement(true);

    const res = await fetch("/api/auth/reinitialiser-mot-de-passe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, motDePasse: form.motDePasse }),
    });

    const data = await res.json();

    if (!res.ok) {
      setErreur(data.erreur || "Une erreur est survenue");
      setChargement(false);
      return;
    }

    setSucces(true);
    setTimeout(() => router.push("/login"), 3000);
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-red-500 font-semibold">Lien invalide ou expiré.</p>
        <Link href="/mot-de-passe-oublie" className="text-orange-500 hover:underline mt-4 block">
          Faire une nouvelle demande
        </Link>
      </div>
    );
  }

  return (
    <>
      {succes ? (
        <div className="text-center">
          <p className="text-4xl mb-4">✅</p>
          <h2 className="text-xl font-bold mb-2">Mot de passe modifié !</h2>
          <p className="text-gray-500 mb-2">Vous allez être redirigé vers la connexion...</p>
          <Link href="/login" className="text-orange-500 font-semibold hover:underline">
            Se connecter →
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-2 text-center">Nouveau mot de passe</h1>
          <p className="text-gray-500 text-center mb-8">Choisissez un nouveau mot de passe sécurisé.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={form.motDePasse}
                onChange={(e) => setForm({ ...form, motDePasse: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-orange-500 focus:outline-none"
                placeholder="Au moins 6 caractères"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Confirmation</label>
              <input
                type="password"
                value={form.confirmation}
                onChange={(e) => setForm({ ...form, confirmation: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-orange-500 focus:outline-none"
                placeholder="Répétez le mot de passe"
                required
              />
            </div>

            {erreur && <p className="text-red-500 text-sm">{erreur}</p>}

            <button
              type="submit"
              disabled={chargement}
              className="bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition"
            >
              {chargement ? "Enregistrement..." : "✅ Enregistrer"}
            </button>
          </form>
        </>
      )}
    </>
  );
}

export default function ReinitialiserMotDePasse() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md">

        <div className="flex justify-center mb-8">
          <Image
            src="/FRANEO-Logo-Orange.png"
            alt="Franeo"
            width={150}
            height={50}
            style={{ objectFit: "contain" }}
          />
        </div>

        <Suspense fallback={<p className="text-center text-gray-500">Chargement...</p>}>
          <FormulaireReinit />
        </Suspense>

      </div>
    </div>
  );
}