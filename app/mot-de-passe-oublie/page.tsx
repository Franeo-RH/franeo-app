"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function MotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [chargement, setChargement] = useState(false);
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur("");

    const res = await fetch("/api/auth/mot-de-passe-oublie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      setErreur(data.erreur || "Une erreur est survenue");
    } else {
      setSucces(true);
    }

    setChargement(false);
  }

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

        {succes ? (
          <div className="text-center">
            <p className="text-4xl mb-4">📧</p>
            <h2 className="text-xl font-bold mb-2">Email envoyé !</h2>
            <p className="text-gray-500 mb-6">
              Si cet email existe dans notre système, vous recevrez un lien de réinitialisation dans quelques minutes.
            </p>
            <Link href="/login" className="text-orange-500 font-semibold hover:underline">
              ← Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2 text-center">Mot de passe oublié</h1>
            <p className="text-gray-500 text-center mb-8">
              Entrez votre email pour recevoir un lien de réinitialisation.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-orange-500 focus:outline-none"
                  placeholder="votre@email.com"
                  required
                />
              </div>

              {erreur && <p className="text-red-500 text-sm">{erreur}</p>}

              <button
                type="submit"
                disabled={chargement}
                className="bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition"
              >
                {chargement ? "Envoi..." : "📧 Envoyer le lien"}
              </button>
            </form>

            <div className="text-center mt-6">
              <Link href="/login" className="text-gray-500 text-sm hover:underline">
                ← Retour à la connexion
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
}