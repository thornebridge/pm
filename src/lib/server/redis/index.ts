import Redis from 'ioredis';
import { env } from '$env/dynamic/private';

let redis: Redis | null = null;
let redisSub: Redis | null = null;
let connected = false;

export function getRedis(): Redis | null {
	if (redis) return redis;
	const url = env.REDIS_URL;
	if (!url) return null;
	try {
		redis = new Redis(url, {
			maxRetriesPerRequest: 3,
			retryStrategy(times) {
				if (times > 5) return null; // stop retrying
				return Math.min(times * 200, 2000);
			},
			lazyConnect: true
		});
		redis.on('error', (err) => {
			console.error('[redis] Connection error:', err.message);
		});
	} catch {
		redis = null;
	}
	return redis;
}

export function getRedisSubscriber(): Redis | null {
	if (redisSub) return redisSub;
	const url = env.REDIS_URL;
	if (!url) return null;
	try {
		redisSub = new Redis(url, {
			maxRetriesPerRequest: 3,
			retryStrategy(times) {
				if (times > 5) return null;
				return Math.min(times * 200, 2000);
			},
			lazyConnect: true
		});
		redisSub.on('error', (err) => {
			console.error('[redis-sub] Connection error:', err.message);
		});
	} catch {
		redisSub = null;
	}
	return redisSub;
}

export async function connectRedis(): Promise<void> {
	if (connected) return;
	const r = getRedis();
	if (!r) {
		console.log('[redis] No REDIS_URL set, running without Redis');
		return;
	}
	try {
		await r.connect();
		connected = true;
		console.log('[redis] Connected');
	} catch (err) {
		console.warn('[redis] Could not connect, falling back to in-memory:', (err as Error).message);
		redis = null;
	}
}

export function isRedisConnected(): boolean {
	return connected && redis !== null && redis.status === 'ready';
}
