import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { tasks, projects, taskStatuses, activityLog, users } from '$lib/server/db/schema.js';
import { eq, desc, and, isNotNull } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	// My assigned tasks (across all projects)
	const myTasks = db
		.select({
			id: tasks.id,
			number: tasks.number,
			title: tasks.title,
			priority: tasks.priority,
			dueDate: tasks.dueDate,
			statusId: tasks.statusId,
			projectId: tasks.projectId,
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

	// Project summaries
	const allProjects = db
		.select()
		.from(projects)
		.orderBy(desc(projects.updatedAt))
		.all();

	// Recent activity (last 20 entries)
	const recentActivity = db
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
			userName: users.name
		})
		.from(activityLog)
		.innerJoin(tasks, eq(activityLog.taskId, tasks.id))
		.innerJoin(projects, eq(tasks.projectId, projects.id))
		.innerJoin(users, eq(activityLog.userId, users.id))
		.orderBy(desc(activityLog.createdAt))
		.limit(20)
		.all();

	return {
		myTasks,
		projects: allProjects,
		recentActivity
	};
};
