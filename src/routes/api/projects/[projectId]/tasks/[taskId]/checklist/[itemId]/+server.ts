import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { checklistItems } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const body = await event.request.json();

	const item = db
		.select()
		.from(checklistItems)
		.where(and(eq(checklistItems.id, event.params.itemId), eq(checklistItems.taskId, event.params.taskId)))
		.get();

	if (!item) return json({ error: 'Item not found' }, { status: 404 });

	const updates: Record<string, unknown> = {};
	if (body.title !== undefined) updates.title = body.title.trim();
	if (body.completed !== undefined) updates.completed = body.completed;
	if (body.position !== undefined) updates.position = body.position;

	db.update(checklistItems).set(updates).where(eq(checklistItems.id, event.params.itemId)).run();
	return json({ ...item, ...updates });
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	db.delete(checklistItems)
		.where(and(eq(checklistItems.id, event.params.itemId), eq(checklistItems.taskId, event.params.taskId)))
		.run();
	return json({ ok: true });
};
