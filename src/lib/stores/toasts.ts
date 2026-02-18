import { writable } from 'svelte/store';

interface Toast {
	id: number;
	message: string;
	type: 'info' | 'error';
}

let nextId = 0;
export const toasts = writable<Toast[]>([]);

export function showToast(message: string, type: 'info' | 'error' = 'info') {
	const id = nextId++;
	toasts.update((t) => [...t, { id, message, type }]);
	setTimeout(() => dismissToast(id), 4000);
}

export function dismissToast(id: number) {
	toasts.update((t) => t.filter((x) => x.id !== id));
}
