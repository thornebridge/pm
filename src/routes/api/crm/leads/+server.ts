import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmLeads, crmLeadStatuses, users } from '$lib/server/db/schema.js';
import { emitCrmAutomationEvent } from '$lib/server/crm-automations/emit.js';
import { indexDocument } from '$lib/server/search/meilisearch.js';
import { eq, like, desc, asc, sql, or, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const url = event.url;
	const q = url.searchParams.get('q');
	const statusId = url.searchParams.get('status');
	const owner = url.searchParams.get('owner');
	const source = url.searchParams.get('source');
	const converted = url.searchParams.get('converted');
	const sort = url.searchParams.get('sort') || 'created';
	const dir = url.searchParams.get('dir') || 'desc';
	const limit = parseInt(url.searchParams.get('limit') || '200');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	const conditions = [];

	// By default, hide converted leads unless explicitly requested
	if (converted !== 'true') {
		conditions.push(isNull(crmLeads.convertedAt));
	}

	if (q) {
		conditions.push(
			or(
				like(crmLeads.firstName, `%${q}%`),
				like(crmLeads.lastName, `%${q}%`),
				like(crmLeads.email, `%${q}%`),
				like(crmLeads.companyName, `%${q}%`)
			)
		);
	}
	if (statusId) conditions.push(eq(crmLeads.statusId, statusId));
	if (owner) conditions.push(eq(crmLeads.ownerId, owner));
	if (source) conditions.push(eq(crmLeads.source, source as any));

	const where = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

	const sortCol =
		sort === 'name'
			? crmLeads.lastName
			: sort === 'company'
				? crmLeads.companyName
				: sort === 'updated'
					? crmLeads.updatedAt
					: crmLeads.createdAt;
	const orderFn = dir === 'asc' ? asc : desc;

	let query = db
		.select({
			id: crmLeads.id,
			firstName: crmLeads.firstName,
			lastName: crmLeads.lastName,
			email: crmLeads.email,
			phone: crmLeads.phone,
			title: crmLeads.title,
			companyName: crmLeads.companyName,
			source: crmLeads.source,
			statusId: crmLeads.statusId,
			statusName: crmLeadStatuses.name,
			statusColor: crmLeadStatuses.color,
			ownerId: crmLeads.ownerId,
			ownerName: users.name,
			convertedAt: crmLeads.convertedAt,
			createdAt: crmLeads.createdAt
		})
		.from(crmLeads)
		.leftJoin(crmLeadStatuses, eq(crmLeads.statusId, crmLeadStatuses.id))
		.leftJoin(users, eq(crmLeads.ownerId, users.id))
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

	if (!body.firstName?.trim() || !body.lastName?.trim()) {
		return json({ error: 'First name and last name are required' }, { status: 400 });
	}
	if (!body.statusId) {
		return json({ error: 'Status is required' }, { status: 400 });
	}

	const now = Date.now();
	const lead = {
		id: nanoid(12),
		firstName: body.firstName.trim(),
		lastName: body.lastName.trim(),
		email: body.email || null,
		phone: body.phone || null,
		title: body.title || null,
		companyName: body.companyName || null,
		website: body.website || null,
		industry: body.industry || null,
		companySize: body.companySize || null,
		address: body.address || null,
		source: body.source || null,
		statusId: body.statusId,
		notes: body.notes || null,
		convertedAt: null,
		convertedCompanyId: null,
		convertedContactId: null,
		convertedOpportunityId: null,
		ownerId: body.ownerId || null,
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(crmLeads).values(lead);
	indexDocument('leads', {
		id: lead.id,
		firstName: lead.firstName,
		lastName: lead.lastName,
		email: lead.email,
		phone: lead.phone,
		title: lead.title,
		companyName: lead.companyName,
		source: lead.source,
		statusId: lead.statusId,
		ownerId: lead.ownerId,
		notes: lead.notes,
		updatedAt: lead.updatedAt,
		createdAt: lead.createdAt
	});

	emitCrmAutomationEvent({
		event: 'lead.created',
		entityType: 'lead',
		entityId: lead.id,
		entity: lead as unknown as Record<string, unknown>,
		userId: user.id
	});

	return json(lead, { status: 201 });
};
