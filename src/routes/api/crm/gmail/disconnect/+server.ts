import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { gmailIntegrations, gmailThreads, gmailMessages, gmailAttachments, gmailEntityLinks } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { getSearchClient } from '$lib/server/search/meilisearch.js';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);

	// Collect thread IDs before deleting for search index cleanup
	const threadRows = await db.select({ id: gmailThreads.id }).from(gmailThreads).where(eq(gmailThreads.userId, user.id));
	const threadIds = threadRows.map((t) => t.id);

	// Delete all synced data for this user (cascades handle messages/attachments/links via thread FK)
	await db.delete(gmailThreads).where(eq(gmailThreads.userId, user.id));
	await db.delete(gmailIntegrations).where(eq(gmailIntegrations.userId, user.id));

	// Remove from search index
	if (threadIds.length > 0) {
		const client = getSearchClient();
		if (client) client.index('email_threads').deleteDocuments(threadIds).catch(() => {});
	}

	return new Response(JSON.stringify({ ok: true }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
