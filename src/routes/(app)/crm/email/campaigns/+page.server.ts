import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { emailCampaigns, emailTemplates } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) redirect(302, '/login');

	const campaigns = await db.select({
		id: emailCampaigns.id,
		name: emailCampaigns.name,
		status: emailCampaigns.status,
		totalRecipients: emailCampaigns.totalRecipients,
		sentCount: emailCampaigns.sentCount,
		failedCount: emailCampaigns.failedCount,
		startedAt: emailCampaigns.startedAt,
		completedAt: emailCampaigns.completedAt,
		createdAt: emailCampaigns.createdAt,
		templateName: emailTemplates.name
	})
		.from(emailCampaigns)
		.leftJoin(emailTemplates, eq(emailCampaigns.templateId, emailTemplates.id))
		.where(eq(emailCampaigns.userId, event.locals.user.id))
		.orderBy(desc(emailCampaigns.createdAt));

	return { campaigns };
};
