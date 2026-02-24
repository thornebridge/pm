import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { gmailIntegrations } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { initialSync, incrementalSync } from '$lib/server/gmail/sync.js';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const [integration] = await db.select()
		.from(gmailIntegrations)
		.where(eq(gmailIntegrations.userId, user.id));

	if (!integration) {
		return new Response(JSON.stringify({ error: 'Gmail not connected' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		// Support ?full=true to force a full re-sync (clears historyId first)
		const forceFullSync = event.url.searchParams.get('full') === 'true';

		if (forceFullSync || !integration.historyId) {
			if (integration.historyId) {
				await db.update(gmailIntegrations)
					.set({ historyId: null, updatedAt: Date.now() })
					.where(eq(gmailIntegrations.userId, user.id));
			}
			await initialSync(user.id);
		} else {
			await incrementalSync(user.id);
		}

		return new Response(JSON.stringify({ ok: true }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('[gmail/sync] Manual sync failed:', err);
		return new Response(JSON.stringify({ error: 'Sync failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
