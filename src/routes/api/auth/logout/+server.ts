import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession, deleteSessionCookie, getSessionCookie } from '$lib/server/auth/session.js';

export const POST: RequestHandler = async ({ cookies }) => {
	const sessionId = getSessionCookie(cookies);
	if (sessionId) {
		deleteSession(sessionId);
	}
	deleteSessionCookie(cookies);

	return json({ ok: true });
};
