import { db } from '$lib/server/db/index.js';
import { sprints, sprintSnapshots, tasks, taskStatuses } from '$lib/server/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * Generate daily burndown snapshots for all active sprints.
 * For each active sprint, if no snapshot exists for today (UTC midnight),
 * counts total/completed tasks and points, then inserts a snapshot row.
 */
export async function generateSnapshots() {
	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);
	const todayTs = today.getTime();

	const activeSprints = await db
		.select({ id: sprints.id })
		.from(sprints)
		.where(eq(sprints.status, 'active'));

	for (const sprint of activeSprints) {
		// Check if a snapshot already exists for today
		const [existing] = await db
			.select({ id: sprintSnapshots.id })
			.from(sprintSnapshots)
			.where(and(eq(sprintSnapshots.sprintId, sprint.id), eq(sprintSnapshots.date, todayTs)))
			.limit(1);

		if (existing) continue;

		// Count tasks and points for this sprint
		const [stats] = await db
			.select({
				totalTasks: sql<number>`count(*)`.as('total_tasks'),
				completedTasks: sql<number>`sum(case when ${taskStatuses.isClosed} = true then 1 else 0 end)`.as('completed_tasks'),
				totalPoints: sql<number>`coalesce(sum(${tasks.estimatePoints}), 0)`.as('total_points'),
				completedPoints: sql<number>`coalesce(sum(case when ${taskStatuses.isClosed} = true then ${tasks.estimatePoints} else 0 end), 0)`.as('completed_points')
			})
			.from(tasks)
			.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
			.where(eq(tasks.sprintId, sprint.id));

		await db.insert(sprintSnapshots).values({
			id: nanoid(),
			sprintId: sprint.id,
			date: todayTs,
			totalTasks: Number(stats?.totalTasks ?? 0),
			completedTasks: Number(stats?.completedTasks ?? 0),
			totalPoints: Number(stats?.totalPoints ?? 0),
			completedPoints: Number(stats?.completedPoints ?? 0),
			createdAt: Date.now()
		});
	}
}

/**
 * Start the snapshot poller: runs immediately after a 5s delay,
 * then every 4 hours.
 */
export function startSnapshotPoller() {
	setTimeout(async () => {
		try {
			await generateSnapshots();
			console.log('[snapshots] Initial generation complete');
		} catch (e) {
			console.error('[snapshots]', e);
		}
	}, 5000);

	setInterval(async () => {
		try {
			await generateSnapshots();
			console.log('[snapshots] Periodic generation complete');
		} catch (e) {
			console.error('[snapshots]', e);
		}
	}, 4 * 60 * 60 * 1000);
}
