import type { Handle, HandleServerError } from '@sveltejs/kit';
import { getSessionCookie, validateSession } from '$lib/server/auth/session.js';
import { seed } from '$lib/server/db/seed.js';
import { checkRateLimit } from '$lib/server/security/rateLimit.js';
import { generateCsrfToken, validateCsrf } from '$lib/server/security/csrf.js';
import { startAutomationPoller } from '$lib/server/automations/polling.js';
import { startCrmAutomationPoller } from '$lib/server/crm-automations/polling.js';
import { startGmailSyncPoller } from '$lib/server/gmail/sync.js';
import { initSearchIndexes } from '$lib/server/search/reindex.js';
import { db } from '$lib/server/db/index.js';
import { users, userThemes } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getBuiltinTheme } from '$lib/server/theme/builtins.js';
import { reportError } from '@thornebridge/watchtower-client';

// Run seed on first request
let seeded = false;

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const handle: Handle = async ({ event, resolve }) => {
	if (!seeded) {
		await seed();
		initSearchIndexes().catch(() => {});
		startAutomationPoller(60_000);
		startCrmAutomationPoller(60_000);
		startGmailSyncPoller(120_000);
		seeded = true;
	}

	const sessionId = getSessionCookie(event.cookies);

	if (sessionId) {
		const result = await validateSession(sessionId);
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

	// Determine theme mode for SSR
	event.locals.themeMode = 'dark';
	if (event.locals.user) {
		const [userRow] = await db
			.select({ activeThemeId: users.activeThemeId })
			.from(users)
			.where(eq(users.id, event.locals.user.id));

		if (userRow?.activeThemeId) {
			const builtin = getBuiltinTheme(userRow.activeThemeId);
			if (builtin) {
				event.locals.themeMode = builtin.mode;
			} else {
				const [custom] = await db
					.select({ source: userThemes.source })
					.from(userThemes)
					.where(and(eq(userThemes.id, userRow.activeThemeId), eq(userThemes.userId, event.locals.user.id)));
				if (custom) {
					const modeMatch = custom.source.match(/mode:\s*(dark|light)/);
					event.locals.themeMode = (modeMatch?.[1] as 'dark' | 'light') || 'dark';
				}
			}
		}
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
			// Skip CSRF for login/register (no session yet), webhooks (external), and form actions
			const skipCsrf = event.url.pathname.startsWith('/api/auth/') || event.url.pathname.startsWith('/api/webhooks/');

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

	return resolve(event, {
		transformPageChunk: ({ html }) => {
			return html.replace('%pm.theme_class%', event.locals.themeMode);
		}
	});
};

export const handleError: HandleServerError = ({ error }) => {
	if (error instanceof Error) {
		reportError(error);
	}
};
