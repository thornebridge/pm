declare global {
	// eslint-disable-next-line no-var
	var __wsBroadcast: ((projectId: string, event: unknown, excludeUserId?: string) => void) | undefined;
	// eslint-disable-next-line no-var
	var __wsBroadcastAll: ((event: unknown) => void) | undefined;
}

export function broadcast(projectId: string, event: { type: string; [key: string]: unknown }, excludeUserId?: string) {
	if (globalThis.__wsBroadcast) {
		globalThis.__wsBroadcast(projectId, event, excludeUserId);
	}
}

export function broadcastAll(event: { type: string; [key: string]: unknown }) {
	if (globalThis.__wsBroadcastAll) {
		globalThis.__wsBroadcastAll(event);
	}
}
