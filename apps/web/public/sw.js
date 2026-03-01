const CACHE_NAME = "famage-pwa-v1";
const APP_SHELL = ["/", "/famage"];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
	);
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const cacheKeys = await caches.keys();
			await Promise.all(
				cacheKeys.map((key) => {
					if (key !== CACHE_NAME) {
						return caches.delete(key);
					}

					return Promise.resolve(false);
				}),
			);

			await self.clients.claim();
		})(),
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;

	if (request.method !== "GET") {
		return;
	}

	event.respondWith(
		(async () => {
			const cachedResponse = await caches.match(request);
			if (cachedResponse) {
				return cachedResponse;
			}

			try {
				const networkResponse = await fetch(request);
				const requestUrl = new URL(request.url);
				if (requestUrl.origin === self.location.origin && networkResponse.ok) {
					const cache = await caches.open(CACHE_NAME);
					cache.put(request, networkResponse.clone());
				}
				return networkResponse;
			} catch {
				return (
					cachedResponse ||
					new Response("Offline", {
						status: 503,
						statusText: "Service Unavailable",
					})
				);
			}
		})(),
	);
});
