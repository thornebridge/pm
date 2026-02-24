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
import { createRevenueJournalEntry } from '$lib/server/financials/crm-sync.js';
import { emitCrmAutomationEvent } from '$lib/server/crm-automations/emit.js';
import { indexDocument, removeDocument } from '$lib/server/search/meilisearch.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { opportunityId } = event.params;

	const [opp] = await db
		.select()
		.from(crmOpportunities)
		.where(eq(crmOpportunities.id, opportunityId));
	if (!opp) return json({ error: 'Opportunity not found' }, { status: 404 });

	const [stage] = await db
		.select()
		.from(crmPipelineStages)
		.where(eq(crmPipelineStages.id, opp.stageId));

	const [company] = await db
		.select()
		.from(crmCompanies)
		.where(eq(crmCompanies.id, opp.companyId));

	const contact = opp.contactId
		? (await db.select().from(crmContacts).where(eq(crmContacts.id, opp.contactId)))[0]
		: null;

	const owner = opp.ownerId
		? (await db
				.select({ id: users.id, name: users.name })
				.from(users)
				.where(eq(users.id, opp.ownerId)))[0]
		: null;

	const linkedContacts = await db
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
		.where(eq(crmOpportunityContacts.opportunityId, opportunityId));

	const [proposalCount] = await db
		.select({ n: count() })
		.from(crmProposals)
		.where(eq(crmProposals.opportunityId, opportunityId));

	const [activityCount] = await db
		.select({ n: count() })
		.from(crmActivities)
		.where(eq(crmActivities.opportunityId, opportunityId));

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
	const user = requireAuth(event);
	const { opportunityId } = event.params;

	const [existing] = await db
		.select()
		.from(crmOpportunities)
		.where(eq(crmOpportunities.id, opportunityId));
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
		'forecastCategory',
		'ownerId',
		'nextStep',
		'nextStepDueDate'
	];
	for (const f of fields) {
		if (f in body) updates[f] = body[f];
	}

	// Handle stage change
	let stageIsWon = false;
	if ('stageId' in body && body.stageId !== existing.stageId) {
		updates.stageId = body.stageId;
		updates.stageEnteredAt = Date.now();

		const [newStage] = await db
			.select()
			.from(crmPipelineStages)
			.where(eq(crmPipelineStages.id, body.stageId));

		if (newStage?.isClosed && !existing.actualCloseDate) {
			updates.actualCloseDate = Date.now();
		} else if (!newStage?.isClosed && existing.actualCloseDate) {
			updates.actualCloseDate = null;
		}

		if (newStage?.isWon) {
			stageIsWon = true;
		}

		// Recalculate position in new stage
		if (!('position' in body)) {
			const [maxPos] = await db
				.select({ max: sql<number>`MAX(${crmOpportunities.position})` })
				.from(crmOpportunities)
				.where(eq(crmOpportunities.stageId, body.stageId));
			updates.position = (maxPos?.max ?? 0) + 1;
		}
	}

	if ('position' in body) {
		updates.position = body.position;
	}

	await db.update(crmOpportunities)
		.set(updates)
		.where(eq(crmOpportunities.id, opportunityId));

	// Auto-sync to Financials when opportunity is won
	if (stageIsWon && existing.value) {
		const [company] = await db
			.select({ name: crmCompanies.name })
			.from(crmCompanies)
			.where(eq(crmCompanies.id, existing.companyId));

		await createRevenueJournalEntry({
			opportunityId,
			companyId: existing.companyId,
			amount: existing.value,
			description: `Won: ${existing.title}${company ? ` (${company.name})` : ''}`,
			userId: user.id
		});
	}

	const [updated] = await db
		.select()
		.from(crmOpportunities)
		.where(eq(crmOpportunities.id, opportunityId));

	if (updated) indexDocument('opportunities', { id: updated.id, title: updated.title, description: updated.description, value: updated.value, currency: updated.currency, priority: updated.priority, source: updated.source, companyId: updated.companyId, stageId: updated.stageId, ownerId: updated.ownerId, nextStep: updated.nextStep, expectedCloseDate: updated.expectedCloseDate, updatedAt: updated.updatedAt });

	// Emit CRM automation events
	if (updated) {
		const updatedEntity = updated as unknown as Record<string, unknown>;
		if ('stageId' in body && body.stageId !== existing.stageId) {
			const [newStage] = await db.select().from(crmPipelineStages).where(eq(crmPipelineStages.id, body.stageId));
			if (newStage?.isWon) {
				emitCrmAutomationEvent({ event: 'opportunity.won', entityType: 'opportunity', entityId: opportunityId, entity: updatedEntity, changes: body, userId: user.id });
			} else if (newStage?.isClosed && !newStage?.isWon) {
				emitCrmAutomationEvent({ event: 'opportunity.lost', entityType: 'opportunity', entityId: opportunityId, entity: updatedEntity, changes: body, userId: user.id });
			}
			emitCrmAutomationEvent({ event: 'opportunity.stage_changed', entityType: 'opportunity', entityId: opportunityId, entity: updatedEntity, changes: { stageId: body.stageId }, userId: user.id });
		}
		if ('priority' in body && body.priority !== existing.priority) {
			emitCrmAutomationEvent({ event: 'opportunity.priority_changed', entityType: 'opportunity', entityId: opportunityId, entity: updatedEntity, changes: { priority: body.priority }, userId: user.id });
		}
		if ('ownerId' in body && body.ownerId !== existing.ownerId) {
			emitCrmAutomationEvent({ event: 'opportunity.owner_changed', entityType: 'opportunity', entityId: opportunityId, entity: updatedEntity, changes: { ownerId: body.ownerId }, userId: user.id });
		}
		if ('value' in body && body.value !== existing.value) {
			emitCrmAutomationEvent({ event: 'opportunity.value_changed', entityType: 'opportunity', entityId: opportunityId, entity: updatedEntity, changes: { value: body.value }, userId: user.id });
		}
	}

	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { opportunityId } = event.params;

	const [existing] = await db
		.select()
		.from(crmOpportunities)
		.where(eq(crmOpportunities.id, opportunityId));
	if (!existing) return json({ error: 'Opportunity not found' }, { status: 404 });

	await db.delete(crmOpportunities).where(eq(crmOpportunities.id, opportunityId));
	removeDocument('opportunities', opportunityId);
	return json({ ok: true });
};
