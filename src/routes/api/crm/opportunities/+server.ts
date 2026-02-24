import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	crmOpportunities,
	crmCompanies,
	crmContacts,
	crmPipelineStages,
	users
} from '$lib/server/db/schema.js';
import { eq, like, desc, asc, sql, and, lte, gte } from 'drizzle-orm';
import { indexDocument } from '$lib/server/search/meilisearch.js';
import { nanoid } from 'nanoid';
import { emitCrmAutomationEvent } from '$lib/server/crm-automations/emit.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const url = event.url;
	const q = url.searchParams.get('q');
	const stage = url.searchParams.get('stage');
	const owner = url.searchParams.get('owner');
	const company = url.searchParams.get('company');
	const priority = url.searchParams.get('priority');
	const source = url.searchParams.get('source');
	const closeBefore = url.searchParams.get('closeBefore');
	const closeAfter = url.searchParams.get('closeAfter');
	const sort = url.searchParams.get('sort') || 'created';
	const dir = url.searchParams.get('dir') || 'desc';
	const limit = parseInt(url.searchParams.get('limit') || '100');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	const conditions = [];
	if (q) conditions.push(like(crmOpportunities.title, `%${q}%`));
	if (stage) conditions.push(eq(crmOpportunities.stageId, stage));
	if (owner) conditions.push(eq(crmOpportunities.ownerId, owner));
	if (company) conditions.push(eq(crmOpportunities.companyId, company));
	if (priority) conditions.push(eq(crmOpportunities.priority, priority as 'hot' | 'warm' | 'cold'));
	if (source) conditions.push(eq(crmOpportunities.source, source as 'referral' | 'inbound' | 'outbound' | 'website' | 'event' | 'partner' | 'other'));
	if (closeBefore)
		conditions.push(lte(crmOpportunities.expectedCloseDate, parseInt(closeBefore)));
	if (closeAfter)
		conditions.push(gte(crmOpportunities.expectedCloseDate, parseInt(closeAfter)));

	const where =
		conditions.length > 0
			? conditions.length === 1
				? conditions[0]
				: and(...conditions)
			: undefined;

	const sortCol =
		sort === 'title'
			? crmOpportunities.title
			: sort === 'value'
				? crmOpportunities.value
				: sort === 'closeDate'
					? crmOpportunities.expectedCloseDate
					: crmOpportunities.createdAt;
	const orderFn = dir === 'asc' ? asc : desc;

	let query = db
		.select({
			id: crmOpportunities.id,
			title: crmOpportunities.title,
			companyId: crmOpportunities.companyId,
			companyName: crmCompanies.name,
			contactId: crmOpportunities.contactId,
			stageId: crmOpportunities.stageId,
			stageName: crmPipelineStages.name,
			stageColor: crmPipelineStages.color,
			stageClosed: crmPipelineStages.isClosed,
			value: crmOpportunities.value,
			currency: crmOpportunities.currency,
			probability: crmOpportunities.probability,
			expectedCloseDate: crmOpportunities.expectedCloseDate,
			priority: crmOpportunities.priority,
			source: crmOpportunities.source,
			position: crmOpportunities.position,
			ownerId: crmOpportunities.ownerId,
			ownerName: users.name,
			createdAt: crmOpportunities.createdAt
		})
		.from(crmOpportunities)
		.innerJoin(crmCompanies, eq(crmOpportunities.companyId, crmCompanies.id))
		.innerJoin(crmPipelineStages, eq(crmOpportunities.stageId, crmPipelineStages.id))
		.leftJoin(users, eq(crmOpportunities.ownerId, users.id))
		.orderBy(orderFn(sortCol))
		.limit(limit)
		.offset(offset);

	if (where) {
		query = query.where(where) as typeof query;
	}

	const rows = await query;
	return json(rows);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	if (!body.title?.trim()) {
		return json({ error: 'Title is required' }, { status: 400 });
	}
	if (!body.companyId) {
		return json({ error: 'Company is required' }, { status: 400 });
	}

	// Default to first stage if not provided
	let stageId = body.stageId;
	if (!stageId) {
		const [firstStage] = await db
			.select({ id: crmPipelineStages.id })
			.from(crmPipelineStages)
			.orderBy(asc(crmPipelineStages.position))
			.limit(1);
		stageId = firstStage?.id;
	}

	if (!stageId) {
		return json({ error: 'No pipeline stages configured' }, { status: 400 });
	}

	// Calculate position within stage
	const [maxPos] = await db
		.select({ max: sql<number>`MAX(${crmOpportunities.position})` })
		.from(crmOpportunities)
		.where(eq(crmOpportunities.stageId, stageId));

	const now = Date.now();
	const opp = {
		id: nanoid(12),
		title: body.title.trim(),
		companyId: body.companyId,
		contactId: body.contactId || null,
		stageId,
		value: body.value ?? null,
		currency: body.currency || 'USD',
		probability: body.probability ?? null,
		expectedCloseDate: body.expectedCloseDate ?? null,
		actualCloseDate: null,
		priority: body.priority || 'warm',
		source: body.source || null,
		description: body.description || null,
		lostReason: null,
		nextStep: body.nextStep || null,
		nextStepDueDate: body.nextStepDueDate ?? null,
		stageEnteredAt: now,
		position: (maxPos?.max ?? 0) + 1,
		ownerId: body.ownerId || null,
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(crmOpportunities).values(opp);
	indexDocument('opportunities', { id: opp.id, title: opp.title, description: opp.description, value: opp.value, currency: opp.currency, priority: opp.priority, source: opp.source, companyId: opp.companyId, stageId: opp.stageId, ownerId: opp.ownerId, nextStep: opp.nextStep, expectedCloseDate: opp.expectedCloseDate, updatedAt: opp.updatedAt });

	emitCrmAutomationEvent({
		event: 'opportunity.created',
		entityType: 'opportunity',
		entityId: opp.id,
		entity: opp as unknown as Record<string, unknown>,
		userId: user.id
	});

	return json(opp, { status: 201 });
};
