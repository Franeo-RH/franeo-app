// Service worker Franeo : rend l'app installable et affiche une page propre hors connexion.
// Les données (pages, API) viennent toujours du serveur : rien de confidentiel n'est mis en cache.
const CACHE = "franeo-v1";
const HORS_LIGNE = "/hors-ligne.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([HORS_LIGNE, "/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Fichiers techniques de Next.js (versionnés) : depuis le cache si possible, plus rapide
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then((r) => r || fetch(req).then((rep) => {
        const copie = rep.clone();
        caches.open(CACHE).then((c) => c.put(req, copie));
        return rep;
      }))
    );
    return;
  }

  // Pages : toujours le réseau, page « hors connexion » si pas de réseau
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(HORS_LIGNE)));
  }
});
