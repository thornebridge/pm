import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { checklistItems } from '$lib/server/db/schema.js';
import { eq, asc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const items = db
		.select()
		.from(checklistItems)
		.where(eq(checklistItems.taskId, event.params.taskId))
		.orderBy(asc(checklistItems.position))
		.all();

	return json(items);
};

export const POST: RequestHandler = async (event) => {
	requireAuth(event);
	const { title } = await event.request.json();

	if (!title?.trim()) {
		return json({ error: 'Title is required' }, { status: 400 });
	}

	const maxPos = db
		.select({ max: sql<number>`coalesce(max(${checklistItems.position}), -1)` })
		.from(checklistItems)
		.where(eq(checklistItems.taskId, event.params.taskId))
		.get();

	const item = {
		id: nanoid(12),
		taskId: event.params.taskId,
		title: title.trim(),
		completed: false,
		position: (maxPos?.max ?? -1) + 1,
		createdAt: Date.now()
	};

	db.insert(checklistItems).values(item).run();
	return json(item, { status: 201 });
};
