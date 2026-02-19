import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { tasks, taskStatuses, users, sprints, sprintSnapshots, activityLog } from '$lib/server/db/schema.js';
import { eq, and, desc, sql, gte } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const { project } = await parent();

	// Status distribution
	const statusDist = db
		.select({
			name: taskStatuses.name,
			color: taskStatuses.color,
			count: sql<number>`count(*)`.as('count')
		})
		.from(tasks)
		.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
		.where(eq(tasks.projectId, project.id))
		.groupBy(taskStatuses.id)
		.orderBy(taskStatuses.position)
		.all();

	// Priority breakdown
	const priorityDist = db
		.select({
			priority: tasks.priority,
			count: sql<number>`count(*)`.as('count')
		})
		.from(tasks)
		.where(eq(tasks.projectId, project.id))
		.groupBy(tasks.priority)
		.all();

	// Team workload (tasks per assignee)
	const workload = db
		.select({
			name: users.name,
			count: sql<number>`count(*)`.as('count')
		})
		.from(tasks)
		.innerJoin(users, eq(tasks.assigneeId, users.id))
		.where(eq(tasks.projectId, project.id))
		.groupBy(users.id)
		.all();

	// Sprint velocity
	const completedSprints = db
		.select()
		.from(sprints)
		.where(and(eq(sprints.projectId, project.id), eq(sprints.status, 'completed')))
		.orderBy(sprints.createdAt)
		.all();

	const sprintVelocity = completedSprints.map((sprint) => {
		const sprintTasks = db
			.select({
				estimatePoints: tasks.estimatePoints,
				isClosed: taskStatuses.isClosed
			})
			.from(tasks)
			.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
			.where(eq(tasks.sprintId, sprint.id))
			.all();

		const totalPoints = sprintTasks.reduce((s, t) => s + (t.estimatePoints || 0), 0);
		const completedPoints = sprintTasks.filter((t) => t.isClosed).reduce((s, t) => s + (t.estimatePoints || 0), 0);

		return { name: sprint.name, totalPoints, completedPoints };
	});

	// Burndown snapshots for active sprint
	const activeSprint = db
		.select()
		.from(sprints)
		.where(and(eq(sprints.projectId, project.id), eq(sprints.status, 'active')))
		.get();

	let burndownSnapshots: Array<{
		date: number;
		totalTasks: number;
		completedTasks: number;
		totalPoints: number;
		completedPoints: number;
	}> = [];

	if (activeSprint) {
		burndownSnapshots = db
			.select()
			.from(sprintSnapshots)
			.where(eq(sprintSnapshots.sprintId, activeSprint.id))
			.orderBy(sprintSnapshots.date)
			.all();
	}

	// Daily activity for last 30 days
	const thirtyDaysAgo = Date.now() - 30 * 86400000;
	const dailyActivity = db
		.select({
			date: sql<string>`date(${activityLog.createdAt}/1000, 'unixepoch')`.as('date'),
			count: sql<number>`count(*)`.as('count')
		})
		.from(activityLog)
		.innerJoin(tasks, eq(activityLog.taskId, tasks.id))
		.where(and(eq(tasks.projectId, project.id), gte(activityLog.createdAt, thirtyDaysAgo)))
		.groupBy(sql`date(${activityLog.createdAt}/1000, 'unixepoch')`)
		.orderBy(sql`date(${activityLog.createdAt}/1000, 'unixepoch')`)
		.all();

	return {
		statusDist,
		priorityDist,
		workload,
		sprintVelocity,
		burndownSnapshots,
		activeSprint,
		dailyActivity
	};
};
