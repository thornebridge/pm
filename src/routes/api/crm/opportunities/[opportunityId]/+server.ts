import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	crmOpportunities,
	crmPipelineStages,
	crmCompanies,
	crmContacts,
	crmOpportunityContacts,
	crmActivities,
	crmProposals,
	crmTasks,
	users
} from '$lib/server/db/schema.js';
import { eq, count, desc, sql } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { opportunityId } = event.params;

	const opp = db
		.select()
		.from(crmOpportunities)
		.where(eq(crmOpportunities.id, opportunityId))
		.get();
	if (!opp) return json({ error: 'Opportunity not found' }, { status: 404 });

	const stage = db
		.select()
		.from(crmPipelineStages)
		.where(eq(crmPipelineStages.id, opp.stageId))
		.get();

	const company = db
		.select()
		.from(crmCompanies)
		.where(eq(crmCompanies.id, opp.companyId))
		.get();

	const contact = opp.contactId
		? db.select().from(crmContacts).where(eq(crmContacts.id, opp.contactId)).get()
		: null;

	const owner = opp.ownerId
		? db
				.select({ id: users.id, name: users.name })
				.from(users)
				.where(eq(users.id, opp.ownerId))
				.get()
		: null;

	const linkedContacts = db
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

	const proposalCount = db
		.select({ n: count() })
		.from(crmProposals)
		.where(eq(crmProposals.opportunityId, opportunityId))
		.get();

	const activityCount = db
		.select({ n: count() })
		.from(crmActivities)
		.where(eq(crmActivities.opportunityId, opportunityId))
		.get();

	return json({
		...opp,
		stage,
		company,
		contact,
		owner,
		linkedContacts,
		proposalCount: proposalCount?.n || 0,
		activityCount: activityCount?.n || 0
	});
};

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { opportunityId } = event.params;

	const existing = db
		.select()
		.from(crmOpportunities)
		.where(eq(crmOpportunities.id, opportunityId))
		.get();
	if (!existing) return json({ error: 'Opportunity not found' }, { status: 404 });

	const body = await event.request.json();
	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	const fields = [
		'title',
		'companyId',
		'contactId',
		'value',
		'currency',
		'probability',
		'expectedCloseDate',
		'priority',
		'source',
		'description',
		'lostReason',
		'ownerId'
	];
	for (const f of fields) {
		if (f in body) updates[f] = body[f];
	}

	// Handle stage change
	if ('stageId' in body && body.stageId !== existing.stageId) {
		updates.stageId = body.stageId;

		const newStage = db
			.select()
			.from(crmPipelineStages)
			.where(eq(crmPipelineStages.id, body.stageId))
			.get();

		if (newStage?.isClosed && !existing.actualCloseDate) {
			updates.actualCloseDate = Date.now();
		} else if (!newStage?.isClosed && existing.actualCloseDate) {
			updates.actualCloseDate = null;
		}

		// Recalculate position in new stage
		if (!('position' in body)) {
			const maxPos = db
				.select({ max: sql<number>`MAX(${crmOpportunities.position})` })
				.from(crmOpportunities)
				.where(eq(crmOpportunities.stageId, body.stageId))
				.get();
			updates.position = (maxPos?.max ?? 0) + 1;
		}
	}

	if ('position' in body) {
		updates.position = body.position;
	}

	db.update(crmOpportunities)
		.set(updates)
		.where(eq(crmOpportunities.id, opportunityId))
		.run();

	const updated = db
		.select()
		.from(crmOpportunities)
		.where(eq(crmOpportunities.id, opportunityId))
		.get();
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { opportunityId } = event.params;

	const existing = db
		.select()
		.from(crmOpportunities)
		.where(eq(crmOpportunities.id, opportunityId))
		.get();
	if (!existing) return json({ error: 'Opportunity not found' }, { status: 404 });

	db.delete(crmOpportunities).where(eq(crmOpportunities.id, opportunityId)).run();
	return json({ ok: true });
};
