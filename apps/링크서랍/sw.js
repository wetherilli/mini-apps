/* =====================================================================
 *  링크서랍 — 서비스 워커 (앱으로 설치할 때 씁니다)
 * ---------------------------------------------------------------------
 *  네트워크가 먼저입니다. 새 판은 곧바로 받고, 받은 것은 캐시에 남겨 두었다가
 *  인터넷이 끊겼을 때만 꺼내 씁니다. 캐시가 먼저인 꼴로 바꾸지 마십시오 —
 *  「고쳤는데 옛 판이 나온다」 가 바로 그것입니다.
 *
 *  CACHE 이름에 판 번호가 들어갑니다. 판이 오르면 이 파일이 바뀌고, 브라우저가
 *  새 워커를 받아 activate 에서 옛 판의 캐시를 지웁니다.
 *  판올리기.js 가 이 줄의 번호도 함께 올립니다.
 *
 *  저장(localStorage)은 여기서 건드리지 않습니다 — 캐시를 지워도 모은 링크는
 *  그대로 남습니다.
 * ===================================================================== */
const CACHE = "링크서랍-v1.1.1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("링크서랍-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.status === 200) {
          const 사본 = res.clone();
          caches.open(CACHE).then(c => c.put(req, 사본));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit =>
        hit || (req.mode === "navigate" ? caches.match("./", { ignoreSearch: true }) : undefined)
      ).then(hit => hit || Response.error()))
  );
});
