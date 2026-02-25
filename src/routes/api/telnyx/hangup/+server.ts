import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { getTelnyxConfig } from '$lib/server/telnyx/index.js';
import { getSession, removeSession, hangupCall } from '$lib/server/telnyx/callControl.js';

/** POST — hang up both legs of a server-side call session */
export const POST: RequestHandler = async (event) => {
	requireAuth(event);

	const config = await getTelnyxConfig();
	if (!config) {
		return json({ error: 'Telnyx integration is not configured' }, { status: 503 });
	}

	const body = await event.request.json();
	const { sessionId } = body;

	if (!sessionId) {
		return json({ error: 'sessionId is required' }, { status: 400 });
	}

	const session = getSession(sessionId);
	if (!session) {
		// Session may already be cleaned up — that's okay
		return json({ ok: true, message: 'Session not found (may already be ended)' });
	}

	const hangups: Promise<void>[] = [];
	if (session.legA) {
		hangups.push(hangupCall(config, session.legA.callControlId));
	}
	if (session.legB) {
		hangups.push(hangupCall(config, session.legB.callControlId));
	}

	await Promise.allSettled(hangups);
	removeSession(sessionId);

	return json({ ok: true });
};
