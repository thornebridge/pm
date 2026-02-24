import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { sprints, tasks, taskStatuses } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

const VALID_TRANSITIONS: Record<string, string[]> = {
	planning: ['active', 'cancelled'],
	active: ['completed', 'cancelled'],
	completed: [],
	cancelled: []
};

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { projectId, sprintId } = event.params;

	const [sprint] = await db
		.select()
		.from(sprints)
		.where(and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId)));

	if (!sprint) {
		return json({ error: 'Sprint not found' }, { status: 404 });
	}

	const sprintTasks = await db
		.select()
		.from(tasks)
		.where(eq(tasks.sprintId, sprintId));

	const statuses = await db
		.select()
		.from(taskStatuses)
		.where(eq(taskStatuses.projectId, projectId))
		.orderBy(taskStatuses.position);

	return json({ sprint, tasks: sprintTasks, statuses });
};

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { projectId, sprintId } = event.params;
	const body = await event.request.json();

	const updates: Record<string, unknown> = {};
	if (body.name !== undefined) updates.name = body.name.trim();
	if (body.goal !== undefined) updates.goal = body.goal?.trim() || null;
	if (body.startDate !== undefined) updates.startDate = body.startDate;
	if (body.endDate !== undefined) updates.endDate = body.endDate;

	if (body.status !== undefined) {
		const [sprint] = await db.select().from(sprints).where(eq(sprints.id, sprintId));
		if (!sprint) return json({ error: 'Sprint not found' }, { status: 404 });
		const allowed = VALID_TRANSITIONS[sprint.status] ?? [];
		if (!allowed.includes(body.status)) {
			return json({ error: `Cannot transition from '${sprint.status}' to '${body.status}'` }, { status: 400 });
		}
		updates.status = body.status;
	}

	if (Object.keys(updates).length > 0) {
		await db.update(sprints)
			.set(updates)
			.where(and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId)));
	}

	const [updated] = await db.select().from(sprints).where(eq(sprints.id, sprintId));

	if (globalThis.__wsBroadcast) {
		globalThis.__wsBroadcast(projectId, { type: 'sprint:updated', sprint: updated });
	}
	if (globalThis.__wsBroadcastAll) {
		globalThis.__wsBroadcastAll({ type: 'sprint:updated', sprint: updated });
	}

	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { projectId, sprintId } = event.params;

	// Unassign tasks from sprint
	await db.update(tasks)
		.set({ sprintId: null })
		.where(eq(tasks.sprintId, sprintId));

	await db.delete(sprints)
		.where(and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId)));

	if (globalThis.__wsBroadcast) {
		globalThis.__wsBroadcast(projectId, { type: 'sprint:deleted', sprintId });
	}
	if (globalThis.__wsBroadcastAll) {
		globalThis.__wsBroadcastAll({ type: 'sprint:deleted', sprintId });
	}

	return json({ ok: true });
};
