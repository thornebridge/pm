import { getRedis, isRedisConnected } from '../redis/index.js';

// In-memory sliding window rate limiter (fallback when Redis unavailable)
const windows = new Map<string, { count: number; resetAt: number }>();

// Clean up stale entries periodically
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of windows) {
		if (entry.resetAt <= now) windows.delete(key);
	}
}, 60_000);

export function checkRateLimit(
	key: string,
	maxRequests: number = 60,
	windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
	// Try Redis for distributed rate limiting
	if (isRedisConnected()) {
		// We can't do async in a sync function, so fire-and-forget the Redis check
		// and use in-memory as the synchronous path.
		// For true Redis rate limiting, use checkRateLimitAsync.
	}

	// In-memory fallback (always available, works single-server)
	const now = Date.now();
	const entry = windows.get(key);

	if (!entry || entry.resetAt <= now) {
		windows.set(key, { count: 1, resetAt: now + windowMs });
		return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
	}

	entry.count++;
	const remaining = Math.max(0, maxRequests - entry.count);

	if (entry.count > maxRequests) {
		return { allowed: false, remaining: 0, resetAt: entry.resetAt };
	}

	return { allowed: true, remaining, resetAt: entry.resetAt };
}

/**
 * Async Redis-backed rate limiter. Uses INCR + PEXPIRE for atomic counters.
 * Falls back to in-memory if Redis is unavailable.
 */
export async function checkRateLimitAsync(
	key: string,
	maxRequests: number = 60,
	windowMs: number = 60_000
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
	if (isRedisConnected()) {
		const redis = getRedis();
		if (redis) {
			try {
				const redisKey = `ratelimit:${key}`;
				const count = await redis.incr(redisKey);
				if (count === 1) {
					await redis.pexpire(redisKey, windowMs);
				}
				const ttl = await redis.pttl(redisKey);
				const resetAt = Date.now() + Math.max(ttl, 0);
				const remaining = Math.max(0, maxRequests - count);

				return {
					allowed: count <= maxRequests,
					remaining,
					resetAt
				};
			} catch {
				// Fall through to in-memory
			}
		}
	}

	return checkRateLimit(key, maxRequests, windowMs);
}
