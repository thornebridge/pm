import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { emailCampaigns, emailCampaignRecipients, emailTemplates, crmContacts } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) redirect(302, '/login');

	const { campaignId } = event.params;

	const [campaign] = await db.select({
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
		templateName: emailTemplates.name
	})
		.from(emailCampaigns)
		.leftJoin(emailTemplates, eq(emailCampaigns.templateId, emailTemplates.id))
		.where(and(eq(emailCampaigns.id, campaignId), eq(emailCampaigns.userId, event.locals.user.id)));

	if (!campaign) error(404, 'Campaign not found');

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

	return { campaign, recipients };
};
