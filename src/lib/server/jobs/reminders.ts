import { db } from '$lib/server/db/index.js';
import {
	tasks,
	taskStatuses,
	projects,
	taskWatchers,
	dueDateRemindersSent,
	notificationPreferences,
	notifications,
	pushSubscriptions,
	users
} from '$lib/server/db/schema.js';
import { eq, and, sql, gt, lt, isNotNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import webpush from 'web-push';

// ─── Config ──────────────────────────────────────────────────────────────────

const PM_BASE_URL = 'https://pm.thornebridge.tech';
const EMAIL_FROM = 'PM <notifications@thornebridge.tech>';

// ─── HTML Helpers ────────────────────────────────────────────────────────────

export function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function taskEmailHtml({
	heading,
	body,
	taskUrl,
	projectName
}: {
	heading: string;
	body: string;
	taskUrl: string;
	projectName: string;
}): string {
	const button = taskUrl
		? `<a href="${taskUrl}" style="display:inline-block;margin-top:16px;padding:8px 16px;background:#2d4f3e;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;">View Task</a>`
		: '';
	const project = projectName
		? `<p style="margin:4px 0 0;color:#888;font-size:12px;">${escapeHtml(projectName)}</p>`
		: '';
	return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
    <div style="padding:24px;">
      <h2 style="margin:0 0 8px;font-size:16px;color:#111;">${escapeHtml(heading)}</h2>
      <p style="margin:0;color:#444;font-size:14px;line-height:1.5;">${escapeHtml(body)}</p>
      ${project}
      ${button}
    </div>
    <div style="padding:12px 24px;background:#fafafa;border-top:1px solid #e5e5e5;">
      <p style="margin:0;color:#999;font-size:11px;">Sent by PM &mdash; <a href="${PM_BASE_URL}" style="color:#999;">pm.thornebridge.tech</a></p>
    </div>
  </div>
</body></html>`;
}

// ─── Email via Resend ────────────────────────────────────────────────────────

export async function sendEmailDirect(
	to: string,
	subject: string,
	html: string
): Promise<void> {
	const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
	if (!RESEND_API_KEY) return;
	try {
		await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ from: EMAIL_FROM, to, subject, html })
		});
	} catch (err) {
		console.error('[email]', err);
	}
}

// ─── Web Push ────────────────────────────────────────────────────────────────

let webpushConfigured = false;

function ensureWebpush(): boolean {
	if (webpushConfigured) return true;
	const VAPID_PUBLIC = process.env.PM_VAPID_PUBLIC_KEY || '';
	const VAPID_PRIVATE = process.env.PM_VAPID_PRIVATE_KEY || '';
	const VAPID_EMAIL = process.env.PM_VAPID_EMAIL || '';
	if (!VAPID_PUBLIC || !VAPID_PRIVATE || !VAPID_EMAIL) return false;
	try {
		webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
		webpushConfigured = true;
		return true;
	} catch {
		return false;
	}
}

async function sendPush(
	userId: string,
	payload: { title: string; body: string; tag: string }
): Promise<void> {
	if (!ensureWebpush()) return;
	const subs = await db
		.select({
			endpoint: pushSubscriptions.endpoint,
			keysP256dh: pushSubscriptions.keysP256dh,
			keysAuth: pushSubscriptions.keysAuth
		})
		.from(pushSubscriptions)
		.where(eq(pushSubscriptions.userId, userId));

	for (const sub of subs) {
		try {
			await webpush.sendNotification(
				{
					endpoint: sub.endpoint,
					keys: { p256dh: sub.keysP256dh, auth: sub.keysAuth }
				},
				JSON.stringify(payload)
			);
		} catch (err: unknown) {
			if (err && typeof err === 'object' && 'statusCode' in err) {
				const statusCode = (err as { statusCode: number }).statusCode;
				if (statusCode === 410 || statusCode === 404) {
					await db
						.delete(pushSubscriptions)
						.where(eq(pushSubscriptions.endpoint, sub.endpoint));
				}
			}
		}
	}
}

// ─── Tier Config ─────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<
	string,
	{
		notifType: 'due_day_before' | 'due_soon' | 'overdue';
		prefField: 'reminderDueSoon' | 'reminderDueToday' | 'reminderOverdue';
		label: string;
	}
> = {
	day_before: {
		notifType: 'due_day_before',
		prefField: 'reminderDueSoon',
		label: 'Due tomorrow'
	},
	day_of: {
		notifType: 'due_soon',
		prefField: 'reminderDueToday',
		label: 'Due today'
	},
	overdue: {
		notifType: 'overdue',
		prefField: 'reminderOverdue',
		label: 'Overdue'
	}
};

// ─── Query Helpers ───────────────────────────────────────────────────────────

interface TaskRow {
	id: string;
	number: number;
	title: string;
	dueDate: number | null;
	assigneeId: string | null;
	createdBy: string;
	projectId: string;
	projectName: string;
	projectSlug: string;
}

const taskColumns = {
	id: tasks.id,
	number: tasks.number,
	title: tasks.title,
	dueDate: tasks.dueDate,
	assigneeId: tasks.assigneeId,
	createdBy: tasks.createdBy,
	projectId: tasks.projectId,
	projectName: projects.name,
	projectSlug: projects.slug
};

async function fetchOpenTasksWithDueInRange(
	rangeStart: number,
	rangeEnd: number
): Promise<TaskRow[]> {
	return db
		.select(taskColumns)
		.from(tasks)
		.innerJoin(projects, eq(tasks.projectId, projects.id))
		.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
		.where(
			and(
				isNotNull(tasks.dueDate),
				eq(taskStatuses.isClosed, false),
				gt(tasks.dueDate, rangeStart),
				lt(tasks.dueDate, rangeEnd)
			)
		);
}

async function fetchOverdueTasks(
	before: number,
	after: number
): Promise<TaskRow[]> {
	return db
		.select(taskColumns)
		.from(tasks)
		.innerJoin(projects, eq(tasks.projectId, projects.id))
		.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
		.where(
			and(
				isNotNull(tasks.dueDate),
				eq(taskStatuses.isClosed, false),
				lt(tasks.dueDate, before),
				gt(tasks.dueDate, after)
			)
		);
}

async function collectNotifyUsers(task: TaskRow): Promise<Set<string>> {
	const ids = new Set<string>();
	if (task.assigneeId) ids.add(task.assigneeId);
	if (task.createdBy) ids.add(task.createdBy);
	const watchers = await db
		.select({ userId: taskWatchers.userId })
		.from(taskWatchers)
		.where(eq(taskWatchers.taskId, task.id));
	for (const w of watchers) ids.add(w.userId);
	return ids;
}

// ─── Main Reminder Logic ─────────────────────────────────────────────────────

async function runDueDateReminders(): Promise<void> {
	const now = Date.now();
	const HOUR = 60 * 60 * 1000;
	const DAY = 24 * HOUR;

	// Gather tasks and their tiers
	const taskTiers = new Map<
		string,
		{ task: TaskRow; tiers: Set<string> }
	>();

	// Day before: due 0-36h from now
	const dayBeforeTasks = await fetchOpenTasksWithDueInRange(now, now + 36 * HOUR);
	for (const t of dayBeforeTasks) {
		if (!taskTiers.has(t.id)) taskTiers.set(t.id, { task: t, tiers: new Set() });
		taskTiers.get(t.id)!.tiers.add('day_before');
	}

	// Day of: due within +/- 12h of now
	const dayOfTasks = await fetchOpenTasksWithDueInRange(now - 12 * HOUR, now + 12 * HOUR);
	for (const t of dayOfTasks) {
		if (!taskTiers.has(t.id)) taskTiers.set(t.id, { task: t, tiers: new Set() });
		taskTiers.get(t.id)!.tiers.add('day_of');
	}

	// Overdue: due in the past, capped at 7 days
	const overdueTasks = await fetchOverdueTasks(now, now - 7 * DAY);
	for (const t of overdueTasks) {
		if (!taskTiers.has(t.id)) taskTiers.set(t.id, { task: t, tiers: new Set() });
		taskTiers.get(t.id)!.tiers.add('overdue');
	}

	let notifCount = 0;

	for (const [taskId, { task, tiers }] of taskTiers) {
		const notifyUsers = await collectNotifyUsers(task);
		const taskUrl = `/projects/${task.projectSlug}/task/${task.number}`;
		const fullTaskUrl = `${PM_BASE_URL}${taskUrl}`;

		for (const tier of tiers) {
			const config = TIER_CONFIG[tier];

			for (const userId of notifyUsers) {
				// Check dedup
				const alreadySent = await db
					.select({ id: dueDateRemindersSent.id })
					.from(dueDateRemindersSent)
					.where(
						and(
							eq(dueDateRemindersSent.userId, userId),
							eq(dueDateRemindersSent.taskId, taskId),
							eq(dueDateRemindersSent.tier, tier as 'day_before' | 'day_of' | 'overdue')
						)
					)
					.limit(1);
				if (alreadySent.length > 0) continue;

				// Check user prefs
				const [prefs] = await db
					.select()
					.from(notificationPreferences)
					.where(eq(notificationPreferences.userId, userId))
					.limit(1);
				// If no prefs row, defaults are all true
				if (prefs && !prefs[config.prefField]) continue;

				const notifId = nanoid();
				const title = `${config.label}: #${task.number} ${task.title}`;

				// Insert in-app notification
				await db.insert(notifications).values({
					id: notifId,
					userId,
					type: config.notifType,
					title,
					body: task.projectName,
					url: taskUrl,
					taskId,
					read: false,
					createdAt: now
				});

				// Mark as sent in dedup table
				await db
					.insert(dueDateRemindersSent)
					.values({
						id: nanoid(),
						userId,
						taskId,
						tier: tier as 'day_before' | 'day_of' | 'overdue',
						sentAt: now
					})
					.onConflictDoNothing();

				// Push notification (non-blocking)
				sendPush(userId, {
					title,
					body: task.projectName,
					tag: `due-${taskId}-${tier}`
				}).catch(() => {});

				// Individual email if mode = 'each'
				const emailMode = prefs?.dueDateEmailMode || 'off';
				const emailEnabled = prefs ? prefs.emailEnabled : true;
				if (emailMode === 'each' && emailEnabled) {
					const [user] = await db
						.select({ email: users.email, name: users.name })
						.from(users)
						.where(eq(users.id, userId))
						.limit(1);
					if (user?.email) {
						const bodyText =
							tier === 'overdue'
								? 'This task is past its due date.'
								: tier === 'day_of'
									? 'This task is due today.'
									: 'This task is due tomorrow.';
						sendEmailDirect(
							user.email,
							title,
							taskEmailHtml({
								heading: title,
								body: bodyText,
								taskUrl: fullTaskUrl,
								projectName: task.projectName
							})
						).catch(() => {});
					}
				}

				notifCount++;
			}
		}
	}

	if (notifCount > 0) {
		console.log(`[reminders] Sent ${notifCount} due date reminders`);
	}
}

// ─── Poller ──────────────────────────────────────────────────────────────────

export function startReminderPoller(): void {
	// Initial run after 10s delay
	setTimeout(async () => {
		try {
			await runDueDateReminders();
			console.log('[reminders] Initial run complete');
		} catch (e) {
			console.error('[reminders]', e);
		}
	}, 10_000);

	// Then every 30 minutes
	setInterval(async () => {
		try {
			await runDueDateReminders();
		} catch (e) {
			console.error('[reminders]', e);
		}
	}, 30 * 60 * 1000);
}
