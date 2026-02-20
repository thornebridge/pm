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
			role: body.role || null
		})
		.run();

	return json({ ok: true }, { status: 201 });
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
