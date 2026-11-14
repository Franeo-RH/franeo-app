import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// En-têtes de sécurité envoyés avec chaque page et chaque réponse d'API
const politiqueContenu = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const entetesSecurite = [
  { key: "Content-Security-Policy", value: politiqueContenu },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Position : seulement pour le badge (sur ce site) ; caméra et micro : Buddy (dictée vocale) et photos d'arrêt de travail
  { key: "Permissions-Policy", value: "geolocation=(self), microphone=(self), camera=(self), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    agentFeedback: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:chemin*", headers: entetesSecurite },
      // Données personnelles : jamais gardées par le navigateur ou un proxy
      { source: "/api/:chemin*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
