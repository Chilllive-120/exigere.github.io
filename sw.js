// Меняйте номер версии при каждом обновлении вопросов/кода — у всех подтянется новое
const VERSION = 'v1';
const CACHE = 'examen-' + VERSION;

// Все файлы приложения. Добавляйте сюда новые картинки к вопросам и страницы.
const FILES = [
  './', './index.html', './quiz.js', './questions.js', './manifest.json',
  './img/logo.png', './img/icon-192.png', './img/icon-512.png',
  './img/demo.png',
  './biblioteka_documentov.html',
  // PDF-документы библиотеки (имена как в data-file)
  './pdfs/ohrana-truda.pdf',
  './pdfs/smk.pdf',
  './pdfs/smos.pdf',
  './pdfs/economy.pdf',
  './pdfs/O-OSLiA.pdf',
  './pdfs/OSLiA_5_razryada_EhMC.pdf',
  './pdfs/obzhigaljthik_ehmali_3-4_razryada.pdf'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // каждый файл отдельно: если какого-то нет, остальные всё равно сохранятся
      Promise.all(FILES.map(f => c.add(f).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Сначала из памяти телефона (работает офлайн), в фоне обновляем из сети
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res && res.status === 200 && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
