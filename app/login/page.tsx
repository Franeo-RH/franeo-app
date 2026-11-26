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
  const [voirMdp, setVoirMdp] = useState(false);

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

  async function testerLaDemo(choix?: "client" | "salarie" | "manager" | "cabinet") {
    const profil = choix ?? profilDemo;
    setProfilDemo(profil);
    setChargementDemo(true);
    setErreur("");
    try {
      const res = await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profil }) });
      const data = await res.json();
      if (!res.ok) {
        setErreur(data.erreur || "La démo est indisponible pour le moment.");
        setChargementDemo(false);
        return;
      }
      await viderCacheHorsLigne(); oublierDroits(); // nouvelle session : on repart d'un cache vide
      router.push(profil === "client" ? "/client/dashboard" : profil === "cabinet" ? "/cabinet" : "/salarie");
    } catch {
      setErreur("Problème de connexion, réessayez.");
      setChargementDemo(false);
    }
  }

  const ATOUTS = [
    { ico: "💶", titre: "Une paie sans stress", texte: "Variables, absences et relevés d'heures centralisés, bulletins déposés chaque mois." },
    { ico: "📄", titre: "Contrats et documents en un clic", texte: "Contrats, courriers, livret d'accueil et registre du personnel générés pour vous." },
    { ico: "👥", titre: "Des salariés autonomes", texte: "Congés, frais, pointage et questions au manager depuis leur téléphone." },
    { ico: "⏰", titre: "Aucune échéance oubliée", texte: "Fins de période d'essai, CDD et visites médicales rappelés à temps." },
  ];
  const champ = "w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-2.5 sm:py-3 text-[16px] text-gray-900 outline-none transition focus:border-orange-500";

  return (
    <main className="grid min-h-[100dvh] bg-[#f3f1ec] lg:h-[100dvh] lg:grid-cols-[1.05fr_1fr] lg:overflow-hidden">
      {/* Gauche : présentation */}
      <section className="fr-cx-gauche relative hidden flex-col justify-between overflow-hidden px-12 py-8 text-white lg:flex xl:px-16"
        style={{ background: "radial-gradient(70% 60% at 90% 15%, rgba(37,52,110,.75), transparent 65%), radial-gradient(50% 40% at 10% 100%, rgba(249,115,22,.12), transparent 70%), linear-gradient(160deg, #0d1324 0%, #0a0e18 55%, #07090f 100%)" }}>
        <div>
          <Image src="/FRANEO-Logo-Orange-H.png" alt="Franeo RH" width={900} height={335} priority style={{ width: 180, height: "auto" }} />
          <h1 className="fr-cx-titre mt-7 max-w-[560px] text-[38px] font-bold leading-[1.08] tracking-[-.02em]">Votre RH et votre paie,<br />enfin simplifiées.</h1>
          <p className="mt-3 max-w-[540px] text-[16px] leading-relaxed text-gray-400">Paie, contrats, salariés et échéances : tout au même endroit, avec un gestionnaire Franeo à vos côtés.</p>
          <ul className="fr-cx-atouts mt-7 flex max-w-[560px] flex-col gap-4">
            {ATOUTS.map((a) => (
              <li key={a.titre} className="flex gap-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[.06] text-[19px]">{a.ico}</span>
                <span><b className="block text-[16px] font-semibold">{a.titre}</b><span className="fr-cx-detail text-[14px] text-gray-400">{a.texte}</span></span>
              </li>
            ))}
          </ul>
          <a href="https://www.franeo-rh.com" target="_blank" rel="noopener noreferrer" className="mt-7 flex max-w-[560px] items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.05] px-5 py-3.5 transition hover:bg-white/[.09]">
            <span><b className="block text-[16px] font-semibold">📣 Pas encore client ? Découvrez nos offres</b><span className="text-[14px] text-gray-400">Paie, RH, recrutement et formation : sans engagement, adapté aux TPE et PME.</span></span>
            <span className="text-2xl" aria-hidden="true">→</span>
          </a>
        </div>
        <p className="mt-6 text-sm text-gray-500">Un service FRANEO RH · <a href="https://www.franeo-rh.com" className="underline hover:text-gray-300">franeo-rh.com</a> · <Link href="/mentions-legales" className="hover:text-gray-300">Mentions légales</Link> · <Link href="/confidentialite" className="hover:text-gray-300">Confidentialité</Link></p>
      </section>

      {/* Droite : connexion */}
      <section className="flex items-center justify-center px-3 py-3 sm:px-8 sm:py-6 lg:overflow-y-auto">
        <div className="w-full max-w-[470px] rounded-[24px] border border-black/[.06] bg-white px-5 py-5 shadow-[0_20px_60px_rgba(17,24,39,.08)] sm:px-9 sm:py-7">
          <div className="fr-cx-logo mb-3 flex justify-center lg:hidden">
            <Image src="/FRANEO-Logo-Orange-H.png" alt="Franeo RH" width={900} height={335} priority style={{ width: 120, height: "auto" }} />
          </div>
          <h2 className="text-[22px] sm:text-[30px] font-bold tracking-[-.02em] text-gray-900">Bon retour 👋</h2>
          <p className="fr-cx-cache mb-4 mt-0.5 text-[14px] text-gray-500 sm:mb-5 sm:mt-1 sm:text-[16px]">Gérez vos ressources humaines simplement.</p>

          {etapeCode ? (
            <form onSubmit={validerCode} className="flex flex-col gap-4">
              <div>
                <p className="text-lg font-bold">🔐 Vérification en deux étapes</p>
                <p className="mt-1 text-sm text-gray-500">Nous avons envoyé un code à 6 chiffres à <strong>{etapeCode.email}</strong>. Il est valable 10 minutes.</p>
              </div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric" autoComplete="one-time-code" autoFocus
                aria-label="Code reçu par e-mail" placeholder="••••••"
                className={`${champ} text-center text-2xl font-bold`}
                style={{ letterSpacing: "0.5em" }}
                required
              />
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={confiance} onChange={(e) => setConfiance(e.target.checked)} />
                Faire confiance à cet appareil pendant 30 jours (pas sur un ordinateur partagé)
              </label>
              {erreur && <p className="text-sm text-red-500">{erreur}</p>}
              {info && <p className="text-sm text-green-700">{info}</p>}
              <button type="submit" disabled={chargement || code.length !== 6} className="rounded-xl bg-orange-500 py-4 text-[17px] font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50">
                {chargement ? "Vérification..." : "Valider le code"}
              </button>
              <div className="flex justify-between text-sm">
                <button type="button" onClick={renvoyerCode} className="font-semibold text-orange-600 hover:underline">Renvoyer un code</button>
                <button type="button" onClick={() => { setEtapeCode(null); setErreur(""); setInfo(""); }} className="text-gray-500 hover:underline">← Retour</button>
              </div>
              <p className="text-center text-xs text-gray-400">Pas reçu ? Regardez dans vos courriers indésirables.</p>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-[14px] sm:mb-1.5 sm:text-[16px] font-semibold text-gray-900">E-mail</label>
                <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={champ} placeholder="votre@email.fr" required />
              </div>
              <div>
                <div className="mb-1 flex items-baseline justify-between sm:mb-1.5">
                  <label htmlFor="mdp" className="text-[14px] sm:text-[16px] font-semibold text-gray-900">Mot de passe</label>
                  <Link href="/mot-de-passe-oublie" className="text-[15px] font-semibold text-orange-600 hover:underline">Oublié ?</Link>
                </div>
                <div className="relative">
                  <input id="mdp" type={voirMdp ? "text" : "password"} autoComplete="current-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className={`${champ} pr-24`} placeholder="••••••••" required />
                  <button type="button" onClick={() => setVoirMdp(!voirMdp)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-orange-600 hover:underline">{voirMdp ? "Masquer" : "Afficher"}</button>
                </div>
              </div>
              {erreur && <p className="text-sm text-red-500">{erreur}</p>}
              <button type="submit" disabled={chargement} className="rounded-xl bg-orange-500 py-3 sm:py-3.5 text-[16px] sm:text-[17px] font-semibold text-white shadow-[0_8px_20px_rgba(249,115,22,.25)] transition hover:bg-orange-600 disabled:opacity-60">
                {chargement ? "Connexion..." : "Se connecter"}
              </button>
            </form>
          )}

          <div className="fr-cx-sep my-3 flex items-center gap-3 sm:my-4">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-[14px] text-gray-500">ou testez sans inscription</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <div className="fr-connexion-2 grid grid-cols-2 gap-2 sm:gap-3">
            <button type="button" disabled={chargementDemo} onClick={() => testerLaDemo("client")} className="rounded-xl border-2 border-orange-500 px-2 py-2.5 text-[15px] font-semibold text-orange-600 transition hover:bg-orange-50 disabled:opacity-60 sm:py-3 sm:text-[16px]">
              {chargementDemo && profilDemo === "client" ? "Ouverture…" : "🧪 Démo client"}
            </button>
            <button type="button" disabled={chargementDemo} onClick={() => testerLaDemo("cabinet")} className="rounded-xl border-2 border-gray-200 px-2 py-2.5 text-[15px] font-semibold text-gray-900 transition hover:border-gray-300 disabled:opacity-60 sm:py-3 sm:text-[16px]">
              {chargementDemo && profilDemo === "cabinet" ? "Ouverture…" : "🧮 Démo comptable"}
            </button>
          </div>
          <p className="fr-cx-voir mt-2 text-center text-[13px] text-gray-500 sm:mt-3 sm:text-[14px]">
            <span className="fr-cx-desc">Entreprise fictive, données remises à zéro chaque nuit. </span>Voir aussi l&apos;espace{" "}
            <button type="button" disabled={chargementDemo} onClick={() => testerLaDemo("salarie")} className="font-semibold text-orange-600 hover:underline">salarié</button>{" "}ou{" "}
            <button type="button" disabled={chargementDemo} onClick={() => testerLaDemo("manager")} className="font-semibold text-orange-600 hover:underline">manager</button>.
          </p>

          <div className="fr-cx-sep my-3 border-t border-gray-200 sm:my-4" />

          <div className="fr-connexion-3 grid grid-cols-3 gap-2 sm:gap-3">
            <a href="https://www.franeo-rh.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-xl bg-green-50 px-2 py-2.5 text-center text-[13px] font-bold leading-tight text-green-700 hover:bg-green-100 sm:py-3 sm:text-[15px]">🌐 Nos offres</a>
            <DemandeAcces variante="tuile" texte="🚀 Demander un accès" className="flex items-center justify-center rounded-xl bg-orange-50 px-2 py-2.5 text-center text-[13px] font-bold leading-tight text-orange-700 hover:bg-orange-100 sm:py-3 sm:text-[15px]" />
            <DemandeAcces variante="tuile" typeInitial="CONTACT" texte="✉️ Nous contacter" className="flex items-center justify-center rounded-xl bg-blue-50 px-2 py-2.5 text-center text-[13px] font-bold leading-tight text-blue-700 hover:bg-blue-100 sm:py-3 sm:text-[15px]" />
          </div>
          <div className="fr-cx-cache mt-3 flex justify-center">
            <InstallerApp style={{ background: "none", border: "none", color: "#ea580c", fontWeight: 700, fontSize: "15px", cursor: "pointer", padding: 0 }} />
          </div>
          <p className="fr-cx-cache mt-3 text-center text-[11px] text-gray-400 lg:hidden">
            <Link href="/mentions-legales" className="hover:underline">Mentions légales</Link>
            {" · "}
            <Link href="/confidentialite" className="hover:underline">Confidentialité</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
