self.addEventListener("install", (event) => {
    console.log("Service Worker instalado.");
    event.waitUntil(
      caches.open("app-v1").then((cache) => {
        return cache.addAll([
          "/",
          "/index.html",
          "/icon-192.png",
          "/icon-512.png",
          "/manifest.json"
        ]);
      })
    );
  });
  
  self.addEventListener("fetch", (event) => {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  });
  