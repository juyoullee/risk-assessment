// 파일을 수정해서 GitHub에 올릴 때마다 이 번호를 1씩 올리면
// 사용자 기기의 캐시가 확실하게 갱신된다.
const VERSION = 'v1';
const CACHE = 'risk-assessment-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './template.webp',
  './warning.webp',
  './side.webp',
  './assets/template.webp',
  './assets/warning.webp',
  './assets/side.webp',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 설치: 필요한 파일을 미리 받아둔다 (오프라인 대비)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

// 활성화: 예전 버전 캐시 삭제
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // 날씨·주소 API 는 캐시하지 않음

  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // HTML 은 항상 최신을 먼저 시도 → 수정본이 바로 반영됨
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
  } else {
    // 이미지·아이콘은 캐시 우선 → 빠르고 데이터 절약
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }))
    );
  }
});
