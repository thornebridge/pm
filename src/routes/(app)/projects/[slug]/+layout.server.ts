import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { projects, taskStatuses, taskLabels, tasks, users, taskLabelAssignments, checklistItems, comments, savedViews } from '$lib/server/db/schema.js';
import { eq, and, or, asc, inArray, sql, isNull } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ params, parent }) => {
	const [project] = await db.select().from(projects).where(eq(projects.slug, params.slug));

	if (!project) {
		throw error(404, 'Project not found');
	}

	const statuses = await db
		.select()
		.from(taskStatuses)
		.where(eq(taskStatuses.projectId, project.id))
		.orderBy(asc(taskStatuses.position));

	const labels = await db
		.select()
		.from(taskLabels)
		.where(eq(taskLabels.projectId, project.id));

	// Only fetch top-level tasks (no subtasks on board/list)
	const allTasks = await db
		.select()
		.from(tasks)
		.where(eq(tasks.projectId, project.id));

	const taskIds = allTasks.map((t) => t.id);

	// Label assignments
	let labelMap = new Map<string, Array<{ labelId: string; name: string; color: string }>>();
	if (taskIds.length > 0) {
		const assigns = await db
			.select({
				taskId: taskLabelAssignments.taskId,
				labelId: taskLabelAssignments.labelId,
				name: taskLabels.name,
				color: taskLabels.color
			})
			.from(taskLabelAssignments)
			.innerJoin(taskLabels, eq(taskLabelAssignments.labelId, taskLabels.id))
			.where(inArray(taskLabelAssignments.taskId, taskIds));

		for (const a of assigns) {
			const arr = labelMap.get(a.taskId) || [];
			arr.push(a);
			labelMap.set(a.taskId, arr);
		}
	}

	// Checklist summary per task
	let checklistMap = new Map<string, { total: number; done: number }>();
	if (taskIds.length > 0) {
		const checklistSummary = await db
			.select({
				taskId: checklistItems.taskId,
				total: sql<number>`count(*)`,
				done: sql<number>`sum(case when ${checklistItems.completed} = 1 then 1 else 0 end)`
			})
			.from(checklistItems)
			.where(inArray(checklistItems.taskId, taskIds))
			.groupBy(checklistItems.taskId);

		for (const c of checklistSummary) {
			checklistMap.set(c.taskId, { total: c.total, done: c.done });
		}
	}

	// Comment count per task
	let commentCountMap = new Map<string, number>();
	if (taskIds.length > 0) {
		const commentCounts = await db
			.select({
				taskId: comments.taskId,
				count: sql<number>`count(*)`
			})
			.from(comments)
			.where(inArray(comments.taskId, taskIds))
			.groupBy(comments.taskId);

		for (const c of commentCounts) {
			commentCountMap.set(c.taskId, c.count);
		}
	}

	// Subtask count per parent task
	let subtaskMap = new Map<string, { total: number; done: number }>();
	if (taskIds.length > 0) {
		const subtaskSummary = await db
			.select({
				parentId: tasks.parentId,
				total: sql<number>`count(*)`,
				done: sql<number>`sum(case when ${taskStatuses.isClosed} = 1 then 1 else 0 end)`
			})
			.from(tasks)
			.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
			.where(inArray(tasks.parentId, taskIds))
			.groupBy(tasks.parentId);

		for (const s of subtaskSummary) {
			if (s.parentId) subtaskMap.set(s.parentId, { total: s.total, done: s.done });
		}
	}

	// Member name lookup
	const members = await db
		.select({ id: users.id, name: users.name, email: users.email })
		.from(users);

	const memberMap = new Map(members.map((m) => [m.id, m.name]));

	const tasksWithExtras = allTasks.map((t) => ({
		...t,
		labels: labelMap.get(t.id) || [],
		assigneeName: t.assigneeId ? memberMap.get(t.assigneeId) || null : null,
		checklistTotal: checklistMap.get(t.id)?.total || 0,
		checklistDone: checklistMap.get(t.id)?.done || 0,
		commentCount: commentCountMap.get(t.id) || 0,
		subtaskTotal: subtaskMap.get(t.id)?.total || 0,
		subtaskDone: subtaskMap.get(t.id)?.done || 0
	}));

	// Saved views — user's own + shared
	const parentData = await parent();
	const userId = parentData.user?.id;
	const views = userId
		? await db
				.select()
				.from(savedViews)
				.where(
					or(
						and(eq(savedViews.projectId, project.id), eq(savedViews.userId, userId)),
						and(eq(savedViews.projectId, project.id), eq(savedViews.shared, true))
					)
				)
				.orderBy(asc(savedViews.createdAt))
		: [];

	return { project, statuses, labels, tasks: tasksWithExtras, members, views };
};
