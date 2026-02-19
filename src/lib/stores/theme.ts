import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

const stored = browser ? (localStorage.getItem('pm-theme') as Theme | null) : null;
const initial: Theme = stored ?? 'light';

export const theme = writable<Theme>(initial);

if (browser) {
	// Apply initial theme class
	document.documentElement.classList.toggle('dark', initial === 'dark');

	theme.subscribe((value) => {
		document.documentElement.classList.toggle('dark', value === 'dark');
		localStorage.setItem('pm-theme', value);
	});
}

export function toggleTheme() {
	theme.update((t) => (t === 'light' ? 'dark' : 'light'));
}
