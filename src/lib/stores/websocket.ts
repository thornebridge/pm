import { writable } from 'svelte/store';
import { invalidateAll } from '$app/navigation';
import { browser } from '$app/environment';

export const wsConnected = writable(false);

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
const MAX_DELAY = 30000;

export function connectWs() {
	if (!browser) return;
	if (ws && ws.readyState <= 1) return; // Already connected/connecting

	const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
	ws = new WebSocket(`${protocol}//${location.host}`);

	ws.onopen = () => {
		wsConnected.set(true);
		reconnectDelay = 1000;
	};

	ws.onmessage = (event) => {
		try {
			const msg = JSON.parse(event.data);
			handleWsEvent(msg);
		} catch {
			// Ignore
		}
	};

	ws.onclose = () => {
		wsConnected.set(false);
		ws = null;
		scheduleReconnect();
	};

	ws.onerror = () => {
		ws?.close();
	};
}

function scheduleReconnect() {
	if (reconnectTimer) return;
	reconnectTimer = setTimeout(() => {
		reconnectTimer = null;
		reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
		connectWs();
	}, reconnectDelay);
}

export function disconnectWs() {
	if (reconnectTimer) {
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}
	ws?.close();
	ws = null;
}

export function subscribeProject(projectId: string) {
	send({ type: 'subscribe', projectId });
}

export function unsubscribeProject(projectId: string) {
	send({ type: 'unsubscribe', projectId });
}

function send(msg: unknown) {
	if (ws && ws.readyState === 1) {
		ws.send(JSON.stringify(msg));
	}
}

function handleWsEvent(msg: { type: string }) {
	// For all mutation events, invalidate SvelteKit data
	switch (msg.type) {
		case 'task:created':
		case 'task:updated':
		case 'task:deleted':
		case 'comment:added':
			invalidateAll();
			break;
	}
}
