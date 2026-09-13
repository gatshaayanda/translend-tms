const CACHE="translend-shell-v1"; const OFFLINE="/offline";
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll([OFFLINE]))));
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return; if(event.request.mode==="navigate"){event.respondWith(fetch(event.request).catch(()=>caches.match(OFFLINE)));}});