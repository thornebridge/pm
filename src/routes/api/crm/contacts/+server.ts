import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmContacts, crmCompanies, users } from '$lib/server/db/schema.js';
import { eq, like, desc, asc, sql, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const url = event.url;
	const q = url.searchParams.get('q');
	const companyId = url.searchParams.get('company');
	const owner = url.searchParams.get('owner');
	const source = url.searchParams.get('source');
	const sort = url.searchParams.get('sort') || 'created';
	const dir = url.searchParams.get('dir') || 'desc';
	const limit = parseInt(url.searchParams.get('limit') || '100');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	const conditions = [];
	if (q) {
		conditions.push(
			or(
				like(crmContacts.firstName, `%${q}%`),
				like(crmContacts.lastName, `%${q}%`),
				like(crmContacts.email, `%${q}%`)
			)
		);
	}
	if (companyId) conditions.push(eq(crmContacts.companyId, companyId));
	if (owner) conditions.push(eq(crmContacts.ownerId, owner));
	if (source) conditions.push(eq(crmContacts.source, source as 'referral' | 'inbound' | 'outbound' | 'website' | 'event' | 'other'));

	const where = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

	const sortCol =
		sort === 'name'
			? crmContacts.lastName
			: sort === 'updated'
				? crmContacts.updatedAt
				: crmContacts.createdAt;
	const orderFn = dir === 'asc' ? asc : desc;

	let query = db
		.select({
			id: crmContacts.id,
			firstName: crmContacts.firstName,
			lastName: crmContacts.lastName,
			email: crmContacts.email,
			phone: crmContacts.phone,
			title: crmContacts.title,
			isPrimary: crmContacts.isPrimary,
			source: crmContacts.source,
			companyId: crmContacts.companyId,
			companyName: crmCompanies.name,
			ownerId: crmContacts.ownerId,
			ownerName: users.name,
			createdAt: crmContacts.createdAt
		})
		.from(crmContacts)
		.leftJoin(crmCompanies, eq(crmContacts.companyId, crmCompanies.id))
		.leftJoin(users, eq(crmContacts.ownerId, users.id))
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

	if (!body.firstName?.trim() || !body.lastName?.trim()) {
		return json({ error: 'First name and last name are required' }, { status: 400 });
	}

	const now = Date.now();
	const contact = {
		id: nanoid(12),
		firstName: body.firstName.trim(),
		lastName: body.lastName.trim(),
		companyId: body.companyId || null,
		email: body.email || null,
		phone: body.phone || null,
		title: body.title || null,
		isPrimary: body.isPrimary || false,
		source: body.source || null,
		notes: body.notes || null,
		ownerId: body.ownerId || null,
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	db.insert(crmContacts).values(contact).run();
	return json(contact, { status: 201 });
};
