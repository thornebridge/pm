import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { tasks } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { fireWebhooks } from '$lib/server/webhooks/fire.js';

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

	const updated = await db.transaction(async (tx) => {
		let count = 0;
		for (const taskId of taskIds) {
			const r = await tx.update(tasks)
				.set(allowed)
				.where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
				.returning({ id: tasks.id });
			count += r.length;
		}
		return count;
	});

	if (globalThis.__wsBroadcast) {
		globalThis.__wsBroadcast(projectId, { type: 'tasks:bulk_updated', taskIds });
	}
	if (globalThis.__wsBroadcastAll) {
		globalThis.__wsBroadcastAll({ type: 'tasks:bulk_updated', taskIds });
	}

	return json({ ok: true, updated });
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { projectId } = event.params;
	const { taskIds } = await event.request.json();

	if (!Array.isArray(taskIds) || taskIds.length === 0) {
		return json({ error: 'taskIds is required' }, { status: 400 });
	}

	const deleted = await db.transaction(async (tx) => {
		let count = 0;
		for (const taskId of taskIds) {
			const r = await tx.delete(tasks)
				.where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
				.returning({ id: tasks.id });
			count += r.length;
		}
		return count;
	});

	if (globalThis.__wsBroadcast) {
		globalThis.__wsBroadcast(projectId, { type: 'tasks:bulk_deleted', taskIds });
	}
	if (globalThis.__wsBroadcastAll) {
		globalThis.__wsBroadcastAll({ type: 'tasks:bulk_deleted', taskIds });
	}

	for (const taskId of taskIds) {
		fireWebhooks('task.deleted', { projectId, taskId }).catch(() => {});
	}

	return json({ ok: true, deleted });
};
