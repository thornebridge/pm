import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { checklistItems } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { broadcastChecklistChanged } from '$lib/server/ws/handlers.js';

export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const [item] = await db
		.select()
		.from(checklistItems)
		.where(and(eq(checklistItems.id, event.params.itemId), eq(checklistItems.taskId, event.params.taskId)));

	if (!item) return json({ error: 'Item not found' }, { status: 404 });

	const updates: Record<string, unknown> = {};
	if (body.title !== undefined) updates.title = body.title.trim();
	if (body.completed !== undefined) updates.completed = body.completed;
	if (body.position !== undefined) updates.position = body.position;

	await db.update(checklistItems).set(updates).where(eq(checklistItems.id, event.params.itemId));
	broadcastChecklistChanged(event.params.projectId, user.id);
	return json({ ...item, ...updates });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	await db.delete(checklistItems)
		.where(and(eq(checklistItems.id, event.params.itemId), eq(checklistItems.taskId, event.params.taskId)));
	broadcastChecklistChanged(event.params.projectId, user.id);
	return json({ ok: true });
};
