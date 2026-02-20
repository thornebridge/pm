import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmOpportunityItems } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { opportunityId, itemId } = event.params;

	const existing = db
		.select()
		.from(crmOpportunityItems)
		.where(
			and(
				eq(crmOpportunityItems.id, itemId),
				eq(crmOpportunityItems.opportunityId, opportunityId)
			)
		)
		.get();
	if (!existing) return json({ error: 'Item not found' }, { status: 404 });

	const body = await event.request.json();
	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	const fields = [
		'description', 'quantity', 'unitAmount', 'discountPercent',
		'discountAmount', 'setupFee', 'billingModel', 'billingInterval', 'position'
	];
	for (const f of fields) {
		if (f in body) updates[f] = body[f];
	}

	db.update(crmOpportunityItems).set(updates).where(eq(crmOpportunityItems.id, itemId)).run();
	const updated = db
		.select()
		.from(crmOpportunityItems)
		.where(eq(crmOpportunityItems.id, itemId))
		.get();
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { opportunityId, itemId } = event.params;

	const existing = db
		.select()
		.from(crmOpportunityItems)
		.where(
			and(
				eq(crmOpportunityItems.id, itemId),
				eq(crmOpportunityItems.opportunityId, opportunityId)
			)
		)
		.get();
	if (!existing) return json({ error: 'Item not found' }, { status: 404 });

	db.delete(crmOpportunityItems).where(eq(crmOpportunityItems.id, itemId)).run();
	return json({ ok: true });
};
