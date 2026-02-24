import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmCustomFieldValues, crmCustomFieldDefs } from '$lib/server/db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const entityId = event.url.searchParams.get('entityId');
	const entityType = event.url.searchParams.get('entityType');

	if (!entityId) {
		return json({ error: 'entityId is required' }, { status: 400 });
	}

	// Get all field definitions for this entity type
	let defs = db.select().from(crmCustomFieldDefs).all();
	if (entityType) {
		defs = defs.filter((d) => d.entityType === entityType);
	}
	const defIds = defs.map((d) => d.id);

	if (defIds.length === 0) return json({ defs: [], values: {} });

	// Get values for this entity
	const values = db
		.select()
		.from(crmCustomFieldValues)
		.where(
			and(
				eq(crmCustomFieldValues.entityId, entityId),
				inArray(crmCustomFieldValues.fieldDefId, defIds)
			)
		)
		.all();

	const valueMap: Record<string, string | null> = {};
	for (const v of values) {
		valueMap[v.fieldDefId] = v.value;
	}

	return json({
		defs: defs.map((d) => ({ ...d, options: d.options ? JSON.parse(d.options) : null })),
		values: valueMap
	});
};

// Bulk upsert values for an entity
export const PUT: RequestHandler = async (event) => {
	requireAuth(event);
	const body = await event.request.json();

	if (!body.entityId || !body.values) {
		return json({ error: 'entityId and values are required' }, { status: 400 });
	}

	const now = Date.now();
	const entries = Object.entries(body.values) as [string, string | null][];

	for (const [fieldDefId, value] of entries) {
		const existing = db
			.select()
			.from(crmCustomFieldValues)
			.where(
				and(
					eq(crmCustomFieldValues.fieldDefId, fieldDefId),
					eq(crmCustomFieldValues.entityId, body.entityId)
				)
			)
			.get();

		if (existing) {
			db.update(crmCustomFieldValues)
				.set({ value: value ?? null, updatedAt: now })
				.where(eq(crmCustomFieldValues.id, existing.id))
				.run();
		} else if (value !== null && value !== '') {
			db.insert(crmCustomFieldValues)
				.values({
					id: nanoid(12),
					fieldDefId,
					entityId: body.entityId,
					value,
					createdAt: now,
					updatedAt: now
				})
				.run();
		}
	}

	return json({ ok: true });
};
