import { writable, get } from 'svelte/store';
import { api } from '$lib/utils/api.js';
import { invalidateAll } from '$app/navigation';

export const themeMode = writable<'dark' | 'light'>('dark');

export async function setActiveTheme(themeId: string | null) {
	await api('/api/themes/active', {
		method: 'PUT',
		body: JSON.stringify({ themeId })
	});
	await invalidateAll();
}

export function toggleTheme() {
	const current = get(themeMode);
	themeMode.set(current === 'dark' ? 'light' : 'dark');
}
