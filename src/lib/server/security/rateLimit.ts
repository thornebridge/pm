// In-memory sliding window rate limiter
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
