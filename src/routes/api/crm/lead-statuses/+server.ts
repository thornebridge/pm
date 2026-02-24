import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmLeadStatuses } from '$lib/server/db/schema.js';
import { asc, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const statuses = await db
		.select()
		.from(crmLeadStatuses)
		.orderBy(asc(crmLeadStatuses.position));
	return json(statuses);
};

export const POST: RequestHandler = async (event) => {
	requireAuth(event);
	const body = await event.request.json();

	if (!body.name?.trim()) {
		return json({ error: 'Status name is required' }, { status: 400 });
	}

	const [maxPos] = await db
		.select({ max: sql<number>`MAX(${crmLeadStatuses.position})` })
		.from(crmLeadStatuses);

	const status = {
		id: nanoid(12),
		name: body.name.trim(),
		color: body.color || '#6366f1',
		position: (maxPos?.max ?? -1) + 1,
		isConverted: body.isConverted || false,
		isDisqualified: body.isDisqualified || false,
		createdAt: Date.now()
	};

	await db.insert(crmLeadStatuses).values(status);
	return json(status, { status: 201 });
};

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const body = await event.request.json();

	if (!Array.isArray(body.statuses)) {
		return json({ error: 'statuses array is required' }, { status: 400 });
	}

	for (const s of body.statuses) {
		const updates: Record<string, unknown> = {};
		if ('name' in s) updates.name = s.name;
		if ('color' in s) updates.color = s.color;
		if ('position' in s) updates.position = s.position;
		if ('isConverted' in s) updates.isConverted = s.isConverted;
		if ('isDisqualified' in s) updates.isDisqualified = s.isDisqualified;

		if (Object.keys(updates).length > 0) {
			await db.update(crmLeadStatuses).set(updates).where(eq(crmLeadStatuses.id, s.id));
		}
	}

	const updated = await db
		.select()
		.from(crmLeadStatuses)
		.orderBy(asc(crmLeadStatuses.position));
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const body = await event.request.json();
	const { id } = body;

	if (!id) return json({ error: 'Status id is required' }, { status: 400 });

	await db.delete(crmLeadStatuses).where(eq(crmLeadStatuses.id, id));
	return json({ ok: true });
};
