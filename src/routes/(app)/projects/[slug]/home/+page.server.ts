import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { tasks, taskStatuses, users, sprints, sprintSnapshots, activityLog } from '$lib/server/db/schema.js';
import { eq, and, desc, sql, gte, lt, isNull, not } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const { project } = await parent();

	// Status distribution (include isClosed + position for summary metrics)
	const statusDist = db
		.select({
			name: taskStatuses.name,
			color: taskStatuses.color,
			isClosed: taskStatuses.isClosed,
			position: taskStatuses.position,
			count: sql<number>`count(*)`.as('count')
		})
		.from(tasks)
		.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
		.where(eq(tasks.projectId, project.id))
		.groupBy(taskStatuses.id)
		.orderBy(taskStatuses.position)
		.all();

	// Derive isFirst: lowest position in this result set
	const minPosition = statusDist.length > 0 ? Math.min(...statusDist.map((s) => s.position)) : 0;
	const statusDistWithFirst = statusDist.map((s) => ({
		...s,
		isFirst: s.position === minPosition
	}));

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

	// Overdue count: dueDate < now AND status is not closed
	const now = Date.now();
	const overdueResult = db
		.select({
			count: sql<number>`count(*)`.as('count')
		})
		.from(tasks)
		.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
		.where(
			and(
				eq(tasks.projectId, project.id),
				lt(tasks.dueDate, now),
				not(taskStatuses.isClosed)
			)
		)
		.get();
	const overdueCount = overdueResult?.count ?? 0;

	// Recently updated tasks (top 8)
	const recentTasks = db
		.select({
			id: tasks.id,
			number: tasks.number,
			title: tasks.title,
			updatedAt: tasks.updatedAt,
			statusName: taskStatuses.name,
			statusColor: taskStatuses.color
		})
		.from(tasks)
		.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
		.where(eq(tasks.projectId, project.id))
		.orderBy(desc(tasks.updatedAt))
		.limit(8)
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
		statusDist: statusDistWithFirst,
		priorityDist,
		workload,
		overdueCount,
		recentTasks,
		sprintVelocity,
		burndownSnapshots,
		activeSprint,
		dailyActivity
	};
};
