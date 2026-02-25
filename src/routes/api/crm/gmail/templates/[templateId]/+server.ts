import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { emailTemplates, emailCampaigns } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
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

	return Response.json(template);
};

export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { templateId } = event.params;

	const [existing] = await db.select()
		.from(emailTemplates)
		.where(and(eq(emailTemplates.id, templateId), eq(emailTemplates.userId, user.id)));

	if (!existing) {
		return new Response(JSON.stringify({ error: 'Template not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const body = await event.request.json();
	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	if (body.name !== undefined) updates.name = body.name.trim();
	if (body.subjectTemplate !== undefined) updates.subjectTemplate = body.subjectTemplate.trim();
	if (body.bodyTemplate !== undefined) updates.bodyTemplate = body.bodyTemplate.trim();
	if (body.category !== undefined) updates.category = body.category?.trim() || null;

	await db.update(emailTemplates)
		.set(updates)
		.where(eq(emailTemplates.id, templateId));

	return Response.json({ ...existing, ...updates });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { templateId } = event.params;

	const [existing] = await db.select()
		.from(emailTemplates)
		.where(and(eq(emailTemplates.id, templateId), eq(emailTemplates.userId, user.id)));

	if (!existing) {
		return new Response(JSON.stringify({ error: 'Template not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Check if template is referenced by any campaign
	const [campaign] = await db.select({ id: emailCampaigns.id })
		.from(emailCampaigns)
		.where(eq(emailCampaigns.templateId, templateId))
		.limit(1);

	if (campaign) {
		return new Response(JSON.stringify({ error: 'Cannot delete template — it is used by a campaign' }), {
			status: 409,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	await db.delete(emailTemplates).where(eq(emailTemplates.id, templateId));

	return Response.json({ ok: true });
};
