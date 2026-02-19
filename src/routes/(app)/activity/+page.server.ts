import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { activityLog, tasks, projects, users } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const activity = db
		.select({
			id: activityLog.id,
			action: activityLog.action,
			detail: activityLog.detail,
			createdAt: activityLog.createdAt,
			taskId: activityLog.taskId,
			taskTitle: tasks.title,
			taskNumber: tasks.number,
			projectSlug: projects.slug,
			projectName: projects.name,
			projectColor: projects.color,
			userName: users.name
		})
		.from(activityLog)
		.innerJoin(tasks, eq(activityLog.taskId, tasks.id))
		.innerJoin(projects, eq(tasks.projectId, projects.id))
		.innerJoin(users, eq(activityLog.userId, users.id))
		.orderBy(desc(activityLog.createdAt))
		.limit(100)
		.all();

	return { activity };
};
