import type { Handle } from '@sveltejs/kit';
import { getSessionCookie, validateSession } from '$lib/server/auth/session.js';
import { seed } from '$lib/server/db/seed.js';
import { checkRateLimit } from '$lib/server/security/rateLimit.js';
import { generateCsrfToken, validateCsrf } from '$lib/server/security/csrf.js';

// Run seed on first request
let seeded = false;

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const handle: Handle = async ({ event, resolve }) => {
	if (!seeded) {
		await seed();
		seeded = true;
	}

	const sessionId = getSessionCookie(event.cookies);

	if (sessionId) {
		const result = validateSession(sessionId);
		if (result) {
			event.locals.user = result.user;
			event.locals.sessionId = result.sessionId;
		} else {
			event.locals.user = null;
			event.locals.sessionId = null;
		}
	} else {
		event.locals.user = null;
		event.locals.sessionId = null;
	}

	// Rate limiting on API routes
	if (event.url.pathname.startsWith('/api/')) {
		const key = event.locals.user?.id || event.getClientAddress();
		const { allowed, remaining, resetAt } = checkRateLimit(`api:${key}`, 120, 60_000);

		if (!allowed) {
			return new Response(JSON.stringify({ error: 'Too many requests' }), {
				status: 429,
				headers: {
					'Content-Type': 'application/json',
					'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
					'X-RateLimit-Remaining': '0'
				}
			});
		}

		// Stricter limit for auth endpoints
		if (event.url.pathname.startsWith('/api/auth/')) {
			const authLimit = checkRateLimit(`auth:${event.getClientAddress()}`, 10, 60_000);
			if (!authLimit.allowed) {
				return new Response(JSON.stringify({ error: 'Too many requests' }), {
					status: 429,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}

		// CSRF validation for mutations on API routes
		if (MUTATION_METHODS.has(event.request.method)) {
			// Skip CSRF for login/register (no session yet) and form actions
			const skipCsrf = event.url.pathname.startsWith('/api/auth/');

			if (!skipCsrf && event.locals.user) {
				if (!validateCsrf(event.cookies, event.request)) {
					return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
						status: 403,
						headers: { 'Content-Type': 'application/json' }
					});
				}
			}
		}
	}

	// Generate CSRF token for all authenticated requests
	if (event.locals.user) {
		generateCsrfToken(event.cookies);
	}

	return resolve(event);
};
