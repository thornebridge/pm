import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmCustomFieldDefs } from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const entityType = event.url.searchParams.get('entityType');

	let query = db
		.select()
		.from(crmCustomFieldDefs)
		.orderBy(asc(crmCustomFieldDefs.position));

	if (entityType) {
		query = query.where(eq(crmCustomFieldDefs.entityType, entityType as 'company' | 'contact' | 'opportunity')) as typeof query;
	}

	return json(await query);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	if (!body.entityType || !body.fieldName || !body.label || !body.fieldType) {
		return json({ error: 'entityType, fieldName, label, and fieldType are required' }, { status: 400 });
	}

	const now = Date.now();
	const maxPos = await db
		.select()
		.from(crmCustomFieldDefs)
		.where(eq(crmCustomFieldDefs.entityType, body.entityType));

	const field = {
		id: nanoid(12),
		entityType: body.entityType,
		fieldName: body.fieldName.replace(/\s+/g, '_').toLowerCase(),
		label: body.label,
		fieldType: body.fieldType,
		options: body.options ? JSON.stringify(body.options) : null,
		required: body.required || false,
		position: maxPos.length,
		showInList: body.showInList || false,
		showInCard: body.showInCard || false,
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(crmCustomFieldDefs).values(field);
	return json(field, { status: 201 });
};
