import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { timeEntries, tasks } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { broadcastTimeEntryChanged } from '$lib/server/ws/handlers.js';

export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { entryId } = event.params;

	const entry = db.select().from(timeEntries).where(eq(timeEntries.id, entryId)).get();
	if (!entry) return json({ error: 'Not found' }, { status: 404 });
	if (entry.userId !== user.id && user.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const body = await event.request.json();
	const updates: Record<string, unknown> = {};
	if (body.description !== undefined) updates.description = body.description?.trim() || null;
	if (body.stoppedAt !== undefined) updates.stoppedAt = body.stoppedAt;
	if (body.durationMs !== undefined) updates.durationMs = body.durationMs;

	if (Object.keys(updates).length > 0) {
		db.update(timeEntries).set(updates).where(eq(timeEntries.id, entryId)).run();
	}

	const updated = db.select().from(timeEntries).where(eq(timeEntries.id, entryId)).get();
	const task = db.select({ projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, entry.taskId)).get();
	if (task) broadcastTimeEntryChanged(task.projectId, user.id);
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { entryId } = event.params;

	const entry = db.select().from(timeEntries).where(eq(timeEntries.id, entryId)).get();
	if (!entry) return json({ error: 'Not found' }, { status: 404 });
	if (entry.userId !== user.id && user.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const taskForDelete = db.select({ projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, entry.taskId)).get();
	db.delete(timeEntries).where(eq(timeEntries.id, entryId)).run();
	if (taskForDelete) broadcastTimeEntryChanged(taskForDelete.projectId, user.id);
	return json({ ok: true });
};
