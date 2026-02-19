import { db } from '../db/index.js';
import { tasks, projects, notifications, notificationPreferences, users, taskWatchers } from '../db/schema.js';
import { eq, and, lte, gt, isNotNull, sql } from 'drizzle-orm';
import { sendPushNotification } from '../notifications/push.js';
import { sendEmail, taskEmailHtml } from '../notifications/email.js';
import { nanoid } from 'nanoid';

let lastRun = 0;
const INTERVAL = 60 * 60 * 1000; // Check every hour

export function checkDueDateReminders() {
	const now = Date.now();
	if (now - lastRun < INTERVAL) return;
	lastRun = now;

	runReminders().catch(() => {});
}

async function runReminders() {
	const now = Date.now();
	const tomorrow = now + 24 * 60 * 60 * 1000;

	// Find tasks due within 24 hours or overdue within the last 24h
	const dueSoon = db
		.select({
			id: tasks.id,
			number: tasks.number,
			title: tasks.title,
			dueDate: tasks.dueDate,
			assigneeId: tasks.assigneeId,
			createdBy: tasks.createdBy,
			projectId: tasks.projectId,
			projectName: projects.name,
			projectSlug: projects.slug
		})
		.from(tasks)
		.innerJoin(projects, eq(tasks.projectId, projects.id))
		.where(
			and(
				isNotNull(tasks.dueDate),
				lte(tasks.dueDate, tomorrow),
				gt(tasks.dueDate, now - 24 * 60 * 60 * 1000)
			)
		)
		.all();

	for (const task of dueSoon) {
		if (!task.dueDate) continue;

		const isOverdue = task.dueDate < now;
		const label = isOverdue ? 'Overdue' : 'Due soon';
		const type = isOverdue ? 'overdue' : 'due_soon';

		// Collect users to notify
		const notifyIds = new Set<string>();
		if (task.assigneeId) notifyIds.add(task.assigneeId);
		if (task.createdBy) notifyIds.add(task.createdBy);

		const watchers = db
			.select({ userId: taskWatchers.userId })
			.from(taskWatchers)
			.where(eq(taskWatchers.taskId, task.id))
			.all();
		for (const w of watchers) notifyIds.add(w.userId);

		for (const userId of notifyIds) {
			// Dedupe: check if we already notified within the interval
			const existing = db
				.select({ id: notifications.id })
				.from(notifications)
				.where(
					and(
						eq(notifications.userId, userId),
						eq(notifications.taskId, task.id),
						eq(notifications.type, type as any),
						sql`${notifications.createdAt} > ${now - INTERVAL}`
					)
				)
				.get();

			if (existing) continue;

			db.insert(notifications)
				.values({
					id: nanoid(12),
					userId,
					taskId: task.id,
					type: type as 'due_soon' | 'overdue',
					title: `${label}: #${task.number} ${task.title}`,
					body: task.projectName,
					url: `/projects/${task.projectSlug}/task/${task.number}`,
					read: false,
					createdAt: now
				})
				.run();

			sendPushNotification(userId, {
				title: `${label}: #${task.number} ${task.title}`,
				body: task.projectName,
				tag: `due-${task.id}-${type}`
			}).catch(() => {});

			// Send email if enabled
			const prefs = db
				.select({ emailEnabled: notificationPreferences.emailEnabled })
				.from(notificationPreferences)
				.where(eq(notificationPreferences.userId, userId))
				.get();

			if (!prefs || prefs.emailEnabled !== false) {
				const userRecord = db
					.select({ email: users.email })
					.from(users)
					.where(eq(users.id, userId))
					.get();

				if (userRecord?.email) {
					const taskLink = `https://pm.thornebridge.tech/projects/${task.projectSlug}/task/${task.number}`;
					sendEmail(
						userRecord.email,
						`${label}: #${task.number} ${task.title}`,
						taskEmailHtml({
							heading: `${label}: #${task.number} ${task.title}`,
							body: isOverdue
								? 'This task is past its due date.'
								: 'This task is due within 24 hours.',
							taskUrl: taskLink,
							projectName: task.projectName
						})
					).catch(() => {});
				}
			}
		}
	}
}
