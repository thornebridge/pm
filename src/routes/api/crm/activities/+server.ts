import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	crmActivities,
	crmCompanies,
	crmContacts,
	crmOpportunities,
	users
} from '$lib/server/db/schema.js';
import { eq, desc, asc, and, lte, gte } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { emitCrmAutomationEvent } from '$lib/server/crm-automations/emit.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const url = event.url;
	const type = url.searchParams.get('type');
	const userId = url.searchParams.get('user');
	const companyId = url.searchParams.get('company');
	const contactId = url.searchParams.get('contact');
	const opportunityId = url.searchParams.get('opportunity');
	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');
	const sort = url.searchParams.get('sort') || 'created';
	const dir = url.searchParams.get('dir') || 'desc';
	const limit = parseInt(url.searchParams.get('limit') || '50');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	const conditions = [];
	if (type) conditions.push(eq(crmActivities.type, type as 'call' | 'email' | 'meeting' | 'note'));
	if (userId) conditions.push(eq(crmActivities.userId, userId));
	if (companyId) conditions.push(eq(crmActivities.companyId, companyId));
	if (contactId) conditions.push(eq(crmActivities.contactId, contactId));
	if (opportunityId) conditions.push(eq(crmActivities.opportunityId, opportunityId));
	if (dateFrom) conditions.push(gte(crmActivities.createdAt, parseInt(dateFrom)));
	if (dateTo) conditions.push(lte(crmActivities.createdAt, parseInt(dateTo)));

	const where = conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined;

	const sortCol = sort === 'scheduled' ? crmActivities.scheduledAt : crmActivities.createdAt;
	const orderFn = dir === 'asc' ? asc : desc;

	let query = db
		.select({
			id: crmActivities.id,
			type: crmActivities.type,
			subject: crmActivities.subject,
			description: crmActivities.description,
			companyId: crmActivities.companyId,
			companyName: crmCompanies.name,
			contactId: crmActivities.contactId,
			opportunityId: crmActivities.opportunityId,
			scheduledAt: crmActivities.scheduledAt,
			completedAt: crmActivities.completedAt,
			durationMinutes: crmActivities.durationMinutes,
			userId: crmActivities.userId,
			userName: users.name,
			createdAt: crmActivities.createdAt
		})
		.from(crmActivities)
		.innerJoin(users, eq(crmActivities.userId, users.id))
		.leftJoin(crmCompanies, eq(crmActivities.companyId, crmCompanies.id))
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

	if (!body.type || !body.subject?.trim()) {
		return json({ error: 'Type and subject are required' }, { status: 400 });
	}

	const now = Date.now();
	const activity = {
		id: nanoid(12),
		type: body.type,
		subject: body.subject.trim(),
		description: body.description || null,
		companyId: body.companyId || null,
		contactId: body.contactId || null,
		opportunityId: body.opportunityId || null,
		scheduledAt: body.scheduledAt ?? null,
		completedAt: body.completedAt ?? null,
		durationMinutes: body.durationMinutes ?? null,
		userId: user.id,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(crmActivities).values(activity);

	emitCrmAutomationEvent({
		event: 'activity.logged',
		entityType: 'activity',
		entityId: activity.id,
		entity: activity as unknown as Record<string, unknown>,
		userId: user.id
	});

	return json(activity, { status: 201 });
};
