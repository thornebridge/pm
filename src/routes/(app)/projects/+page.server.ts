import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { projects, tasks, taskStatuses } from '$lib/server/db/schema.js';
import { desc, eq, sql } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const allProjects = await db.select().from(projects).orderBy(desc(projects.updatedAt));

	const now = Date.now();

	// Aggregate task stats per project
	const stats = await db
		.select({
			projectId: tasks.projectId,
			total: sql<number>`count(*)`.as('total'),
			completed: sql<number>`sum(case when ${taskStatuses.isClosed} = true then 1 else 0 end)`.as('completed'),
			overdue: sql<number>`sum(case when ${taskStatuses.isClosed} = false and ${tasks.dueDate} is not null and ${tasks.dueDate} < ${now} then 1 else 0 end)`.as('overdue')
		})
		.from(tasks)
		.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
		.groupBy(tasks.projectId);

	const statsMap = new Map(stats.map((s) => [s.projectId, s]));

	const projectsWithStats = allProjects.map((p) => {
		const s = statsMap.get(p.id);
		const { logoData, logoMimeType, ...rest } = p;
		return {
			...rest,
			hasLogo: !!logoData,
			taskTotal: s?.total ?? 0,
			taskCompleted: s?.completed ?? 0,
			taskOverdue: s?.overdue ?? 0
		};
	});

	return { projects: projectsWithStats };
};
