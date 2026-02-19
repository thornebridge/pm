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
	commentReactions,
	users,
	taskStatuses,
	checklistItems,
	dueDateRemindersSent
} from '$lib/server/db/schema.js';
import { eq, asc, sql, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastTaskCreated, broadcastTaskUpdated, broadcastTaskDeleted } from '$lib/server/ws/handlers.js';
import { notifyTaskAssigned, notifyStatusChanged } from '$lib/server/notifications/triggers.js';
import { fireWebhooks } from '$lib/server/webhooks/fire.js';
import { emitAutomationEvent } from '$lib/server/automations/emit.js';

function computeNextDueDate(currentDue: number, rule: { freq: string; interval?: number; endDate?: number }): number {
	const d = new Date(currentDue);
	const interval = rule.interval || 1;
	switch (rule.freq) {
		case 'daily':
			d.setUTCDate(d.getUTCDate() + interval);
			break;
		case 'weekly':
			d.setUTCDate(d.getUTCDate() + interval * 7);
			break;
		case 'monthly':
			d.setUTCMonth(d.getUTCMonth() + interval);
			break;
		default:
			d.setUTCDate(d.getUTCDate() + interval);
	}
	return d.getTime();
}

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

	// Load reactions for comments
	const commentIds = taskComments.map((c) => c.id);
	const reactions = commentIds.length > 0
		? db
			.select({
				commentId: commentReactions.commentId,
				userId: commentReactions.userId,
				userName: users.name,
				emoji: commentReactions.emoji
			})
			.from(commentReactions)
			.innerJoin(users, eq(commentReactions.userId, users.id))
			.where(inArray(commentReactions.commentId, commentIds))
			.all()
		: [];

	const reactionsByComment = new Map<string, typeof reactions>();
	for (const r of reactions) {
		const arr = reactionsByComment.get(r.commentId) || [];
		arr.push(r);
		reactionsByComment.set(r.commentId, arr);
	}

	const commentsWithReactions = taskComments.map((c) => ({
		...c,
		reactions: reactionsByComment.get(c.id) || []
	}));

	const checklist = db
		.select()
		.from(checklistItems)
		.where(eq(checklistItems.taskId, task.id))
		.orderBy(asc(checklistItems.position))
		.all();

	// Subtask counts
	const subtaskSummary = db
		.select({
			total: sql<number>`count(*)`,
			done: sql<number>`sum(case when ${taskStatuses.isClosed} = 1 then 1 else 0 end)`
		})
		.from(tasks)
		.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
		.where(eq(tasks.parentId, task.id))
		.get();

	return json({
		...task,
		labels,
		activity,
		comments: commentsWithReactions,
		checklist,
		subtaskTotal: subtaskSummary?.total || 0,
		subtaskDone: subtaskSummary?.done || 0
	});
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
		// Clear sent reminders so they re-fire for new due date
		db.delete(dueDateRemindersSent).where(eq(dueDateRemindersSent.taskId, taskId)).run();
	}
	if (body.position !== undefined) {
		updates.position = body.position;
	}
	if (body.type !== undefined) {
		updates.type = body.type;
	}
	if (body.parentId !== undefined) {
		updates.parentId = body.parentId || null;
	}
	if (body.recurrence !== undefined) {
		updates.recurrence = body.recurrence ? JSON.stringify(body.recurrence) : null;
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
	fireWebhooks('task.updated', { projectId: event.params.projectId, task: updated, changes: body }).catch(() => {});

	// Fire automation events for specific field changes
	const autoPayload = { projectId: event.params.projectId, taskId, task: updated as unknown as Record<string, unknown>, changes: body, userId: user.id };
	if (body.statusId !== undefined && body.statusId !== existing.statusId) {
		emitAutomationEvent({ ...autoPayload, event: 'task.status_changed' });
	}
	if (body.priority !== undefined && body.priority !== existing.priority) {
		emitAutomationEvent({ ...autoPayload, event: 'task.priority_changed' });
	}
	if (body.assigneeId !== undefined && body.assigneeId !== existing.assigneeId) {
		emitAutomationEvent({ ...autoPayload, event: 'task.assigned' });
	}
	if (body.dueDate !== undefined) {
		emitAutomationEvent({ ...autoPayload, event: 'task.due_date_changed' });
	}
	if (body.type !== undefined && body.type !== existing.type) {
		emitAutomationEvent({ ...autoPayload, event: 'task.type_changed' });
	}

	// Fire push notifications (non-blocking)
	if (body.assigneeId !== undefined && body.assigneeId && body.assigneeId !== existing.assigneeId) {
		notifyTaskAssigned(taskId, body.assigneeId, user.name, user.id).catch(() => {});
	}
	if (body.statusId !== undefined && body.statusId !== existing.statusId) {
		notifyStatusChanged(taskId, user.id, user.name).catch(() => {});
	}

	// Auto-create next recurring task when moved to a closed status
	if (body.statusId !== undefined && body.statusId !== existing.statusId && updated?.recurrence) {
		const newStatus = db.select().from(taskStatuses).where(eq(taskStatuses.id, body.statusId)).get();
		if (newStatus?.isClosed) {
			try {
				const rule = JSON.parse(updated.recurrence);
				const nextDue = computeNextDueDate(updated.dueDate || now, rule);

				// Check endDate
				if (!rule.endDate || nextDue <= rule.endDate) {
					// Find first open status for this project
					const firstStatus = db.select().from(taskStatuses)
						.where(eq(taskStatuses.projectId, event.params.projectId))
						.orderBy(asc(taskStatuses.position))
						.limit(1)
						.get();

					// Auto-increment number
					const maxNum = db
						.select({ max: sql<number>`coalesce(max(${tasks.number}), 0)` })
						.from(tasks)
						.where(eq(tasks.projectId, event.params.projectId))
						.get();

					// Position at end
					const lastPos = db.select({ pos: tasks.position }).from(tasks)
						.where(sql`${tasks.projectId} = ${event.params.projectId} AND ${tasks.statusId} = ${firstStatus?.id}`)
						.orderBy(sql`${tasks.position} DESC`)
						.limit(1)
						.get();

					const nextId = nanoid(12);
					const sourceId = updated.recurrenceSourceId || updated.id;

					// Shift start date by same delta if present
					let nextStart: number | null = null;
					if (updated.startDate && updated.dueDate) {
						const delta = nextDue - updated.dueDate;
						nextStart = updated.startDate + delta;
					}

					const nextTask = {
						id: nextId,
						projectId: event.params.projectId,
						number: (maxNum?.max || 0) + 1,
						title: updated.title,
						description: updated.description,
						type: updated.type,
						statusId: firstStatus?.id || body.statusId,
						priority: updated.priority,
						assigneeId: updated.assigneeId,
						parentId: updated.parentId,
						createdBy: user.id,
						dueDate: nextDue,
						startDate: nextStart,
						estimatePoints: updated.estimatePoints,
						recurrence: updated.recurrence,
						recurrenceSourceId: sourceId,
						position: (lastPos?.pos || 0) + 1,
						createdAt: now,
						updatedAt: now
					};

					db.insert(tasks).values(nextTask).run();

					db.insert(activityLog).values({
						id: nanoid(12),
						taskId: nextId,
						userId: user.id,
						action: 'created',
						detail: JSON.stringify({ recurring: true, sourceTaskId: taskId }),
						createdAt: now
					}).run();

					// Copy labels from closed task
					const existingLabels = db.select()
						.from(taskLabelAssignments)
						.where(eq(taskLabelAssignments.taskId, taskId))
						.all();
					for (const la of existingLabels) {
						db.insert(taskLabelAssignments).values({ taskId: nextId, labelId: la.labelId }).run();
					}

					broadcastTaskCreated(event.params.projectId, nextTask, user.id);
					fireWebhooks('task.created', { projectId: event.params.projectId, task: nextTask }).catch(() => {});
				}
			} catch {
				// Invalid recurrence JSON — skip silently
			}
		}
	}

	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const taskId = event.params.taskId;
	const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
	db.delete(tasks).where(eq(tasks.id, taskId)).run();
	broadcastTaskDeleted(event.params.projectId, taskId, user.id);
	fireWebhooks('task.deleted', { projectId: event.params.projectId, taskId }).catch(() => {});
	if (task) {
		emitAutomationEvent({ event: 'task.deleted', projectId: event.params.projectId, taskId, task: task as unknown as Record<string, unknown>, userId: user.id });
	}
	return json({ ok: true });
};
