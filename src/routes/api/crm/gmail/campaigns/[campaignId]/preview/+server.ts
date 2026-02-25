import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { emailCampaigns, emailTemplates } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { resolveMergeData, applyMergeFields } from '$lib/server/gmail/merge-fields.js';

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

	const [template] = await db.select()
		.from(emailTemplates)
		.where(eq(emailTemplates.id, campaign.templateId));

	if (!template) {
		return new Response(JSON.stringify({ error: 'Template not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const body = await event.request.json();
	const { contactId } = body as { contactId: string };

	const data = await resolveMergeData({ contactId });
	const subject = applyMergeFields(template.subjectTemplate, data);
	const bodyHtml = applyMergeFields(template.bodyTemplate, data).replace(/\n/g, '<br>');

	return Response.json({ subject, bodyHtml });
};
