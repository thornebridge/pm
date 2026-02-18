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
	users
} from '$lib/server/db/schema.js';
import { eq, and, desc, asc, sql, like, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastTaskCreated } from '$lib/server/ws/handlers.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const projectId = event.params.projectId;
	const url = event.url;

	const statusId = url.searchParams.get('status');
	const priority = url.searchParams.get('priority');
	const assigneeId = url.searchParams.get('assignee');
	const search = url.searchParams.get('q');
	const sortBy = url.searchParams.get('sort') || 'position';
	const sortDir = url.searchParams.get('dir') || 'asc';

	const conditions = [eq(tasks.projectId, projectId)];

	if (statusId) conditions.push(eq(tasks.statusId, statusId));
	if (priority) conditions.push(eq(tasks.priority, priority as 'urgent' | 'high' | 'medium' | 'low'));
	if (assigneeId) conditions.push(eq(tasks.assigneeId, assigneeId));
	if (search) conditions.push(like(tasks.title, `%${search}%`));

	const orderCol =
		sortBy === 'created' ? tasks.createdAt :
		sortBy === 'priority' ? tasks.priority :
		sortBy === 'number' ? tasks.number :
		tasks.position;

	const orderFn = sortDir === 'desc' ? desc : asc;

	const result = db
		.select()
		.from(tasks)
		.where(and(...conditions))
		.orderBy(orderFn(orderCol))
		.all();

	// Fetch label assignments for all tasks
	if (result.length > 0) {
		const taskIds = result.map((t) => t.id);
		const labelAssigns = db
			.select({
				taskId: taskLabelAssignments.taskId,
				labelId: taskLabelAssignments.labelId,
				name: taskLabels.name,
				color: taskLabels.color
			})
			.from(taskLabelAssignments)
			.innerJoin(taskLabels, eq(taskLabelAssignments.labelId, taskLabels.id))
			.where(inArray(taskLabelAssignments.taskId, taskIds))
			.all();

		const labelMap = new Map<string, typeof labelAssigns>();
		for (const la of labelAssigns) {
			const arr = labelMap.get(la.taskId) || [];
			arr.push(la);
			labelMap.set(la.taskId, arr);
		}

		return json(result.map((t) => ({ ...t, labels: labelMap.get(t.id) || [] })));
	}

	return json(result.map((t) => ({ ...t, labels: [] })));
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const projectId = event.params.projectId;
	const { title, description, statusId, priority, assigneeId, dueDate } =
		await event.request.json();

	if (!title?.trim()) {
		return json({ error: 'Title is required' }, { status: 400 });
	}

	// Auto-increment number per project
	const maxNum = db
		.select({ max: sql<number>`coalesce(max(${tasks.number}), 0)` })
		.from(tasks)
		.where(eq(tasks.projectId, projectId))
		.get();

	const number = (maxNum?.max || 0) + 1;

	// Default to first status if not specified
	let resolvedStatusId = statusId;
	if (!resolvedStatusId) {
		const firstStatus = db
			.select()
			.from(taskStatuses)
			.where(eq(taskStatuses.projectId, projectId))
			.orderBy(asc(taskStatuses.position))
			.limit(1)
			.get();
		resolvedStatusId = firstStatus?.id;
	}

	if (!resolvedStatusId) {
		return json({ error: 'No statuses configured for this project' }, { status: 400 });
	}

	// Position: append to end of status column
	const lastTask = db
		.select({ pos: tasks.position })
		.from(tasks)
		.where(and(eq(tasks.projectId, projectId), eq(tasks.statusId, resolvedStatusId)))
		.orderBy(desc(tasks.position))
		.limit(1)
		.get();

	const position = (lastTask?.pos || 0) + 1;

	const now = Date.now();
	const id = nanoid(12);

	const task = {
		id,
		projectId,
		number,
		title: title.trim(),
		description: description?.trim() || null,
		statusId: resolvedStatusId,
		priority: priority || 'medium',
		assigneeId: assigneeId || null,
		createdBy: user.id,
		dueDate: dueDate || null,
		position,
		createdAt: now,
		updatedAt: now
	};

	db.insert(tasks).values(task).run();

	// Activity log
	db.insert(activityLog)
		.values({
			id: nanoid(12),
			taskId: id,
			userId: user.id,
			action: 'created',
			createdAt: now
		})
		.run();

	const result = { ...task, labels: [] };
	broadcastTaskCreated(projectId, result, user.id);
	return json(result, { status: 201 });
};
