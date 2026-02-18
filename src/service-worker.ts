/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

const CACHE_NAME = `pm-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
		).then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	const isAsset = ASSETS.includes(url.pathname);

	if (isAsset) {
		event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
	}
});

self.addEventListener('push', (event) => {
	const data = event.data?.json() ?? { title: 'PM', body: 'New notification' };

	event.waitUntil(
		self.registration.showNotification(data.title, {
			body: data.body,
			icon: '/favicon.svg',
			badge: '/favicon.svg',
			data: { url: data.url || '/' },
			tag: data.tag
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	const url = event.notification.data?.url || '/';

	event.waitUntil(
		self.clients
			.matchAll({ type: 'window', includeUncontrolled: true })
			.then((clients) => {
				for (const client of clients) {
					if (client.url.includes(url) && 'focus' in client) {
						return client.focus();
					}
				}
				return self.clients.openWindow(url);
			})
	);
});
