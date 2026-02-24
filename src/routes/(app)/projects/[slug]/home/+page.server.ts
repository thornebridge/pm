import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { tasks, taskStatuses, users, sprints, sprintSnapshots, activityLog } from '$lib/server/db/schema.js';
import { eq, and, desc, sql, gte, lt, isNull, not } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const { project } = await parent();

	// Status distribution (include isClosed + position for summary metrics)
	const statusDist = await db
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
		.orderBy(taskStatuses.position);

	// Derive isFirst: lowest position in this result set
	const minPosition = statusDist.length > 0 ? Math.min(...statusDist.map((s) => s.position)) : 0;
	const statusDistWithFirst = statusDist.map((s) => ({
		...s,
		isFirst: s.position === minPosition
	}));

	// Priority breakdown
	const priorityDist = await db
		.select({
			priority: tasks.priority,
			count: sql<number>`count(*)`.as('count')
		})
		.from(tasks)
		.where(eq(tasks.projectId, project.id))
		.groupBy(tasks.priority);

	// Team workload (tasks per assignee)
	const workload = await db
		.select({
			name: users.name,
			count: sql<number>`count(*)`.as('count')
		})
		.from(tasks)
		.innerJoin(users, eq(tasks.assigneeId, users.id))
		.where(eq(tasks.projectId, project.id))
		.groupBy(users.id);

	// Overdue count: dueDate < now AND status is not closed
	const now = Date.now();
	const [overdueResult] = await db
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
		);
	const overdueCount = overdueResult?.count ?? 0;

	// Recently updated tasks (top 8)
	const recentTasks = await db
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
		.limit(8);

	// Sprint velocity
	const completedSprints = await db
		.select()
		.from(sprints)
		.where(and(eq(sprints.projectId, project.id), eq(sprints.status, 'completed')))
		.orderBy(sprints.createdAt);

	const sprintVelocity = [];
	for (const sprint of completedSprints) {
		const sprintTasks = await db
			.select({
				estimatePoints: tasks.estimatePoints,
				isClosed: taskStatuses.isClosed
			})
			.from(tasks)
			.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
			.where(eq(tasks.sprintId, sprint.id));

		const totalPoints = sprintTasks.reduce((s, t) => s + (t.estimatePoints || 0), 0);
		const completedPoints = sprintTasks.filter((t) => t.isClosed).reduce((s, t) => s + (t.estimatePoints || 0), 0);

		sprintVelocity.push({ name: sprint.name, totalPoints, completedPoints });
	}

	// Burndown snapshots for active sprint
	const [activeSprint] = await db
		.select()
		.from(sprints)
		.where(and(eq(sprints.projectId, project.id), eq(sprints.status, 'active')));

	let burndownSnapshots: Array<{
		date: number;
		totalTasks: number;
		completedTasks: number;
		totalPoints: number;
		completedPoints: number;
	}> = [];

	if (activeSprint) {
		burndownSnapshots = await db
			.select()
			.from(sprintSnapshots)
			.where(eq(sprintSnapshots.sprintId, activeSprint.id))
			.orderBy(sprintSnapshots.date);
	}

	// Daily activity for last 30 days
	const thirtyDaysAgo = Date.now() - 30 * 86400000;
	const dailyActivity = await db
		.select({
			date: sql<string>`to_char(to_timestamp(${activityLog.createdAt}::double precision / 1000), 'YYYY-MM-DD')`.as('date'),
			count: sql<number>`count(*)`.as('count')
		})
		.from(activityLog)
		.innerJoin(tasks, eq(activityLog.taskId, tasks.id))
		.where(and(eq(tasks.projectId, project.id), gte(activityLog.createdAt, thirtyDaysAgo)))
		.groupBy(sql`to_char(to_timestamp(${activityLog.createdAt}::double precision / 1000), 'YYYY-MM-DD')`)
		.orderBy(sql`to_char(to_timestamp(${activityLog.createdAt}::double precision / 1000), 'YYYY-MM-DD')`);

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
