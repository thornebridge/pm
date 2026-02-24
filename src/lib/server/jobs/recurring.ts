import { db } from '$lib/server/db/index.js';
import { tasks, taskStatuses, taskLabelAssignments, activityLog } from '$lib/server/db/schema.js';
import { eq, and, sql, isNotNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface RecurrenceRule {
	freq: 'daily' | 'weekly' | 'monthly';
	interval?: number;
	endDate?: number;
}

/**
 * Compute the next due date based on the current due date and recurrence rule.
 */
function computeNextDueDate(currentDue: number, rule: RecurrenceRule): number {
	const d = new Date(currentDue);
	const interval = rule.interval || 1;
	switch (rule.freq) {
		case 'daily':
			d.setUTCDate(d.getUTCDate() + interval);
			break;
		case 'weekly':
			d.setUTCDate(d.getUTCDate() + interval * 7);
			break;
		case 'monthly':
			d.setUTCMonth(d.getUTCMonth() + interval);
			break;
		default:
			d.setUTCDate(d.getUTCDate() + interval);
	}
	return d.getTime();
}

/**
 * Check all closed recurring tasks and create the next instance if one
 * doesn't already exist. Copies labels and inserts an activity log entry.
 */
export async function runRecurringTasksCheck() {
	// Find all closed tasks that have a recurrence rule
	const closedRecurring = await db
		.select({
			id: tasks.id,
			projectId: tasks.projectId,
			title: tasks.title,
			description: tasks.description,
			type: tasks.type,
			priority: tasks.priority,
			assigneeId: tasks.assigneeId,
			parentId: tasks.parentId,
			createdBy: tasks.createdBy,
			dueDate: tasks.dueDate,
			startDate: tasks.startDate,
			estimatePoints: tasks.estimatePoints,
			recurrence: tasks.recurrence,
			recurrenceSourceId: tasks.recurrenceSourceId
		})
		.from(tasks)
		.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
		.where(and(isNotNull(tasks.recurrence), eq(taskStatuses.isClosed, true)));

	let created = 0;

	for (const task of closedRecurring) {
		// Parse recurrence JSON
		let rule: RecurrenceRule;
		try {
			rule = JSON.parse(task.recurrence!);
		} catch {
			continue;
		}

		const sourceId = task.recurrenceSourceId || task.id;

		// Check if there's already an open successor in the chain (by source)
		const [openBySource] = await db
			.select({ id: tasks.id })
			.from(tasks)
			.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
			.where(and(eq(tasks.recurrenceSourceId, sourceId), eq(taskStatuses.isClosed, false)))
			.limit(1);

		if (openBySource) continue;

		// Also check by this specific task's id (in case it IS the source)
		if (task.recurrenceSourceId) {
			const [openByTask] = await db
				.select({ id: tasks.id })
				.from(tasks)
				.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
				.where(and(eq(tasks.recurrenceSourceId, task.id), eq(taskStatuses.isClosed, false)))
				.limit(1);

			if (openByTask) continue;
		}

		// Compute next due date
		const nextDue = computeNextDueDate(task.dueDate || Date.now(), rule);

		// Check endDate — if past end, skip
		if (rule.endDate && nextDue > rule.endDate) continue;

		// Find first open status for the project
		const [statusRow] = await db
			.select({ id: taskStatuses.id })
			.from(taskStatuses)
			.where(and(eq(taskStatuses.projectId, task.projectId), eq(taskStatuses.isClosed, false)))
			.orderBy(taskStatuses.position)
			.limit(1);

		if (!statusRow) continue;

		// Get max task number for the project
		const [maxNumRow] = await db
			.select({ maxNum: sql<number>`coalesce(max(${tasks.number}), 0)`.as('max_num') })
			.from(tasks)
			.where(eq(tasks.projectId, task.projectId));

		// Get last position in that status
		const [lastPosRow] = await db
			.select({ position: tasks.position })
			.from(tasks)
			.where(and(eq(tasks.projectId, task.projectId), eq(tasks.statusId, statusRow.id)))
			.orderBy(sql`${tasks.position} desc`)
			.limit(1);

		const now = Date.now();
		const nextId = nanoid();

		// Compute next start date if both start and due existed
		let nextStart: number | null = null;
		if (task.startDate && task.dueDate) {
			nextStart = task.startDate + (nextDue - task.dueDate);
		}

		// Insert the new recurring task instance
		await db.insert(tasks).values({
			id: nextId,
			projectId: task.projectId,
			number: (Number(maxNumRow?.maxNum) || 0) + 1,
			title: task.title,
			description: task.description,
			type: task.type,
			statusId: statusRow.id,
			priority: task.priority,
			assigneeId: task.assigneeId,
			parentId: task.parentId,
			createdBy: task.createdBy,
			dueDate: nextDue,
			startDate: nextStart,
			estimatePoints: task.estimatePoints,
			recurrence: task.recurrence,
			recurrenceSourceId: sourceId,
			position: (lastPosRow?.position || 0) + 1,
			createdAt: now,
			updatedAt: now
		});

		// Insert activity log entry
		await db.insert(activityLog).values({
			id: nanoid(),
			taskId: nextId,
			userId: task.createdBy,
			action: 'created',
			detail: JSON.stringify({ recurring: true, sourceTaskId: task.id }),
			createdAt: now
		});

		// Copy label assignments from the source task
		const labels = await db
			.select({ labelId: taskLabelAssignments.labelId })
			.from(taskLabelAssignments)
			.where(eq(taskLabelAssignments.taskId, task.id));

		for (const l of labels) {
			await db.insert(taskLabelAssignments).values({
				taskId: nextId,
				labelId: l.labelId
			});
		}

		created++;
	}

	if (created > 0) {
		console.log(`[recurring] Created ${created} recurring task instances`);
	}
}

/**
 * Start the recurring tasks poller: runs immediately after a 10s delay,
 * then every 30 minutes.
 */
export function startRecurringTaskPoller() {
	setTimeout(async () => {
		try {
			await runRecurringTasksCheck();
			console.log('[recurring] Initial run complete');
		} catch (e) {
			console.error('[recurring]', e);
		}
	}, 10000);

	setInterval(async () => {
		try {
			await runRecurringTasksCheck();
			console.log('[recurring] Periodic check complete');
		} catch (e) {
			console.error('[recurring]', e);
		}
	}, 30 * 60 * 1000);
}
