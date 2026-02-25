import { writable } from 'svelte/store';
import { invalidateAll } from '$app/navigation';
import { browser } from '$app/environment';
import { refreshUnreadCount } from './notifications.js';

export const wsConnected = writable(false);

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
const MAX_DELAY = 30000;

// ─── Event Callback System ──────────────────────────────────────────────────

type WsEventHandler = (msg: any) => void;
const eventHandlers = new Map<string, Set<WsEventHandler>>();

/** Register a handler for a specific WS event type. Returns unsubscribe function. */
export function onWsEvent(type: string, handler: WsEventHandler): () => void {
	if (!eventHandlers.has(type)) {
		eventHandlers.set(type, new Set());
	}
	eventHandlers.get(type)!.add(handler);
	return () => {
		eventHandlers.get(type)?.delete(handler);
	};
}

// ─── Connection Management ──────────────────────────────────────────────────

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

function handleWsEvent(msg: { type: string; [key: string]: unknown }) {
	if (!msg.type) return;

	// Dispatch to registered event handlers
	const handlers = eventHandlers.get(msg.type);
	if (handlers && handlers.size > 0) {
		for (const handler of handlers) {
			try {
				handler(msg);
			} catch (err) {
				console.error(`[WS] Handler error for ${msg.type}:`, err);
			}
		}
	}

	// Skip invalidateAll for telnyx:* events — the dialer store handles them directly
	if (msg.type.startsWith('telnyx:')) {
		return;
	}

	// Default: full data refresh for other event types
	invalidateAll();
	refreshUnreadCount();
}
