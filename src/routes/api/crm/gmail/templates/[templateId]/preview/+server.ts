import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { emailTemplates } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { resolveMergeData, applyMergeFields } from '$lib/server/gmail/merge-fields.js';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { templateId } = event.params;

	const [template] = await db.select()
		.from(emailTemplates)
		.where(and(eq(emailTemplates.id, templateId), eq(emailTemplates.userId, user.id)));

	if (!template) {
		return new Response(JSON.stringify({ error: 'Template not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const body = await event.request.json();
	const { contactId, opportunityId } = body as { contactId: string; opportunityId?: string };

	const data = await resolveMergeData({ contactId, opportunityId });
	const subject = applyMergeFields(template.subjectTemplate, data);
	const bodyHtml = applyMergeFields(template.bodyTemplate, data).replace(/\n/g, '<br>');

	return Response.json({ subject, bodyHtml });
};
