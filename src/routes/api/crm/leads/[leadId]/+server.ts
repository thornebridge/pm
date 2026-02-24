import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmLeads } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { indexDocument, removeDocument } from '$lib/server/search/meilisearch.js';
import { emitCrmAutomationEvent } from '$lib/server/crm-automations/emit.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { leadId } = event.params;

	const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, leadId));
	if (!lead) return json({ error: 'Lead not found' }, { status: 404 });

	return json(lead);
};

export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { leadId } = event.params;

	const [existing] = await db.select().from(crmLeads).where(eq(crmLeads.id, leadId));
	if (!existing) return json({ error: 'Lead not found' }, { status: 404 });

	const body = await event.request.json();
	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	const fields = [
		'firstName', 'lastName', 'email', 'phone', 'title',
		'companyName', 'website', 'industry', 'companySize', 'address',
		'source', 'statusId', 'notes', 'ownerId'
	];
	for (const f of fields) {
		if (f in body) updates[f] = body[f];
	}

	if ('firstName' in body && !body.firstName?.trim()) {
		return json({ error: 'First name is required' }, { status: 400 });
	}
	if ('lastName' in body && !body.lastName?.trim()) {
		return json({ error: 'Last name is required' }, { status: 400 });
	}

	await db.update(crmLeads).set(updates).where(eq(crmLeads.id, leadId));
	const [updated] = await db.select().from(crmLeads).where(eq(crmLeads.id, leadId));

	if (updated) {
		indexDocument('leads', {
			id: updated.id,
			firstName: updated.firstName,
			lastName: updated.lastName,
			email: updated.email,
			phone: updated.phone,
			title: updated.title,
			companyName: updated.companyName,
			source: updated.source,
			statusId: updated.statusId,
			ownerId: updated.ownerId,
			notes: updated.notes,
			convertedAt: updated.convertedAt,
			updatedAt: updated.updatedAt,
			createdAt: updated.createdAt
		});
	}

	// Emit automation events for tracked changes
	if ('statusId' in body && body.statusId !== existing.statusId) {
		emitCrmAutomationEvent({
			event: 'lead.status_changed',
			entityType: 'lead',
			entityId: leadId,
			entity: updated as unknown as Record<string, unknown>,
			changes: { statusId: body.statusId },
			userId: user.id
		});
	}
	if ('ownerId' in body && body.ownerId !== existing.ownerId) {
		emitCrmAutomationEvent({
			event: 'lead.owner_changed',
			entityType: 'lead',
			entityId: leadId,
			entity: updated as unknown as Record<string, unknown>,
			changes: { ownerId: body.ownerId },
			userId: user.id
		});
	}

	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { leadId } = event.params;

	const [existing] = await db.select().from(crmLeads).where(eq(crmLeads.id, leadId));
	if (!existing) return json({ error: 'Lead not found' }, { status: 404 });

	await db.delete(crmLeads).where(eq(crmLeads.id, leadId));
	removeDocument('leads', leadId);
	return json({ ok: true });
};
