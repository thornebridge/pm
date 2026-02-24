import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { tasks, projects, taskStatuses, activityLog, users, sprints } from '$lib/server/db/schema.js';
import { eq, desc, and, isNull } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const now = Date.now();
	const weekFromNow = now + 7 * 86400000;

	// My assigned tasks (across all projects)
	const myTasks = await db
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
		.where(and(eq(tasks.assigneeId, user.id), isNull(tasks.parentId)))
		.orderBy(tasks.priority, desc(tasks.updatedAt));

	// Project summaries
	const allProjects = await db
		.select()
		.from(projects)
		.orderBy(desc(projects.updatedAt));

	// Recent activity (last 10 entries for dashboard)
	const recentActivity = await db
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
		.limit(10);

	// Overdue tasks assigned to me (open only)
	const overdueTasks = myTasks.filter((t) => t.dueDate && t.dueDate < now && !t.statusIsClosed);

	// Priority breakdown (open tasks)
	const openTasks = myTasks.filter((t) => !t.statusIsClosed);
	const priorityCounts = {
		urgent: openTasks.filter((t) => t.priority === 'urgent').length,
		high: openTasks.filter((t) => t.priority === 'high').length,
		medium: openTasks.filter((t) => t.priority === 'medium').length,
		low: openTasks.filter((t) => t.priority === 'low').length
	};

	// Upcoming due dates (next 7 days, my tasks, open only)
	const upcomingDue = myTasks
		.filter((t) => t.dueDate && t.dueDate >= now && t.dueDate <= weekFromNow && !t.statusIsClosed)
		.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0))
		.slice(0, 10);

	// Active sprints with progress
	const activeSprints = await db
		.select({
			id: sprints.id,
			name: sprints.name,
			endDate: sprints.endDate,
			projectId: sprints.projectId,
			projectName: projects.name,
			projectSlug: projects.slug
		})
		.from(sprints)
		.innerJoin(projects, eq(sprints.projectId, projects.id))
		.where(eq(sprints.status, 'active'));

	const sprintSummaries = await Promise.all(activeSprints.map(async (s) => {
		const sprintTasks = await db
			.select({
				isClosed: taskStatuses.isClosed
			})
			.from(tasks)
			.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
			.where(eq(tasks.sprintId, s.id));

		return {
			...s,
			totalTasks: sprintTasks.length,
			completedTasks: sprintTasks.filter((t) => t.isClosed).length
		};
	}));

	return {
		myTasks,
		projects: allProjects,
		recentActivity,
		overdueTasks,
		priorityCounts,
		upcomingDue,
		activeSprints: sprintSummaries
	};
};
