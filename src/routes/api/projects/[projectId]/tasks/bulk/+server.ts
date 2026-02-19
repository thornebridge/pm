import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { tasks } from '$lib/server/db/schema.js';
import { eq, inArray } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { projectId } = event.params;
	const { taskIds, updates } = await event.request.json();

	if (!Array.isArray(taskIds) || taskIds.length === 0) {
		return json({ error: 'taskIds is required' }, { status: 400 });
	}

	const allowed: Record<string, unknown> = {};
	if (updates.statusId !== undefined) allowed.statusId = updates.statusId;
	if (updates.priority !== undefined) allowed.priority = updates.priority;
	if (updates.assigneeId !== undefined) allowed.assigneeId = updates.assigneeId || null;
	if (updates.sprintId !== undefined) allowed.sprintId = updates.sprintId || null;
	allowed.updatedAt = Date.now();

	if (Object.keys(allowed).length <= 1) {
		return json({ error: 'No valid updates' }, { status: 400 });
	}

	for (const taskId of taskIds) {
		db.update(tasks)
			.set(allowed)
			.where(eq(tasks.id, taskId))
			.run();
	}

	if (globalThis.__wsBroadcast) {
		globalThis.__wsBroadcast(projectId, { type: 'tasks:bulk_updated', taskIds });
	}

	return json({ ok: true, updated: taskIds.length });
};
