import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { tasks, projects, taskStatuses } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	const myTasks = db
		.select({
			id: tasks.id,
			number: tasks.number,
			title: tasks.title,
			priority: tasks.priority,
			dueDate: tasks.dueDate,
			startDate: tasks.startDate,
			estimatePoints: tasks.estimatePoints,
			statusId: tasks.statusId,
			projectId: tasks.projectId,
			createdAt: tasks.createdAt,
			statusName: taskStatuses.name,
			statusColor: taskStatuses.color,
			statusIsClosed: taskStatuses.isClosed,
			projectName: projects.name,
			projectSlug: projects.slug,
			projectColor: projects.color
		})
		.from(tasks)
		.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
		.innerJoin(projects, eq(tasks.projectId, projects.id))
		.where(eq(tasks.assigneeId, user.id))
		.orderBy(tasks.priority, desc(tasks.updatedAt))
		.all();

	return { myTasks };
};
