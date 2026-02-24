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
	users,
	projects
} from '$lib/server/db/schema.js';
import { eq, and, desc, asc, sql, like, inArray, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastTaskCreated } from '$lib/server/ws/handlers.js';
import { fireWebhooks } from '$lib/server/webhooks/fire.js';
import { emitAutomationEvent } from '$lib/server/automations/emit.js';
import { indexDocument } from '$lib/server/search/meilisearch.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const projectId = event.params.projectId;
	const url = event.url;

	const statusId = url.searchParams.get('status');
	const priority = url.searchParams.get('priority');
	const assigneeId = url.searchParams.get('assignee');
	const search = url.searchParams.get('q');
	const type = url.searchParams.get('type');
	const parentId = url.searchParams.get('parentId');
	const sortBy = url.searchParams.get('sort') || 'position';
	const sortDir = url.searchParams.get('dir') || 'asc';

	const conditions = [eq(tasks.projectId, projectId)];

	if (statusId) conditions.push(eq(tasks.statusId, statusId));
	if (priority) conditions.push(eq(tasks.priority, priority as 'urgent' | 'high' | 'medium' | 'low'));
	if (assigneeId) conditions.push(eq(tasks.assigneeId, assigneeId));
	if (search) conditions.push(like(tasks.title, `%${search}%`));
	if (type) conditions.push(eq(tasks.type, type as 'task' | 'bug' | 'feature' | 'improvement'));

	// Filter by parentId: if 'none' => top-level only, if a specific ID => children of that task
	if (parentId === 'none') {
		conditions.push(isNull(tasks.parentId));
	} else if (parentId) {
		conditions.push(eq(tasks.parentId, parentId));
	}

	const orderCol =
		sortBy === 'created' ? tasks.createdAt :
		sortBy === 'priority' ? tasks.priority :
		sortBy === 'number' ? tasks.number :
		tasks.position;

	const orderFn = sortDir === 'desc' ? desc : asc;

	const limit = Math.min(parseInt(url.searchParams.get('limit') || '500'), 500);
	const offset = parseInt(url.searchParams.get('offset') || '0');

	const result = await db
		.select()
		.from(tasks)
		.where(and(...conditions))
		.orderBy(orderFn(orderCol))
		.limit(limit)
		.offset(offset);

	// Fetch label assignments for all tasks
	if (result.length > 0) {
		const taskIds = result.map((t) => t.id);
		const labelAssigns = await db
			.select({
				taskId: taskLabelAssignments.taskId,
				labelId: taskLabelAssignments.labelId,
				name: taskLabels.name,
				color: taskLabels.color
			})
			.from(taskLabelAssignments)
			.innerJoin(taskLabels, eq(taskLabelAssignments.labelId, taskLabels.id))
			.where(inArray(taskLabelAssignments.taskId, taskIds));

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
	const { title, description, statusId, priority, assigneeId, dueDate, labelIds, type, parentId, recurrence, sprintId } =
		await event.request.json();

	if (!title?.trim()) {
		return json({ error: 'Title is required' }, { status: 400 });
	}

	// Resolve assignee: use provided or project default
	let resolvedAssigneeId = assigneeId || null;
	if (!resolvedAssigneeId) {
		const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
		if (project?.defaultAssigneeId) {
			resolvedAssigneeId = project.defaultAssigneeId;
		}
	}

	// Auto-increment number per project
	const [maxNum] = await db
		.select({ max: sql<number>`coalesce(max(${tasks.number}), 0)` })
		.from(tasks)
		.where(eq(tasks.projectId, projectId));

	const number = (maxNum?.max || 0) + 1;

	// Default to first status if not specified
	let resolvedStatusId = statusId;
	if (!resolvedStatusId) {
		const [firstStatus] = await db
			.select()
			.from(taskStatuses)
			.where(eq(taskStatuses.projectId, projectId))
			.orderBy(asc(taskStatuses.position))
			.limit(1);
		resolvedStatusId = firstStatus?.id;
	}

	if (!resolvedStatusId) {
		return json({ error: 'No statuses configured for this project' }, { status: 400 });
	}

	// Position: append to end of status column
	const [lastTask] = await db
		.select({ pos: tasks.position })
		.from(tasks)
		.where(and(eq(tasks.projectId, projectId), eq(tasks.statusId, resolvedStatusId)))
		.orderBy(desc(tasks.position))
		.limit(1);

	const position = (lastTask?.pos || 0) + 1;

	const now = Date.now();
	const id = nanoid(12);

	const task = {
		id,
		projectId,
		number,
		title: title.trim(),
		description: description?.trim() || null,
		type: type || 'task',
		statusId: resolvedStatusId,
		priority: priority || 'medium',
		assigneeId: resolvedAssigneeId,
		parentId: parentId || null,
		sprintId: sprintId || null,
		createdBy: user.id,
		dueDate: dueDate || null,
		recurrence: recurrence ? JSON.stringify(recurrence) : null,
		position,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(tasks).values(task);

	// Activity log
	await db.insert(activityLog)
		.values({
			id: nanoid(12),
			taskId: id,
			userId: user.id,
			action: 'created',
			createdAt: now
		});

	// Assign labels if provided
	const assignedLabels: Array<{ labelId: string; name: string; color: string }> = [];
	if (labelIds && Array.isArray(labelIds) && labelIds.length > 0) {
		for (const labelId of labelIds) {
			const [label] = await db.select().from(taskLabels).where(eq(taskLabels.id, labelId));
			if (label && label.projectId === projectId) {
				await db.insert(taskLabelAssignments).values({ taskId: id, labelId });
				assignedLabels.push({ labelId: label.id, name: label.name, color: label.color });
			}
		}
	}

	const result = { ...task, labels: assignedLabels };
	const [proj] = await db.select({ slug: projects.slug, name: projects.name }).from(projects).where(eq(projects.id, projectId));
	indexDocument('tasks', { id: task.id, number: task.number, title: task.title, projectId, projectSlug: proj?.slug, projectName: proj?.name, assigneeId: task.assigneeId, statusId: task.statusId, priority: task.priority, dueDate: task.dueDate, updatedAt: task.updatedAt });
	broadcastTaskCreated(projectId, result, user.id);
	fireWebhooks('task.created', { projectId, task: result }).catch(() => {});
	emitAutomationEvent({ event: 'task.created', projectId, taskId: id, task: result, userId: user.id });
	return json(result, { status: 201 });
};
