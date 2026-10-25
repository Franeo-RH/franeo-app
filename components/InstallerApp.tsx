"use client";

import { useEffect, useState } from "react";

type EvenementInstall = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Bouton « Installer l'application » : Android = installation directe, iPhone = mode d'emploi */
export default function InstallerApp({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [evenement, setEvenement] = useState<EvenementInstall | null>(null);
  const [ios, setIos] = useState(false);
  const [installee, setInstallee] = useState(true); // caché tant qu'on ne sait pas
  const [aide, setAide] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstallee(standalone);
    const ua = navigator.userAgent;
    setIos(/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1));

    const avant = (e: Event) => {
      e.preventDefault();
      setEvenement(e as EvenementInstall);
    };
    const apres = () => setInstallee(true);
    window.addEventListener("beforeinstallprompt", avant);
    window.addEventListener("appinstalled", apres);
    return () => {
      window.removeEventListener("beforeinstallprompt", avant);
      window.removeEventListener("appinstalled", apres);
    };
  }, []);

  if (installee || (!evenement && !ios)) return null;

  async function installer() {
    if (evenement) {
      await evenement.prompt();
      await evenement.userChoice.catch(() => null);
      setEvenement(null);
    } else {
      setAide(true);
    }
  }

  return (
    <>
      <button type="button" onClick={installer} className={className} style={style}>
        📲 Installer l&apos;application
      </button>

      {aide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titre-installer"
          onClick={() => setAide(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px" }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#ffffff", color: "#111827", borderRadius: "16px", padding: "22px", maxWidth: "420px", width: "100%" }}>
            <h2 id="titre-installer" style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 700 }}>Installer Franeo sur votre iPhone</h2>
            <ol style={{ margin: "0 0 16px", paddingLeft: "20px", lineHeight: 1.7, fontSize: "15px" }}>
              <li>Ouvrez Franeo dans <strong>Safari</strong></li>
              <li>Touchez le bouton <strong>Partager</strong> (carré avec une flèche vers le haut)</li>
              <li>Choisissez <strong>« Sur l&apos;écran d&apos;accueil »</strong></li>
              <li>Touchez <strong>Ajouter</strong></li>
            </ol>
            <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: "14px" }}>L&apos;icône Franeo apparaît sur votre écran, et l&apos;app s&apos;ouvre en plein écran.</p>
            <button type="button" onClick={() => setAide(false)} style={{ width: "100%", background: "#f97316", color: "#ffffff", border: "none", borderRadius: "10px", padding: "12px", fontWeight: 700, fontSize: "15px" }}>
              J&apos;ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
