import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { emailCampaigns, emailCampaignRecipients, crmContacts } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
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

	// Get recipients with contact info
	const recipients = await db.select({
		id: emailCampaignRecipients.id,
		contactId: emailCampaignRecipients.contactId,
		status: emailCampaignRecipients.status,
		sentAt: emailCampaignRecipients.sentAt,
		errorMessage: emailCampaignRecipients.errorMessage,
		retryCount: emailCampaignRecipients.retryCount,
		firstName: crmContacts.firstName,
		lastName: crmContacts.lastName,
		email: crmContacts.email
	})
		.from(emailCampaignRecipients)
		.leftJoin(crmContacts, eq(emailCampaignRecipients.contactId, crmContacts.id))
		.where(eq(emailCampaignRecipients.campaignId, campaignId));

	return Response.json({ campaign, recipients });
};

export const PATCH: RequestHandler = async (event) => {
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

	const body = await event.request.json();
	const { status } = body as { status: string };

	const now = Date.now();

	if (status === 'queued') {
		if (!['draft', 'paused'].includes(campaign.status)) {
			return new Response(JSON.stringify({ error: `Cannot start campaign in ${campaign.status} state` }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		await db.update(emailCampaigns)
			.set({ status: 'queued', startedAt: campaign.startedAt || now, updatedAt: now })
			.where(eq(emailCampaigns.id, campaignId));
	} else if (status === 'paused') {
		if (campaign.status !== 'sending') {
			return new Response(JSON.stringify({ error: 'Can only pause a sending campaign' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		await db.update(emailCampaigns)
			.set({ status: 'paused', updatedAt: now })
			.where(eq(emailCampaigns.id, campaignId));
	} else {
		return new Response(JSON.stringify({ error: 'Invalid status transition' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return Response.json({ ok: true });
};

export const DELETE: RequestHandler = async (event) => {
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

	if (campaign.status !== 'draft') {
		return new Response(JSON.stringify({ error: 'Can only delete draft campaigns' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	await db.delete(emailCampaigns).where(eq(emailCampaigns.id, campaignId));
	return Response.json({ ok: true });
};
