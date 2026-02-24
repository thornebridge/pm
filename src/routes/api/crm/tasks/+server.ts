import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	crmTasks,
	crmCompanies,
	crmContacts,
	crmOpportunities,
	users
} from '$lib/server/db/schema.js';
import { eq, desc, asc, and, isNull, isNotNull, lte, gte } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const url = event.url;
	const assignee = url.searchParams.get('assignee');
	const status = url.searchParams.get('status');
	const priority = url.searchParams.get('priority');
	const companyId = url.searchParams.get('company');
	const contactId = url.searchParams.get('contact');
	const opportunityId = url.searchParams.get('opportunity');
	const dueBefore = url.searchParams.get('dueBefore');
	const dueAfter = url.searchParams.get('dueAfter');
	const sort = url.searchParams.get('sort') || 'due';
	const dir = url.searchParams.get('dir') || 'asc';
	const limit = parseInt(url.searchParams.get('limit') || '100');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	const conditions = [];
	if (assignee) conditions.push(eq(crmTasks.assigneeId, assignee));
	if (status === 'open') conditions.push(isNull(crmTasks.completedAt));
	if (status === 'completed') conditions.push(isNotNull(crmTasks.completedAt));
	if (priority) conditions.push(eq(crmTasks.priority, priority as 'urgent' | 'high' | 'medium' | 'low'));
	if (companyId) conditions.push(eq(crmTasks.companyId, companyId));
	if (contactId) conditions.push(eq(crmTasks.contactId, contactId));
	if (opportunityId) conditions.push(eq(crmTasks.opportunityId, opportunityId));
	if (dueBefore) conditions.push(lte(crmTasks.dueDate, parseInt(dueBefore)));
	if (dueAfter) conditions.push(gte(crmTasks.dueDate, parseInt(dueAfter)));

	const where = conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined;

	const sortCol =
		sort === 'due'
			? crmTasks.dueDate
			: sort === 'priority'
				? crmTasks.priority
				: crmTasks.createdAt;
	const orderFn = dir === 'asc' ? asc : desc;

	let query = db
		.select({
			id: crmTasks.id,
			title: crmTasks.title,
			description: crmTasks.description,
			dueDate: crmTasks.dueDate,
			completedAt: crmTasks.completedAt,
			priority: crmTasks.priority,
			companyId: crmTasks.companyId,
			companyName: crmCompanies.name,
			contactId: crmTasks.contactId,
			opportunityId: crmTasks.opportunityId,
			assigneeId: crmTasks.assigneeId,
			assigneeName: users.name,
			createdAt: crmTasks.createdAt
		})
		.from(crmTasks)
		.leftJoin(crmCompanies, eq(crmTasks.companyId, crmCompanies.id))
		.leftJoin(users, eq(crmTasks.assigneeId, users.id))
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

	const now = Date.now();
	const task = {
		id: nanoid(12),
		title: body.title.trim(),
		description: body.description || null,
		dueDate: body.dueDate ?? null,
		completedAt: null,
		priority: body.priority || 'medium',
		companyId: body.companyId || null,
		contactId: body.contactId || null,
		opportunityId: body.opportunityId || null,
		assigneeId: body.assigneeId || user.id,
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(crmTasks).values(task);
	return json(task, { status: 201 });
};
