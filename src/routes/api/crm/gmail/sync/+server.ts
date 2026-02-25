import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { gmailIntegrations } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { initialSync, incrementalSync } from '$lib/server/gmail/sync.js';
import { GmailAuthError, GmailApiError } from '$lib/server/gmail/gmail-api.js';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const [integration] = await db.select()
		.from(gmailIntegrations)
		.where(eq(gmailIntegrations.userId, user.id));

	if (!integration) {
		return Response.json({ error: 'Gmail not connected' }, { status: 400 });
	}

	const now = Date.now();

	try {
		await db.update(gmailIntegrations)
			.set({ syncStatus: 'syncing', updatedAt: now })
			.where(eq(gmailIntegrations.userId, user.id));

		// Support ?full=true to force a full re-sync (clears historyId first)
		const forceFullSync = event.url.searchParams.get('full') === 'true';

		if (forceFullSync || !integration.historyId) {
			if (integration.historyId) {
				await db.update(gmailIntegrations)
					.set({ historyId: null, updatedAt: now })
					.where(eq(gmailIntegrations.userId, user.id));
			}
			await initialSync(user.id);
		} else {
			await incrementalSync(user.id);
		}

		await db.update(gmailIntegrations)
			.set({ syncStatus: 'ok', syncError: null, lastSyncAt: now, updatedAt: now })
			.where(eq(gmailIntegrations.userId, user.id));

		return Response.json({ ok: true });
	} catch (err) {
		let errorMsg: string;
		let status = 500;

		if (err instanceof GmailAuthError) {
			errorMsg = err.message;
			status = 401;
		} else if (err instanceof GmailApiError) {
			errorMsg = err.message;
			status = err.status >= 400 ? err.status : 502;
		} else {
			errorMsg = err instanceof Error ? err.message : 'Unknown sync error';
		}

		console.error('[gmail/sync] Manual sync failed:', errorMsg);

		await db.update(gmailIntegrations)
			.set({ syncStatus: 'error', syncError: errorMsg, updatedAt: Date.now() })
			.where(eq(gmailIntegrations.userId, user.id));

		return Response.json({ error: errorMsg }, { status });
	}
};
