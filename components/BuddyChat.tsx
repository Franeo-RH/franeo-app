"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type Lien = { label: string; href: string };

type Message = {
  role: "user" | "buddy";
  contenu: string;
  suggestions?: string[];
  liens?: Lien[];
};

type Humeur = "normal" | "heureux" | "reflechit" | "parle" | "triste";

const CLE_STOCKAGE = "buddy-messages";

const MESSAGE_ACCUEIL: Message = {
  role: "buddy",
  contenu: "👋 Bonjour ! Je suis Buddy, votre assistant Franeo. Tapez \"aide\" pour voir ce que je sais faire !",
  suggestions: ["Aide", "Actualités RH", "Mes salariés"],
};

export default function BuddyChat() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState<Message[]>([MESSAGE_ACCUEIL]);
  const [input, setInput] = useState("");
  const [chargement, setChargement] = useState(false);
  const [ecoute, setEcoute] = useState(false);
  const [humeur, setHumeur] = useState<Humeur>("normal");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const charge = useRef(false);

  // Retrouver la conversation (même après un rechargement de page)
  useEffect(() => {
    try {
      const sauve = sessionStorage.getItem(CLE_STOCKAGE);
      if (sauve) {
        const liste = JSON.parse(sauve);
        if (Array.isArray(liste) && liste.length > 0) setMessages(liste);
      }
    } catch {}
    charge.current = true;
  }, []);

  useEffect(() => {
    if (!charge.current) return;
    try {
      sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify(messages.slice(-40)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, ouvert]);

  const envoyerMessage = useCallback(
    async (texteOverride?: string) => {
      const texte = (texteOverride ?? input).trim();
      if (!texte || chargement) return;

      // Les boutons de suggestion des anciens messages disparaissent
      setMessages((prev) => [
        ...prev.map((m) => ({ ...m, suggestions: undefined })),
        { role: "user", contenu: texte },
      ]);
      setInput("");
      setChargement(true);
      setHumeur("reflechit");

      try {
        const res = await fetch("/api/buddy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: texte }),
        });
        const data = await res.json();
        const reponse: string = data.reponse || "Je n'ai pas compris.";
        const humeurFinale: Humeur =
          data.humeur === "triste" ? "triste" : data.humeur === "content" ? "heureux" : "normal";

        setHumeur("parle");
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: "buddy",
              contenu: reponse,
              suggestions: Array.isArray(data.suggestions) ? data.suggestions : undefined,
              liens: Array.isArray(data.liens) ? data.liens : undefined,
            },
          ]);
          setHumeur(humeurFinale === "normal" ? "heureux" : humeurFinale);
          setTimeout(() => setHumeur("normal"), 2500);

          // Redirection demandée par Buddy
          if (typeof data.redirection === "string" && data.redirection.startsWith("/")) {
            setTimeout(() => router.push(data.redirection), 900);
          }
        }, 300);
      } catch {
        setMessages((prev) => [...prev, { role: "buddy", contenu: "Une erreur est survenue. Réessayez dans un instant." }]);
        setHumeur("triste");
        setTimeout(() => setHumeur("normal"), 2500);
      }

      setChargement(false);
    },
    [input, chargement, router]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.onresult = (e: any) => {
      const texte = e.results[0][0].transcript;
      setEcoute(false);
      envoyerMessage(texte);
    };
    recognition.onend = () => setEcoute(false);
    recognitionRef.current = recognition;
  }, [envoyerMessage]);

  function toggleEcoute() {
    if (!recognitionRef.current) return;
    if (ecoute) {
      recognitionRef.current.stop();
      setEcoute(false);
    } else {
      try {
        recognitionRef.current.start();
        setEcoute(true);
      } catch {
        setEcoute(false);
      }
    }
  }

  function nouvelleConversation() {
    setMessages([MESSAGE_ACCUEIL]);
    try {
      sessionStorage.removeItem(CLE_STOCKAGE);
    } catch {}
  }

  function formaterMessage(texte: string) {
    const lignes = texte.split("\n");
    return lignes.map((ligne, i) => (
      <span key={i}>
        {ligne}
        {i < lignes.length - 1 && <br />}
      </span>
    ));
  }

  const dernierIndex = messages.length - 1;

  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }}>
      {ouvert && (
        <div
          style={{
            position: "fixed", bottom: "110px", right: "24px",
            width: "380px", maxWidth: "calc(100vw - 32px)", height: "540px", maxHeight: "calc(100vh - 140px)", zIndex: 9999,
            backgroundColor: "white", borderRadius: "16px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            border: "1px solid #fed7aa",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ background: "#000", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "44px", height: "44px", borderRadius: "50%",
                  border: "2px solid #f97316", overflow: "hidden", background: "#080808",
                  animation: humeur === "parle" ? "pulse 0.5s infinite" : humeur === "reflechit" ? "shake 0.5s infinite" : "none",
                }}
              >
                <BuddyFace humeur={humeur} />
              </div>
              <div>
                <p style={{ color: "white", fontWeight: "bold", fontSize: "14px", margin: 0 }}>Buddy</p>
                <p style={{ color: "#fb923c", fontSize: "11px", margin: 0 }}>
                  {humeur === "reflechit" ? "⏳ Réfléchit..." : humeur === "parle" ? "💬 Répond..." : "✅ En ligne"}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={nouvelleConversation}
                title="Nouvelle conversation"
                style={{ color: "#9ca3af", background: "none", border: "none", fontSize: "15px", cursor: "pointer" }}
              >
                🗑️
              </button>
              <button onClick={() => setOuvert(false)} style={{ color: "#9ca3af", background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", background: "#f9fafb" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "8px", width: "100%" }}>
                  {m.role === "buddy" && (
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1px solid #f97316", overflow: "hidden", background: "#080808", flexShrink: 0 }}>
                      <BuddyFace humeur="normal" />
                    </div>
                  )}
                  <div
                    style={{
                      maxWidth: "78%", padding: "10px 14px",
                      borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: m.role === "user" ? "#f97316" : "white",
                      color: m.role === "user" ? "white" : "#374151",
                      fontSize: "13px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      lineHeight: "1.6",
                      wordBreak: "break-word",
                    }}
                  >
                    {formaterMessage(m.contenu)}
                  </div>
                </div>

                {/* Liens vers les pages */}
                {m.role === "buddy" && m.liens && m.liens.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", paddingLeft: "36px" }}>
                    {m.liens.map((l, k) => (
                      <button
                        key={k}
                        onClick={() => {
                          router.push(l.href);
                        }}
                        style={{
                          background: "#111", color: "#fb923c", border: "1px solid #f97316",
                          borderRadius: "999px", padding: "5px 12px", fontSize: "12px", cursor: "pointer",
                        }}
                      >
                        {l.label} ↗
                      </button>
                    ))}
                  </div>
                )}

                {/* Suggestions (seulement sur le dernier message) */}
                {m.role === "buddy" && i === dernierIndex && m.suggestions && m.suggestions.length > 0 && !chargement && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", paddingLeft: "36px" }}>
                    {m.suggestions.map((s, k) => (
                      <button
                        key={k}
                        onClick={() => envoyerMessage(s)}
                        style={{
                          background: "white", color: "#ea580c", border: "1px solid #fdba74",
                          borderRadius: "999px", padding: "5px 12px", fontSize: "12px", cursor: "pointer",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {chargement && (
              <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-end", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1px solid #f97316", overflow: "hidden", background: "#080808", flexShrink: 0 }}>
                  <BuddyFace humeur="reflechit" />
                </div>
                <div style={{ background: "white", padding: "10px 14px", borderRadius: "16px 16px 16px 4px", fontSize: "13px", color: "#9ca3af", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                  <span style={{ animation: "dots 1s infinite" }}>•••</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Saisie */}
          <div style={{ padding: "12px", borderTop: "1px solid #e5e7eb", background: "white", display: "flex", gap: "8px" }}>
            <button
              onClick={toggleEcoute}
              style={{ padding: "8px 10px", borderRadius: "8px", border: "none", background: ecoute ? "#ef4444" : "#f3f4f6", cursor: "pointer", fontSize: "16px", transition: "all 0.2s" }}
            >
              🎤
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && envoyerMessage()}
              placeholder={ecoute ? "J'écoute..." : "Posez une question..."}
              maxLength={1000}
              style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", outline: "none", background: ecoute ? "#fef2f2" : "white" }}
            />
            <button
              onClick={() => envoyerMessage()}
              disabled={chargement || !input.trim()}
              style={{
                background: "#f97316", color: "white", border: "none",
                borderRadius: "8px", padding: "8px 14px", fontSize: "14px",
                fontWeight: "bold", cursor: "pointer",
                opacity: chargement || !input.trim() ? 0.4 : 1,
                transition: "all 0.2s",
              }}
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* Bouton flottant animé */}
      <button
        onClick={() => setOuvert(!ouvert)}
        style={{
          width: "72px", height: "72px", borderRadius: "50%",
          border: `4px solid ${ouvert ? "#ea580c" : "#f97316"}`,
          background: "#080808", cursor: "pointer",
          boxShadow: `0 0 ${ouvert ? "35px" : "20px"} rgba(249,115,22,${ouvert ? "0.8" : "0.4"})`,
          padding: "4px",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.3s",
          animation: !ouvert ? "float 3s ease-in-out infinite" : "none",
        }}
      >
        <BuddyFace humeur={humeur} />
      </button>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }
        @keyframes dots { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}

function BuddyFace({ humeur }: { humeur: string }) {
  const [cligne, setCligne] = useState(false);

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let actif = true;
    function planifierClignement() {
      const delai = 3000 + Math.random() * 4000;
      t1 = setTimeout(() => {
        if (!actif) return;
        setCligne(true);
        t2 = setTimeout(() => {
          if (!actif) return;
          setCligne(false);
          planifierClignement();
        }, 150);
      }, delai);
    }
    planifierClignement();
    return () => {
      actif = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const sourire =
    humeur === "heureux" ? "M 28 74 Q 50 88 72 74"
    : humeur === "triste" ? "M 32 80 Q 50 68 68 80"
    : "M 32 72 Q 50 84 68 72";
  const hauteurOeil = cligne ? 4 : humeur === "reflechit" ? 12 : 24;

  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <circle cx="50" cy="50" r="48" fill="#080808" stroke="#ff9900" strokeWidth="3" />
      <rect x="22" y={cligne ? 38 : 28} width="22" height={hauteurOeil} rx="5" fill="#000" stroke="#ff9900" strokeWidth="2" style={{ transition: "all 0.1s" }} />
      {!cligne && humeur !== "reflechit" && <><circle cx="33" cy="40" r="7" fill="#ffb000" /><circle cx="36" cy="37" r="2.5" fill="white" /></>}
      <rect x="56" y={cligne ? 38 : 28} width="22" height={hauteurOeil} rx="5" fill="#000" stroke="#ff9900" strokeWidth="2" style={{ transition: "all 0.1s" }} />
      {!cligne && humeur !== "reflechit" && <><circle cx="67" cy="40" r="7" fill="#ffb000" /><circle cx="70" cy="37" r="2.5" fill="white" /></>}
      <path d={sourire} stroke="#ff9900" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <line x1="50" y1="5" x2="50" y2="15" stroke="#ff9900" strokeWidth="3" />
      <circle cx="50" cy="5" r="4" fill="#ff9900" />
    </svg>
  );
}