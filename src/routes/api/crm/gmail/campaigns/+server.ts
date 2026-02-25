import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	emailCampaigns,
	emailCampaignRecipients,
	emailTemplates,
	crmContacts
} from '$lib/server/db/schema.js';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const campaigns = await db.select({
		id: emailCampaigns.id,
		name: emailCampaigns.name,
		status: emailCampaigns.status,
		totalRecipients: emailCampaigns.totalRecipients,
		sentCount: emailCampaigns.sentCount,
		failedCount: emailCampaigns.failedCount,
		throttleMs: emailCampaigns.throttleMs,
		startedAt: emailCampaigns.startedAt,
		completedAt: emailCampaigns.completedAt,
		createdAt: emailCampaigns.createdAt,
		updatedAt: emailCampaigns.updatedAt,
		templateId: emailCampaigns.templateId,
		templateName: emailTemplates.name
	})
		.from(emailCampaigns)
		.leftJoin(emailTemplates, eq(emailCampaigns.templateId, emailTemplates.id))
		.where(eq(emailCampaigns.userId, user.id))
		.orderBy(desc(emailCampaigns.createdAt));

	return Response.json({ campaigns });
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();
	const { name, templateId, contactIds, opportunityId } = body as {
		name: string;
		templateId: string;
		contactIds: string[];
		opportunityId?: string;
	};

	if (!name?.trim() || !templateId || !contactIds?.length) {
		return new Response(JSON.stringify({ error: 'Name, template, and contacts are required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Verify template exists and belongs to user
	const [template] = await db.select()
		.from(emailTemplates)
		.where(and(eq(emailTemplates.id, templateId), eq(emailTemplates.userId, user.id)));

	if (!template) {
		return new Response(JSON.stringify({ error: 'Template not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Deduplicate contact IDs
	const uniqueContactIds = [...new Set(contactIds)];

	// Fetch contacts to check for emails
	const contacts = await db.select({ id: crmContacts.id, email: crmContacts.email })
		.from(crmContacts)
		.where(inArray(crmContacts.id, uniqueContactIds));

	const contactEmailMap = new Map(contacts.map((c) => [c.id, c.email]));

	const now = Date.now();
	const campaignId = nanoid(12);

	const campaign = {
		id: campaignId,
		userId: user.id,
		templateId,
		name: name.trim(),
		status: 'draft' as const,
		totalRecipients: uniqueContactIds.length,
		sentCount: 0,
		failedCount: 0,
		throttleMs: 2000,
		startedAt: null,
		completedAt: null,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(emailCampaigns).values(campaign);

	// Insert recipients
	const recipientValues = uniqueContactIds.map((contactId) => ({
		id: nanoid(12),
		campaignId,
		contactId,
		opportunityId: opportunityId || null,
		status: contactEmailMap.get(contactId) ? ('pending' as const) : ('skipped' as const),
		sentAt: null,
		gmailMessageId: null,
		gmailThreadId: null,
		errorMessage: contactEmailMap.get(contactId) ? null : 'No email address',
		retryCount: 0,
		createdAt: now
	}));

	if (recipientValues.length > 0) {
		await db.insert(emailCampaignRecipients).values(recipientValues);
	}

	return Response.json(campaign, { status: 201 });
};
