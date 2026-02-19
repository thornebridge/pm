import { writable, get } from 'svelte/store';

export const theme = writable<'light' | 'dark'>('dark');

export function toggleTheme() {
	theme.set(get(theme) === 'dark' ? 'light' : 'dark');
}
