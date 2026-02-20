import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmCompanies, users } from '$lib/server/db/schema.js';
import { eq, like, desc, asc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const url = event.url;
	const q = url.searchParams.get('q');
	const owner = url.searchParams.get('owner');
	const industry = url.searchParams.get('industry');
	const sort = url.searchParams.get('sort') || 'created';
	const dir = url.searchParams.get('dir') || 'desc';
	const limit = parseInt(url.searchParams.get('limit') || '100');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	const conditions = [];
	if (q) conditions.push(like(crmCompanies.name, `%${q}%`));
	if (owner) conditions.push(eq(crmCompanies.ownerId, owner));
	if (industry) conditions.push(eq(crmCompanies.industry, industry));

	const where = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

	const sortCol =
		sort === 'name'
			? crmCompanies.name
			: sort === 'updated'
				? crmCompanies.updatedAt
				: crmCompanies.createdAt;
	const orderFn = dir === 'asc' ? asc : desc;

	let query = db
		.select({
			id: crmCompanies.id,
			name: crmCompanies.name,
			website: crmCompanies.website,
			industry: crmCompanies.industry,
			size: crmCompanies.size,
			phone: crmCompanies.phone,
			city: crmCompanies.city,
			state: crmCompanies.state,
			country: crmCompanies.country,
			ownerId: crmCompanies.ownerId,
			ownerName: users.name,
			createdAt: crmCompanies.createdAt,
			updatedAt: crmCompanies.updatedAt
		})
		.from(crmCompanies)
		.leftJoin(users, eq(crmCompanies.ownerId, users.id))
		.orderBy(orderFn(sortCol))
		.limit(limit)
		.offset(offset);

	if (where) {
		query = query.where(where) as typeof query;
	}

	const rows = query.all();
	return json(rows);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	if (!body.name?.trim()) {
		return json({ error: 'Company name is required' }, { status: 400 });
	}

	const now = Date.now();
	const company = {
		id: nanoid(12),
		name: body.name.trim(),
		website: body.website || null,
		industry: body.industry || null,
		size: body.size || null,
		phone: body.phone || null,
		address: body.address || null,
		city: body.city || null,
		state: body.state || null,
		country: body.country || 'US',
		notes: body.notes || null,
		ownerId: body.ownerId || null,
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	db.insert(crmCompanies).values(company).run();
	return json(company, { status: 201 });
};
