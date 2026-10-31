// ══════════════════════════════════════════════════════════════
//  SIMKEDA — Service Worker (PWA)
//  Strategi:
//   - App shell (index.html, manifest, ikon, font) → cache-first,
//     lalu diperbarui di background (stale-while-revalidate) supaya
//     aplikasi tetap bisa dibuka walau offline / sinyal jelek.
//   - Request ke script.google.com (data SIMKEDA) → TIDAK di-cache
//     sama sekali. Data kesehatan harus selalu ambil yang terbaru
//     dari server, dan tidak aman disimpan diam-diam di cache browser.
// ══════════════════════════════════════════════════════════════

const CACHE_NAME = 'simkeda-shell-v32';

// Ganti angka versi di atas (v1 → v2 dst) tiap kali app shell diubah
// signifikan, supaya browser tahu harus ambil ulang semua aset.

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/00-pwa-awal.js',
  './js/00b-pwa-install.js',
  './js/01-state-auth-antrean.js',
  './js/02-pemberitahuan-audit-ekspor.js',
  './js/03-setelan-role-navigasi.js',
  './js/04-dashboard-antrian.js',
  './js/05-data-pm.js',
  './js/06-icd10-autocomplete.js',
  './js/06b-icd10-lengkap.js',
  './js/07-pemeriksaan.js',
  './js/08-grafik-laporan-kasi.js',
  './js/09-rekap-jenis-url-insidental.js',
  './js/10-splash-init.js',
  './js/11-pengukuran-dokter.js',
  './js/12-admin-rekam-medis.js',
  './js/13-insidental-rujukan-foto.js',
  './js/13b-antrean-foto.js',
  './js/14-kasi-asesmen.js',
  './js/15-cetak-pdf.js',
  './js/16-stok-obat-excel.js',
  './js/17-paket-laporan-kasi.js',
  './js/17b-analisis-khusus.js',
  './js/17-init-pwa.js',
  './js/18-mobile-ui.js',
  './js/06c-analisis-filter.js',
  './vendor/xlsx.bundle.js',
  './img/logo-1.png',
  './img/logo-2.png',
  './img/logo-3.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png'
];

// ── INSTALL: simpan app shell ke cache ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // cache:'reload' → ambil langsung dari server, bukan dari cache HTTP browser. Tanpa ini,
      // versi baru bisa terpasang dengan berkas LAMA (GitHub Pages menyimpan cache ±10 menit).
      .then((cache) => cache.addAll(APP_SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: bersihkan cache versi lama ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: strategi berbeda tergantung tujuan request ──
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Hanya tangani GET — POST (kirim data ke GAS) selalu langsung ke jaringan
  if (req.method !== 'GET') return;

  // JANGAN cache apa pun yang menuju Apps Script (data dinamis/sensitif).
  // Biarkan browser menanganinya langsung seperti biasa (network only).
  if (url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com') {
    return;
  }

  // Untuk font Google & aset sendiri (same-origin / fonts.googleapis) →
  // stale-while-revalidate: langsung kasih dari cache kalau ada (cepat),
  // sambil diam-diam update cache dari jaringan untuk permintaan berikutnya.
  if (url.origin === self.location.origin || url.hostname.includes('fonts.g')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => {
          const networkFetch = fetch(req)
            .then((res) => {
              if (res && res.status === 200) cache.put(req, res.clone());
              return res;
            })
            .catch(() => cached); // offline & tidak ada di cache → biarkan gagal/undefined
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Selain itu (CDN library dsb.) → coba jaringan dulu, fallback ke cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
