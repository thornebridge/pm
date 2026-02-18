declare global {
	// eslint-disable-next-line no-var
	var __wsBroadcast: ((projectId: string, event: unknown, excludeUserId?: string) => void) | undefined;
}

export function broadcast(projectId: string, event: { type: string; [key: string]: unknown }, excludeUserId?: string) {
	if (globalThis.__wsBroadcast) {
		globalThis.__wsBroadcast(projectId, event, excludeUserId);
	}
}
