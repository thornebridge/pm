import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmOpportunityContacts, crmContacts } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { opportunityId } = event.params;

	const linked = db
		.select({
			contactId: crmOpportunityContacts.contactId,
			role: crmOpportunityContacts.role,
			influence: crmOpportunityContacts.influence,
			sentiment: crmOpportunityContacts.sentiment,
			notes: crmOpportunityContacts.notes,
			firstName: crmContacts.firstName,
			lastName: crmContacts.lastName,
			email: crmContacts.email,
			title: crmContacts.title
		})
		.from(crmOpportunityContacts)
		.innerJoin(crmContacts, eq(crmOpportunityContacts.contactId, crmContacts.id))
		.where(eq(crmOpportunityContacts.opportunityId, opportunityId))
		.all();

	return json(linked);
};

export const POST: RequestHandler = async (event) => {
	requireAuth(event);
	const { opportunityId } = event.params;
	const body = await event.request.json();

	if (!body.contactId) {
		return json({ error: 'Contact ID is required' }, { status: 400 });
	}

	db.insert(crmOpportunityContacts)
		.values({
			opportunityId,
			contactId: body.contactId,
			role: body.role || null,
			influence: body.influence || null,
			sentiment: body.sentiment || null,
			notes: body.notes || null
		})
		.run();

	return json({ ok: true }, { status: 201 });
};

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { opportunityId } = event.params;
	const body = await event.request.json();

	if (!body.contactId) {
		return json({ error: 'Contact ID is required' }, { status: 400 });
	}

	const updates: Record<string, unknown> = {};
	if ('role' in body) updates.role = body.role || null;
	if ('influence' in body) updates.influence = body.influence || null;
	if ('sentiment' in body) updates.sentiment = body.sentiment || null;
	if ('notes' in body) updates.notes = body.notes || null;

	if (Object.keys(updates).length > 0) {
		db.update(crmOpportunityContacts)
			.set(updates)
			.where(
				and(
					eq(crmOpportunityContacts.opportunityId, opportunityId),
					eq(crmOpportunityContacts.contactId, body.contactId)
				)
			)
			.run();
	}

	return json({ ok: true });
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { opportunityId } = event.params;
	const body = await event.request.json();

	if (!body.contactId) {
		return json({ error: 'Contact ID is required' }, { status: 400 });
	}

	db.delete(crmOpportunityContacts)
		.where(
			and(
				eq(crmOpportunityContacts.opportunityId, opportunityId),
				eq(crmOpportunityContacts.contactId, body.contactId)
			)
		)
		.run();

	return json({ ok: true });
};
