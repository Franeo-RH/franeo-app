"use client";

// Démo en consultation seule (navigateur) : au lieu d'envoyer une modification ou de lancer un téléchargement,
// on affiche un message. Le serveur refuse de toute façon ces actions (proxy.ts).

import { useEffect, useState } from "react";
import { bloqueeEnDemo, MESSAGE_DEMO } from "@/lib/demo-lecture";

export default function DemoLectureSeule() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    const avertir = () => { setVisible(true); clearTimeout(minuterie); minuterie = setTimeout(() => setVisible(false), 5000); };
    const chemin = (url: string) => { try { const u = new URL(url, location.origin); return u.origin === location.origin ? { p: u.pathname, q: u.search } : null; } catch { return null; } };

    // 1) Requêtes : modifications et téléchargements arrêtés avant l'envoi
    const fetchOrigine = window.fetch.bind(window);
    window.fetch = (entree: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof entree === "string" ? entree : entree instanceof URL ? entree.href : entree.url;
      const methode = init?.method ?? (entree instanceof Request ? entree.method : "GET");
      const c = chemin(url);
      if (c && bloqueeEnDemo(methode, c.p, c.q)) {
        avertir();
        return Promise.resolve(new Response(JSON.stringify({ erreur: MESSAGE_DEMO, demo: true }), { status: 403, headers: { "Content-Type": "application/json" } }));
      }
      return fetchOrigine(entree, init);
    };

    // 2) Liens de téléchargement (attribut download, exports, fichiers)
    const surClic = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const c = chemin(a.getAttribute("href") || "");
      if (a.hasAttribute("download") || (c && bloqueeEnDemo("GET", c.p, c.q))) { e.preventDefault(); e.stopPropagation(); avertir(); }
    };
    document.addEventListener("click", surClic, true);

    // 3) Téléchargements déclenchés par le code (fichier Word, Excel ou PDF fabriqué dans le navigateur)
    const clicOrigine = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      if (this.hasAttribute("download") || this.href.startsWith("blob:")) { avertir(); return; }
      return clicOrigine.call(this);
    };
    const ouvrirOrigine = window.open;
    window.open = ((url?: string | URL, ...reste: unknown[]) => {
      const c = url ? chemin(String(url)) : null;
      if (!url || (c && bloqueeEnDemo("GET", c.p, c.q))) { avertir(); return null; } // fenêtre d'impression ou export
      return (ouvrirOrigine as (...a: unknown[]) => Window | null)(url, ...reste);
    }) as typeof window.open;
    const imprimerOrigine = window.print;
    window.print = () => avertir();

    return () => {
      window.fetch = fetchOrigine;
      document.removeEventListener("click", surClic, true);
      HTMLAnchorElement.prototype.click = clicOrigine;
      window.open = ouvrirOrigine;
      window.print = imprimerOrigine;
      clearTimeout(minuterie);
    };
  }, []);

  if (!visible) return null;
  return (
    <div role="status" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 1000, maxWidth: "min(560px, calc(100vw - 32px))", background: "#1e3a8a", color: "#ffffff", borderRadius: 14, padding: "14px 18px", boxShadow: "0 12px 32px rgba(0,0,0,0.25)", fontSize: 14, lineHeight: 1.45, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span aria-hidden="true" style={{ fontSize: 20 }}>👀</span>
      <span style={{ flex: 1 }}>{MESSAGE_DEMO}</span>
      <button type="button" onClick={() => setVisible(false)} aria-label="Fermer" style={{ background: "none", border: "none", color: "#ffffff", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
    </div>
  );
}
