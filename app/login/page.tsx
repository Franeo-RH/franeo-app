"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [chargementDemo, setChargementDemo] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, motDePasse }),
    });

    const data = await res.json();

    if (!res.ok) {
      setErreur(data.erreur);
      setChargement(false);
      return;
    }

    if (data.role === "ADMIN") {
      router.push("/admin/dashboard");
    } else {
      router.push("/client/dashboard");
    }
  }

  async function testerLaDemo() {
    setChargementDemo(true);
    setErreur("");
    try {
      const res = await fetch("/api/demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErreur(data.erreur || "La démo est indisponible pour le moment.");
        setChargementDemo(false);
        return;
      }
      router.push("/client/dashboard");
    } catch {
      setErreur("Problème de connexion, réessayez.");
      setChargementDemo(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow p-10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Image src="/FRANEO-Logo-Orange.png" alt="Franeo" width={160} height={60} style={{ objectFit: "contain" }} />
        </div>

        <p className="text-gray-500 text-center mb-8">Gérez vos ressources humaines simplement et efficacement.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-4 py-3 text-black"
              placeholder="votre@email.fr"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Mot de passe</label>
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="w-full border rounded-lg px-4 py-3 text-black"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="text-right">
            <Link href="/mot-de-passe-oublie" className="text-orange-500 text-sm hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>

          {erreur && <p className="text-red-500 text-sm">{erreur}</p>}

          <button
            type="submit"
            disabled={chargement}
            className="bg-orange-500 text-white rounded-lg py-3 font-semibold mt-2 hover:bg-orange-600 transition"
          >
            {chargement ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 border-t" />
          <span className="text-xs text-gray-400">ou</span>
          <div className="flex-1 border-t" />
        </div>

        <button
          type="button"
          onClick={testerLaDemo}
          disabled={chargementDemo}
          className="w-full border-2 border-orange-500 text-orange-600 rounded-lg py-3 font-semibold hover:bg-orange-50 transition disabled:opacity-60"
        >
          {chargementDemo ? "Ouverture de la démo..." : "🧪 Tester la démo"}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">Sans inscription, avec des données fictives.</p>
      </div>
    </main>
  );
}
