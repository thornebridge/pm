import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { projects, taskStatuses, taskLabels, tasks, users, taskLabelAssignments } from '$lib/server/db/schema.js';
import { eq, asc, inArray } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ params }) => {
	const project = db.select().from(projects).where(eq(projects.slug, params.slug)).get();

	if (!project) {
		throw error(404, 'Project not found');
	}

	const statuses = db
		.select()
		.from(taskStatuses)
		.where(eq(taskStatuses.projectId, project.id))
		.orderBy(asc(taskStatuses.position))
		.all();

	const labels = db
		.select()
		.from(taskLabels)
		.where(eq(taskLabels.projectId, project.id))
		.all();

	const allTasks = db
		.select()
		.from(tasks)
		.where(eq(tasks.projectId, project.id))
		.all();

	// Fetch label assignments
	const taskIds = allTasks.map((t) => t.id);
	let labelMap = new Map<string, Array<{ labelId: string; name: string; color: string }>>();

	if (taskIds.length > 0) {
		const assigns = db
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

		for (const a of assigns) {
			const arr = labelMap.get(a.taskId) || [];
			arr.push(a);
			labelMap.set(a.taskId, arr);
		}
	}

	const tasksWithLabels = allTasks.map((t) => ({
		...t,
		labels: labelMap.get(t.id) || []
	}));

	const members = db
		.select({ id: users.id, name: users.name, email: users.email })
		.from(users)
		.all();

	return { project, statuses, labels, tasks: tasksWithLabels, members };
};
