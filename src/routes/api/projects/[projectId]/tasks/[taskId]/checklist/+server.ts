import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { checklistItems } from '$lib/server/db/schema.js';
import { eq, asc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastChecklistChanged } from '$lib/server/ws/handlers.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const items = await db
		.select()
		.from(checklistItems)
		.where(eq(checklistItems.taskId, event.params.taskId))
		.orderBy(asc(checklistItems.position));

	return json(items);
};

export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { order } = await event.request.json();

	if (!Array.isArray(order)) {
		return json({ error: 'order must be an array of item IDs' }, { status: 400 });
	}

	for (let i = 0; i < order.length; i++) {
		await db.update(checklistItems)
			.set({ position: i })
			.where(eq(checklistItems.id, order[i]));
	}

	broadcastChecklistChanged(event.params.projectId, user.id);
	return json({ ok: true });
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { title } = await event.request.json();

	if (!title?.trim()) {
		return json({ error: 'Title is required' }, { status: 400 });
	}

	const [maxPos] = await db
		.select({ max: sql<number>`coalesce(max(${checklistItems.position}), -1)` })
		.from(checklistItems)
		.where(eq(checklistItems.taskId, event.params.taskId));

	const item = {
		id: nanoid(12),
		taskId: event.params.taskId,
		title: title.trim(),
		completed: false,
		position: (maxPos?.max ?? -1) + 1,
		createdAt: Date.now()
	};

	await db.insert(checklistItems).values(item);
	broadcastChecklistChanged(event.params.projectId, user.id);
	return json(item, { status: 201 });
};
