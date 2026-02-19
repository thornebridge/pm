import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	tasks,
	taskStatuses,
	activityLog,
	taskLabelAssignments,
	taskLabels,
	checklistItems
} from '$lib/server/db/schema.js';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastTaskCreated } from '$lib/server/ws/handlers.js';
import { fireWebhooks } from '$lib/server/webhooks/fire.js';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const projectId = event.params.projectId;
	const taskId = event.params.taskId;

	const source = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
	if (!source) return json({ error: 'Task not found' }, { status: 404 });

	// Auto-increment number
	const maxNum = db
		.select({ max: sql<number>`coalesce(max(${tasks.number}), 0)` })
		.from(tasks)
		.where(eq(tasks.projectId, projectId))
		.get();
	const number = (maxNum?.max || 0) + 1;

	// Reset to first open status
	const firstStatus = db.select().from(taskStatuses)
		.where(and(eq(taskStatuses.projectId, projectId), eq(taskStatuses.isClosed, false)))
		.orderBy(asc(taskStatuses.position))
		.limit(1)
		.get();
	const statusId = firstStatus?.id || source.statusId;

	// Position at end of status column
	const lastTask = db.select({ pos: tasks.position }).from(tasks)
		.where(and(eq(tasks.projectId, projectId), eq(tasks.statusId, statusId)))
		.orderBy(desc(tasks.position))
		.limit(1)
		.get();

	const now = Date.now();
	const id = nanoid(12);

	const newTask = {
		id,
		projectId,
		number,
		title: `${source.title} (copy)`,
		description: source.description,
		type: source.type,
		statusId,
		priority: source.priority,
		assigneeId: source.assigneeId,
		parentId: source.parentId,
		createdBy: user.id,
		dueDate: source.dueDate,
		startDate: source.startDate,
		estimatePoints: source.estimatePoints,
		recurrence: source.recurrence,
		position: (lastTask?.pos || 0) + 1,
		createdAt: now,
		updatedAt: now
	};

	db.insert(tasks).values(newTask).run();

	// Activity log
	db.insert(activityLog).values({
		id: nanoid(12),
		taskId: id,
		userId: user.id,
		action: 'created',
		detail: JSON.stringify({ duplicatedFrom: taskId }),
		createdAt: now
	}).run();

	// Copy labels
	const labels = db.select({ labelId: taskLabelAssignments.labelId })
		.from(taskLabelAssignments)
		.where(eq(taskLabelAssignments.taskId, taskId))
		.all();

	const assignedLabels: Array<{ labelId: string; name: string; color: string }> = [];
	for (const la of labels) {
		db.insert(taskLabelAssignments).values({ taskId: id, labelId: la.labelId }).run();
		const label = db.select().from(taskLabels).where(eq(taskLabels.id, la.labelId)).get();
		if (label) assignedLabels.push({ labelId: label.id, name: label.name, color: label.color });
	}

	// Copy checklist items
	const items = db.select().from(checklistItems)
		.where(eq(checklistItems.taskId, taskId))
		.orderBy(asc(checklistItems.position))
		.all();

	for (const item of items) {
		db.insert(checklistItems).values({
			id: nanoid(12),
			taskId: id,
			title: item.title,
			completed: false,
			position: item.position,
			createdAt: now
		}).run();
	}

	const result = { ...newTask, labels: assignedLabels };
	broadcastTaskCreated(projectId, result, user.id);
	fireWebhooks('task.created', { projectId, task: result }).catch(() => {});

	return json({ ...result, number }, { status: 201 });
};
