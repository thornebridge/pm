import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { sprints, tasks, taskStatuses, taskLabels, taskLabelAssignments } from '$lib/server/db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { project } = await parent();

	const sprint = db
		.select()
		.from(sprints)
		.where(and(eq(sprints.id, params.sprintId), eq(sprints.projectId, project.id)))
		.get();

	if (!sprint) {
		throw error(404, 'Sprint not found');
	}

	const sprintTasks = db
		.select()
		.from(tasks)
		.where(eq(tasks.sprintId, sprint.id))
		.all();

	// Get backlog tasks (tasks with no sprint assigned)
	const backlogTasks = db
		.select()
		.from(tasks)
		.where(and(eq(tasks.projectId, project.id), isNull(tasks.sprintId)))
		.all();

	const statuses = db
		.select()
		.from(taskStatuses)
		.where(eq(taskStatuses.projectId, project.id))
		.orderBy(taskStatuses.position)
		.all();

	// Get labels for tasks
	const allLabels = db.select().from(taskLabels).where(eq(taskLabels.projectId, project.id)).all();
	const assignments = db.select().from(taskLabelAssignments).all();

	const taskIds = new Set([...sprintTasks, ...backlogTasks].map((t) => t.id));
	const labelMap = new Map(allLabels.map((l) => [l.id, l]));

	const taskLabelsMap = new Map<string, Array<{ name: string; color: string }>>();
	for (const a of assignments) {
		if (!taskIds.has(a.taskId)) continue;
		const label = labelMap.get(a.labelId);
		if (!label) continue;
		const arr = taskLabelsMap.get(a.taskId) || [];
		arr.push({ name: label.name, color: label.color });
		taskLabelsMap.set(a.taskId, arr);
	}

	const enrichTask = (t: typeof sprintTasks[0]) => ({
		...t,
		labels: taskLabelsMap.get(t.id) || []
	});

	return {
		sprint,
		tasks: sprintTasks.map(enrichTask),
		backlogTasks: backlogTasks.map(enrichTask),
		statuses
	};
};
