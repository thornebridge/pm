import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { sprints, tasks, taskStatuses } from '$lib/server/db/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const { project } = await parent();

	const allSprints = db
		.select()
		.from(sprints)
		.where(eq(sprints.projectId, project.id))
		.orderBy(desc(sprints.createdAt))
		.all();

	// Count tasks per sprint with completion info
	const sprintStats = allSprints.map((sprint) => {
		const sprintTasks = db
			.select({
				id: tasks.id,
				isClosed: taskStatuses.isClosed,
				estimatePoints: tasks.estimatePoints
			})
			.from(tasks)
			.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
			.where(eq(tasks.sprintId, sprint.id))
			.all();

		const total = sprintTasks.length;
		const done = sprintTasks.filter((t) => t.isClosed).length;
		const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.estimatePoints || 0), 0);
		const donePoints = sprintTasks.filter((t) => t.isClosed).reduce((sum, t) => sum + (t.estimatePoints || 0), 0);

		return { ...sprint, total, done, totalPoints, donePoints };
	});

	return { sprints: sprintStats };
};
