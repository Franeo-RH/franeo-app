"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import InstallerApp from "@/components/InstallerApp";
import { viderCacheHorsLigne } from "@/components/EnregistrerSW";
import { oublierDroits } from "@/components/useDroits";
import DemandeAcces from "@/components/DemandeAcces";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [chargementDemo, setChargementDemo] = useState(false);
  const [profilDemo, setProfilDemo] = useState<"client" | "salarie">("client");

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

    if (data.role === "SALARIE") {
      await viderCacheHorsLigne(); oublierDroits();
      router.push("/salarie");
    } else if (data.role === "ADMIN") {
      await viderCacheHorsLigne(); oublierDroits(); // nouvelle session : on repart d'un cache vide
      router.push("/admin/dashboard");
    } else {
      await viderCacheHorsLigne(); oublierDroits(); // nouvelle session : on repart d'un cache vide
      router.push("/client/dashboard");
    }
  }

  async function testerLaDemo() {
    setChargementDemo(true);
    setErreur("");
    try {
      const res = await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profil: profilDemo }) });
      const data = await res.json();
      if (!res.ok) {
        setErreur(data.erreur || "La démo est indisponible pour le moment.");
        setChargementDemo(false);
        return;
      }
      await viderCacheHorsLigne(); oublierDroits(); // nouvelle session : on repart d'un cache vide
      router.push(profilDemo === "salarie" ? "/salarie" : "/client/dashboard");
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

        <div role="tablist" aria-label="Type de démo" style={{ display: "flex", background: "#f3f4f6", borderRadius: "10px", padding: "4px", marginBottom: "10px" }}>
          {([["client", "🏢 Démo client"], ["salarie", "📱 Démo salarié"]] as const).map(([val, lib]) => (
            <button
              key={val}
              type="button"
              role="tab"
              aria-selected={profilDemo === val}
              onClick={() => setProfilDemo(val)}
              style={{ flex: 1, border: "none", borderRadius: "8px", padding: "9px", fontSize: "14px", fontWeight: 600, cursor: "pointer", background: profilDemo === val ? "#ffffff" : "transparent", color: profilDemo === val ? "#ea580c" : "#6b7280", boxShadow: profilDemo === val ? "0 1px 2px rgba(0,0,0,0.1)" : "none" }}
            >
              {lib}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={testerLaDemo}
          disabled={chargementDemo}
          className="w-full border-2 border-orange-500 text-orange-600 rounded-lg py-3 font-semibold hover:bg-orange-50 transition disabled:opacity-60"
        >
          {chargementDemo ? "Ouverture de la démo..." : profilDemo === "salarie" ? "🧪 Tester l'espace salarié" : "🧪 Tester la démo"}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">{profilDemo === "salarie" ? "Vous êtes Sophie, salariée de l'entreprise démo : déclarez une absence et suivez sa validation." : "Sans inscription, avec des données fictives."}</p>

        <div style={{ textAlign: "center", marginTop: "12px" }}>
          <DemandeAcces variante="lien" />
        </div>

        <InstallerApp
          style={{ width: "100%", marginTop: "16px", background: "#111827", color: "#ffffff", border: "none", borderRadius: "8px", padding: "12px", fontWeight: 600, cursor: "pointer" }}
        />
      </div>
    </main>
  );
}
