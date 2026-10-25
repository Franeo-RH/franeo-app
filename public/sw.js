// Service worker Franeo
// - rend l'app installable ;
// - hors connexion : les pages déjà consultées restent visibles (lecture seule) ;
// - tout est effacé à la déconnexion (message "vider-cache" envoyé par l'app).
const VERSION = "v2";
const CACHE_STATIQUE = "franeo-statique-" + VERSION;
const CACHE_PAGES = "franeo-pages-" + VERSION;
const HORS_LIGNE = "/hors-ligne.html";

// Ce qui n'est jamais mis en cache
const EXCLUS = ["/api/auth", "/api/logout", "/api/export", "/api/buddy", "/api/demo", "/api/cron", "/login", "/mot-de-passe-oublie", "/reinitialiser-mot-de-passe"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_STATIQUE).then((c) => c.addAll([HORS_LIGNE, "/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cles) =>
      Promise.all(cles.filter((k) => k !== CACHE_STATIQUE && k !== CACHE_PAGES).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data === "vider-cache") {
    event.waitUntil(caches.delete(CACHE_PAGES));
  }
});

function estExclu(url) {
  return EXCLUS.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"));
}

// Réseau d'abord ; en cas de succès on garde une copie ; sans réseau on ressert la copie
async function reseauPuisCache(req, cleCache) {
  const cache = await caches.open(CACHE_PAGES);
  try {
    const rep = await fetch(req);
    if (rep.ok && !rep.redirected && rep.type === "basic") {
      cache.put(cleCache || req, rep.clone());
    }
    return rep;
  } catch (e) {
    const copie = await cache.match(cleCache || req);
    if (copie) return copie;
    throw e;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // aucune modification hors ligne
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || estExclu(url)) return;

  // Fichiers techniques versionnés : cache d'abord (rapide)
  if (url.pathname.startsWith("/_next/static/") || /\.(png|jpg|jpeg|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((r) => r || fetch(req).then((rep) => {
        if (rep.ok) {
          const copie = rep.clone();
          caches.open(CACHE_STATIQUE).then((c) => c.put(req, copie));
        }
        return rep;
      }))
    );
    return;
  }

  // Ouverture d'une page
  if (req.mode === "navigate") {
    event.respondWith(
      reseauPuisCache(req).catch(() => caches.match(HORS_LIGNE))
    );
    return;
  }

  // Navigation interne de Next.js (données des pages) : clé sans le paramètre aléatoire _rsc
  if (req.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    const propre = new URL(url);
    propre.searchParams.delete("_rsc");
    const cle = new Request(propre.toString() + (propre.search ? "&" : "?") + "__rsc=1");
    event.respondWith(reseauPuisCache(req, cle));
    return;
  }

  // Lectures de données (GET /api/...) utilisées par certaines pages
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(reseauPuisCache(req));
  }
});
