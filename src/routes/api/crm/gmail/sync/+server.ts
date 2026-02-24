import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { gmailIntegrations } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { initialSync, incrementalSync } from '$lib/server/gmail/sync.js';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const integration = db.select()
		.from(gmailIntegrations)
		.where(eq(gmailIntegrations.userId, user.id))
		.get();

	if (!integration) {
		return new Response(JSON.stringify({ error: 'Gmail not connected' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		if (integration.historyId) {
			await incrementalSync(user.id);
		} else {
			await initialSync(user.id);
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
