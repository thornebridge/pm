import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { emailCampaigns, emailCampaignRecipients } from '$lib/server/db/schema.js';
import { eq, and, lt } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { campaignId } = event.params;

	const [campaign] = await db.select()
		.from(emailCampaigns)
		.where(and(eq(emailCampaigns.id, campaignId), eq(emailCampaigns.userId, user.id)));

	if (!campaign) {
		return new Response(JSON.stringify({ error: 'Campaign not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Reset failed recipients with retryCount < 3 to pending
	await db.update(emailCampaignRecipients)
		.set({ status: 'pending', errorMessage: null })
		.where(and(
			eq(emailCampaignRecipients.campaignId, campaignId),
			eq(emailCampaignRecipients.status, 'failed'),
			lt(emailCampaignRecipients.retryCount, 3)
		));

	// Recalculate failedCount
	const failedResult = await db.select({ count: sql<number>`count(*)` })
		.from(emailCampaignRecipients)
		.where(and(
			eq(emailCampaignRecipients.campaignId, campaignId),
			eq(emailCampaignRecipients.status, 'failed')
		))
		.then((r) => r[0]);

	await db.update(emailCampaigns)
		.set({
			status: 'queued',
			failedCount: failedResult?.count || 0,
			updatedAt: Date.now()
		})
		.where(eq(emailCampaigns.id, campaignId));

	return Response.json({ ok: true });
};
