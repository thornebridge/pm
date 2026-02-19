import { writable } from 'svelte/store';

export const unreadCount = writable(0);

export async function refreshUnreadCount() {
	try {
		const res = await fetch('/api/notifications?countOnly=true');
		if (res.ok) {
			const data = await res.json();
			unreadCount.set(data.count);
		}
	} catch {
		// Silently fail
	}
}
