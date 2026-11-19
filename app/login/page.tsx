"use client";

import { useEffect, useState } from "react";
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
  const [profilDemo, setProfilDemo] = useState<"client" | "salarie" | "manager" | "cabinet">("client");
  // Lien depuis le site (ex. /login?demo=cabinet) : la bonne démo est présélectionnée
  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get("demo");
    if (d === "cabinet" || d === "salarie" || d === "manager" || d === "client") setProfilDemo(d);
  }, []);
  // Double authentification : 2e étape, code reçu par e-mail
  const [etapeCode, setEtapeCode] = useState<{ jeton: string; email: string } | null>(null);
  const [code, setCode] = useState("");
  const [confiance, setConfiance] = useState(true);
  const [info, setInfo] = useState("");

  async function entrer(role: string) {
    await viderCacheHorsLigne(); oublierDroits(); // nouvelle session : on repart d'un cache vide
    router.push(role === "SALARIE" ? "/salarie" : role === "ADMIN" ? "/admin/dashboard" : role === "CABINET" ? "/cabinet" : "/client/dashboard");
  }

  async function validerCode(e: React.FormEvent) {
    e.preventDefault();
    if (!etapeCode) return;
    setChargement(true); setErreur(""); setInfo("");
    const res = await fetch("/api/auth/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jeton: etapeCode.jeton, code, confiance }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErreur(data.erreur || "Code incorrect");
      if (data.recommencer) { setEtapeCode(null); setCode(""); }
      setChargement(false);
      return;
    }
    await entrer(data.role);
  }

  async function renvoyerCode() {
    if (!etapeCode) return;
    setErreur(""); setInfo("");
    const res = await fetch("/api/auth/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jeton: etapeCode.jeton, renvoyer: true }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setErreur(data.erreur || "Envoi impossible"); if (data.recommencer) setEtapeCode(null); return; }
    setEtapeCode({ ...etapeCode, jeton: data.jeton });
    setCode("");
    setInfo("📧 Nouveau code envoyé.");
  }

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

    if (data.etape === "code") {
      setEtapeCode({ jeton: data.jeton, email: data.email });
      setCode("");
      setChargement(false);
      return;
    }
    await entrer(data.role);
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
      router.push(profilDemo === "client" ? "/client/dashboard" : profilDemo === "cabinet" ? "/cabinet" : "/salarie");
    } catch {
      setErreur("Problème de connexion, réessayez.");
      setChargementDemo(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow p-10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Image src="/FRANEO-Logo-Orange.png" alt="Franeo RH" width={180} height={221} style={{ objectFit: "contain", width: "min(180px, 50vw)", height: "auto" }} priority />
        </div>

        <p className="text-gray-500 text-center mb-8">Gérez vos ressources humaines simplement et efficacement.</p>

        {etapeCode ? (
          <form onSubmit={validerCode} className="flex flex-col gap-4">
            <div className="text-center">
              <p className="text-lg font-bold">🔐 Vérification en deux étapes</p>
              <p className="text-sm text-gray-500 mt-1">Nous avons envoyé un code à 6 chiffres à <strong>{etapeCode.email}</strong>. Il est valable 10 minutes.</p>
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric" autoComplete="one-time-code" autoFocus
              aria-label="Code reçu par e-mail" placeholder="••••••"
              className="w-full border-2 rounded-lg px-4 py-3 text-black text-center text-2xl font-bold"
              style={{ letterSpacing: "0.5em" }}
              required
            />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={confiance} onChange={(e) => setConfiance(e.target.checked)} />
              Faire confiance à cet appareil pendant 30 jours (pas sur un ordinateur partagé)
            </label>
            {erreur && <p className="text-red-500 text-sm">{erreur}</p>}
            {info && <p className="text-green-700 text-sm">{info}</p>}
            <button type="submit" disabled={chargement || code.length !== 6} className="bg-orange-500 text-white rounded-lg py-3 font-semibold hover:bg-orange-600 transition disabled:opacity-50">
              {chargement ? "Vérification..." : "Valider le code"}
            </button>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={renvoyerCode} className="text-orange-500 hover:underline">Renvoyer un code</button>
              <button type="button" onClick={() => { setEtapeCode(null); setErreur(""); setInfo(""); }} className="text-gray-500 hover:underline">← Retour</button>
            </div>
            <p className="text-xs text-gray-400 text-center">Pas reçu ? Regardez dans vos courriers indésirables.</p>
          </form>
        ) : (
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
        )}

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 border-t" />
          <span className="text-xs text-gray-400">ou</span>
          <div className="flex-1 border-t" />
        </div>

        <div role="tablist" aria-label="Type de démo" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: "2px", background: "#f3f4f6", borderRadius: "10px", padding: "4px", marginBottom: "10px" }}>
          {([["client", "🏢 Dirigeant"], ["salarie", "📱 Salarié"], ["manager", "🧑‍💼 Manager"], ["cabinet", "🏛️ Cabinet"]] as const).map(([val, lib]) => (
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
          {chargementDemo ? "Ouverture de la démo..." : profilDemo === "salarie" ? "🧪 Tester l'espace salarié" : profilDemo === "manager" ? "🧪 Tester l'espace manager" : profilDemo === "cabinet" ? "🧪 Tester l'accès cabinet" : "🧪 Tester la démo"}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">{profilDemo === "salarie" ? "Vous êtes Sophie, salariée de l'entreprise démo : relevé, absences, frais et questions à votre manager." : profilDemo === "manager" ? "Vous êtes Karim, manager de 4 salariés : validez relevés, absences et frais, répondez aux questions de l'équipe." : profilDemo === "cabinet" ? "Vous êtes Claire, expert-comptable : 4 dossiers clients dans un seul accès, avec vos collaborateurs." : "Sans inscription, avec des données fictives."}</p>

        <div style={{ textAlign: "center", marginTop: "12px" }}>
          <DemandeAcces variante="lien" />
        </div>

        <InstallerApp
          style={{ width: "100%", marginTop: "16px", background: "#111827", color: "#ffffff", border: "none", borderRadius: "8px", padding: "12px", fontWeight: 600, cursor: "pointer" }}
        />

        <p className="text-xs text-gray-400 text-center mt-6">
          <Link href="/mentions-legales" className="hover:underline">Mentions légales</Link>
          {" · "}
          <Link href="/confidentialite" className="hover:underline">Confidentialité</Link>
        </p>
      </div>
    </main>
  );
}
