// Guarda o app para abrir sem internet. A leitura de documentos (api/) sempre vai à rede.
const CACHE = "homologago-v97";
const ARQUIVOS = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png",
  "vendor/html2canvas.min.js", "vendor/jspdf.umd.min.js", "vendor/svg2pdf.umd.min.js", "vendor/jszip.min.js", "vendor/xlsx.full.min.js",
  "vendor/pdf.min.js", "vendor/pdf.worker.min.js", "vendor/supabase.js",
  "js/01-dados.js", "js/02-formulario.js", "js/03-documentos.js", "js/04-exportacao.js", "js/05-projetos.js",
  "js/06-leitura.js", "js/07-art.js", "js/08-extras.js", "js/09-conta.js", "js/10-acompanhamento.js"];

self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.includes("/api/")) return;
  // Rede primeiro (pega atualizações); sem rede, usa a cópia guardada.
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok && url.origin === location.origin) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); }
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))));
});
