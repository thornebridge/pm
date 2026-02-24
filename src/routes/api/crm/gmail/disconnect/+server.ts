import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { gmailIntegrations, gmailThreads, gmailMessages, gmailAttachments, gmailEntityLinks } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);

	// Delete all synced data for this user (cascades handle messages/attachments/links via thread FK)
	db.delete(gmailThreads).where(eq(gmailThreads.userId, user.id)).run();
	db.delete(gmailIntegrations).where(eq(gmailIntegrations.userId, user.id)).run();

	return new Response(JSON.stringify({ ok: true }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
