import { getRedis, isRedisConnected } from '../redis/index.js';

declare global {
	// eslint-disable-next-line no-var
	var __wsBroadcast: ((projectId: string, event: unknown, excludeUserId?: string) => void) | undefined;
	// eslint-disable-next-line no-var
	var __wsBroadcastAll: ((event: unknown) => void) | undefined;
}

export function broadcast(projectId: string, event: { type: string; [key: string]: unknown }, excludeUserId?: string) {
	// Always do local broadcast (handles single-instance and local clients)
	if (globalThis.__wsBroadcast) {
		globalThis.__wsBroadcast(projectId, event, excludeUserId);
	}

	// Also publish to Redis for multi-instance support
	if (isRedisConnected()) {
		const redis = getRedis();
		if (redis) {
			redis.publish('ws:project', JSON.stringify({ projectId, event, excludeUserId })).catch(() => {});
		}
	}
}

export function broadcastAll(event: { type: string; [key: string]: unknown }) {
	// Always do local broadcast
	if (globalThis.__wsBroadcastAll) {
		globalThis.__wsBroadcastAll(event);
	}

	// Also publish to Redis for multi-instance support
	if (isRedisConnected()) {
		const redis = getRedis();
		if (redis) {
			redis.publish('ws:all', JSON.stringify({ event })).catch(() => {});
		}
	}
}
