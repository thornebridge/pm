import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	tasks,
	activityLog,
	taskLabelAssignments,
	taskLabels,
	comments,
	users
} from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastTaskUpdated, broadcastTaskDeleted } from '$lib/server/ws/handlers.js';
import { notifyTaskAssigned, notifyStatusChanged } from '$lib/server/notifications/triggers.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const task = db.select().from(tasks).where(eq(tasks.id, event.params.taskId)).get();

	if (!task) {
		return json({ error: 'Task not found' }, { status: 404 });
	}

	const labels = db
		.select({ id: taskLabels.id, name: taskLabels.name, color: taskLabels.color })
		.from(taskLabelAssignments)
		.innerJoin(taskLabels, eq(taskLabelAssignments.labelId, taskLabels.id))
		.where(eq(taskLabelAssignments.taskId, task.id))
		.all();

	const activity = db
		.select({
			id: activityLog.id,
			action: activityLog.action,
			detail: activityLog.detail,
			createdAt: activityLog.createdAt,
			userId: activityLog.userId,
			userName: users.name
		})
		.from(activityLog)
		.innerJoin(users, eq(activityLog.userId, users.id))
		.where(eq(activityLog.taskId, task.id))
		.orderBy(asc(activityLog.createdAt))
		.all();

	const taskComments = db
		.select({
			id: comments.id,
			body: comments.body,
			createdAt: comments.createdAt,
			updatedAt: comments.updatedAt,
			userId: comments.userId,
			userName: users.name
		})
		.from(comments)
		.innerJoin(users, eq(comments.userId, users.id))
		.where(eq(comments.taskId, task.id))
		.orderBy(asc(comments.createdAt))
		.all();

	return json({ ...task, labels, activity, comments: taskComments });
};

export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();
	const now = Date.now();
	const taskId = event.params.taskId;

	const existing = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
	if (!existing) {
		return json({ error: 'Task not found' }, { status: 404 });
	}

	const updates: Record<string, unknown> = { updatedAt: now };
	const activities: Array<{ action: string; detail?: string }> = [];

	if (body.title !== undefined) {
		updates.title = body.title.trim();
		activities.push({ action: 'edited', detail: JSON.stringify({ field: 'title' }) });
	}
	if (body.description !== undefined) {
		updates.description = body.description?.trim() || null;
		activities.push({ action: 'edited', detail: JSON.stringify({ field: 'description' }) });
	}
	if (body.statusId !== undefined && body.statusId !== existing.statusId) {
		updates.statusId = body.statusId;
		activities.push({
			action: 'status_changed',
			detail: JSON.stringify({ from: existing.statusId, to: body.statusId })
		});
	}
	if (body.priority !== undefined && body.priority !== existing.priority) {
		updates.priority = body.priority;
		activities.push({
			action: 'priority_changed',
			detail: JSON.stringify({ from: existing.priority, to: body.priority })
		});
	}
	if (body.assigneeId !== undefined && body.assigneeId !== existing.assigneeId) {
		updates.assigneeId = body.assigneeId || null;
		activities.push({
			action: 'assigned',
			detail: JSON.stringify({ from: existing.assigneeId, to: body.assigneeId })
		});
	}
	if (body.dueDate !== undefined) {
		updates.dueDate = body.dueDate || null;
	}
	if (body.position !== undefined) {
		updates.position = body.position;
	}

	db.update(tasks).set(updates).where(eq(tasks.id, taskId)).run();

	for (const a of activities) {
		db.insert(activityLog)
			.values({
				id: nanoid(12),
				taskId,
				userId: user.id,
				action: a.action as typeof activityLog.$inferInsert.action,
				detail: a.detail || null,
				createdAt: now
			})
			.run();
	}

	const updated = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
	broadcastTaskUpdated(event.params.projectId, updated, user.id);

	// Fire push notifications (non-blocking)
	if (body.assigneeId !== undefined && body.assigneeId && body.assigneeId !== existing.assigneeId) {
		notifyTaskAssigned(taskId, body.assigneeId, user.name).catch(() => {});
	}
	if (body.statusId !== undefined && body.statusId !== existing.statusId) {
		notifyStatusChanged(taskId, user.id, user.name).catch(() => {});
	}

	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	db.delete(tasks).where(eq(tasks.id, event.params.taskId)).run();
	broadcastTaskDeleted(event.params.projectId, event.params.taskId, user.id);
	return json({ ok: true });
};
