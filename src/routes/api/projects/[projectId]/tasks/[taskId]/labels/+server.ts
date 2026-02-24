import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { taskLabelAssignments, activityLog, tasks } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { emitAutomationEvent } from '$lib/server/automations/emit.js';
import { broadcastLabelChanged } from '$lib/server/ws/handlers.js';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { labelId } = await event.request.json();

	if (!labelId) {
		return json({ error: 'labelId is required' }, { status: 400 });
	}

	await db.insert(taskLabelAssignments)
		.values({ taskId: event.params.taskId, labelId })
		.onConflictDoNothing();

	await db.insert(activityLog)
		.values({
			id: nanoid(12),
			taskId: event.params.taskId,
			userId: user.id,
			action: 'label_added',
			detail: JSON.stringify({ labelId }),
			createdAt: Date.now()
		});

	const [task] = await db.select().from(tasks).where(eq(tasks.id, event.params.taskId));
	if (task) {
		emitAutomationEvent({ event: 'label.added', projectId: event.params.projectId, taskId: event.params.taskId, task: task as unknown as Record<string, unknown>, changes: { labelId }, userId: user.id });
	}

	broadcastLabelChanged(event.params.projectId, user.id);
	return json({ ok: true });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { labelId } = await event.request.json();

	if (!labelId) {
		return json({ error: 'labelId is required' }, { status: 400 });
	}

	await db.delete(taskLabelAssignments)
		.where(
			and(
				eq(taskLabelAssignments.taskId, event.params.taskId),
				eq(taskLabelAssignments.labelId, labelId)
			)
		);

	await db.insert(activityLog)
		.values({
			id: nanoid(12),
			taskId: event.params.taskId,
			userId: user.id,
			action: 'label_removed',
			detail: JSON.stringify({ labelId }),
			createdAt: Date.now()
		});

	const [taskForRemove] = await db.select().from(tasks).where(eq(tasks.id, event.params.taskId));
	if (taskForRemove) {
		emitAutomationEvent({ event: 'label.removed', projectId: event.params.projectId, taskId: event.params.taskId, task: taskForRemove as unknown as Record<string, unknown>, changes: { labelId }, userId: user.id });
	}

	broadcastLabelChanged(event.params.projectId, user.id);
	return json({ ok: true });
};
