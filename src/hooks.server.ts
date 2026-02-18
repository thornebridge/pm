import type { Handle } from '@sveltejs/kit';
import { getSessionCookie, validateSession } from '$lib/server/auth/session.js';
import { seed } from '$lib/server/db/seed.js';

// Run seed on first request
let seeded = false;

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

	return resolve(event);
};
