import { db } from '$lib/server/db/index.js';
import {
	tasks,
	taskStatuses,
	projects,
	taskWatchers,
	notificationPreferences,
	users
} from '$lib/server/db/schema.js';
import { eq, and, gt, lt, gte, isNotNull, or, sql } from 'drizzle-orm';
import { escapeHtml, sendEmailDirect } from './reminders.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const PM_BASE_URL = 'https://pm.thornebridge.tech';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DigestTask {
	id: string;
	number: number;
	title: string;
	dueDate: number | null;
	projectName: string;
	projectSlug: string;
	statusName: string;
	statusColor: string;
}

// ─── Query Helpers ───────────────────────────────────────────────────────────

const digestTaskColumns = {
	id: tasks.id,
	number: tasks.number,
	title: tasks.title,
	dueDate: tasks.dueDate,
	projectName: projects.name,
	projectSlug: projects.slug,
	statusName: taskStatuses.name,
	statusColor: taskStatuses.color
};

/**
 * Fetch open tasks for a user (as assignee, creator, or watcher) within a due-date range.
 * For overdue, pass rangeEnd < rangeStart conceptually — the caller handles the semantics.
 */
async function fetchUserTasksInRange(
	userId: string,
	dueAfter: number,
	dueBefore: number
): Promise<DigestTask[]> {
	return db
		.selectDistinctOn([tasks.id], digestTaskColumns)
		.from(tasks)
		.innerJoin(projects, eq(tasks.projectId, projects.id))
		.innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
		.leftJoin(
			taskWatchers,
			and(eq(taskWatchers.taskId, tasks.id), eq(taskWatchers.userId, userId))
		)
		.where(
			and(
				eq(taskStatuses.isClosed, false),
				isNotNull(tasks.dueDate),
				gt(tasks.dueDate, dueAfter),
				lt(tasks.dueDate, dueBefore),
				or(
					eq(tasks.assigneeId, userId),
					eq(tasks.createdBy, userId),
					isNotNull(taskWatchers.userId)
				)
			)
		)
		.orderBy(tasks.id, tasks.dueDate);
}

// ─── Digest Email HTML ───────────────────────────────────────────────────────

function buildDigestEmailHtml(
	userName: string | null,
	overdue: DigestTask[],
	dueToday: DigestTask[],
	dueTomorrow: DigestTask[]
): string {
	const firstName = userName?.split(' ')[0] || 'there';
	const parts: string[] = [];
	if (overdue.length) parts.push(`<strong>${overdue.length} overdue</strong>`);
	if (dueToday.length) parts.push(`<strong>${dueToday.length} due today</strong>`);
	if (dueTomorrow.length) parts.push(`<strong>${dueTomorrow.length} due tomorrow</strong>`);
	const summary = parts.join(', ');

	function taskRow(t: DigestTask, badge: string): string {
		const url = `${PM_BASE_URL}/projects/${t.projectSlug}/task/${t.number}`;
		return `<tr>
			<td style="padding:6px 8px;border-bottom:1px solid #eee;">
				<span style="display:inline-block;padding:2px 6px;border-radius:4px;background:${t.statusColor || '#666'};color:#fff;font-size:11px;margin-right:6px;">${escapeHtml(t.statusName)}</span>
				${badge ? `<span style="color:#c00;font-size:11px;margin-right:4px;">${badge}</span>` : ''}
				<a href="${url}" style="color:#111;text-decoration:none;font-size:14px;">#${t.number} ${escapeHtml(t.title)}</a>
				<span style="color:#888;font-size:12px;margin-left:6px;">${escapeHtml(t.projectName)}</span>
			</td>
		</tr>`;
	}

	let tableRows = '';
	for (const t of overdue) tableRows += taskRow(t, 'OVERDUE');
	for (const t of dueToday) tableRows += taskRow(t, 'TODAY');
	for (const t of dueTomorrow) tableRows += taskRow(t, '');

	return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
    <div style="padding:24px;">
      <h2 style="margin:0 0 8px;font-size:16px;color:#111;">Hi ${escapeHtml(firstName)},</h2>
      <p style="margin:0 0 16px;color:#444;font-size:14px;">You have ${summary}.</p>
      <table style="width:100%;border-collapse:collapse;">${tableRows}</table>
      <a href="${PM_BASE_URL}" style="display:inline-block;margin-top:20px;padding:8px 16px;background:#2d4f3e;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;">Open PM</a>
    </div>
    <div style="padding:12px 24px;background:#fafafa;border-top:1px solid #e5e5e5;">
      <p style="margin:0;color:#999;font-size:11px;">
        <a href="${PM_BASE_URL}/settings" style="color:#999;">Manage notification settings</a>
        &mdash; Sent by PM
      </p>
    </div>
  </div>
</body></html>`;
}

// ─── Main Digest Logic ───────────────────────────────────────────────────────

async function runDigestEmails(): Promise<void> {
	const now = new Date();
	const currentHour = now.getUTCHours();
	const currentDay = now.getUTCDay(); // 0=Sun, 1=Mon, ...
	const nowTs = Date.now();
	const DAY = 24 * 60 * 60 * 1000;

	// Start of today (UTC)
	const todayStart = new Date(now);
	todayStart.setUTCHours(0, 0, 0, 0);
	const todayStartTs = todayStart.getTime();
	const tomorrowStartTs = todayStartTs + DAY;
	const tomorrowEndTs = tomorrowStartTs + DAY;

	// Find users with digest preferences enabled
	const digestUsers = await db
		.select({
			userId: notificationPreferences.userId,
			dueDateEmailMode: notificationPreferences.dueDateEmailMode,
			digestHour: notificationPreferences.digestHour,
			digestDay: notificationPreferences.digestDay,
			lastDigestSentAt: notificationPreferences.lastDigestSentAt,
			emailEnabled: notificationPreferences.emailEnabled,
			email: users.email,
			userName: users.name
		})
		.from(notificationPreferences)
		.innerJoin(users, eq(notificationPreferences.userId, users.id))
		.where(
			and(
				or(
					eq(notificationPreferences.dueDateEmailMode, 'daily'),
					eq(notificationPreferences.dueDateEmailMode, 'weekly')
				),
				eq(notificationPreferences.emailEnabled, true)
			)
		);

	for (const u of digestUsers) {
		// Check if this is the right hour
		if (u.digestHour !== currentHour) continue;

		// For weekly: check day of week
		if (u.dueDateEmailMode === 'weekly' && u.digestDay !== currentDay) continue;

		// Prevent duplicate sends within same day
		if (u.lastDigestSentAt > todayStartTs) continue;

		const userId = u.userId;

		// Gather tasks for this user
		const overdue = await fetchUserTasksInRange(userId, nowTs - 7 * DAY, todayStartTs);
		const dueToday = await fetchUserTasksInRange(userId, todayStartTs, tomorrowStartTs);
		const dueTomorrow = await fetchUserTasksInRange(userId, tomorrowStartTs, tomorrowEndTs);

		// Skip empty digests
		if (overdue.length === 0 && dueToday.length === 0 && dueTomorrow.length === 0) continue;

		const html = buildDigestEmailHtml(u.userName, overdue, dueToday, dueTomorrow);
		const subject = `PM Digest: ${overdue.length} overdue, ${dueToday.length} due today, ${dueTomorrow.length} due tomorrow`;

		sendEmailDirect(u.email, subject, html).catch(() => {});

		// Update last_digest_sent_at
		await db
			.update(notificationPreferences)
			.set({ lastDigestSentAt: nowTs })
			.where(eq(notificationPreferences.userId, userId));

		console.log(`[digest] Sent digest to ${u.email}`);
	}
}

// ─── Poller ──────────────────────────────────────────────────────────────────

export function startDigestPoller(): void {
	// Initial run after 10s delay
	setTimeout(async () => {
		try {
			await runDigestEmails();
			console.log('[digest] Initial run complete');
		} catch (e) {
			console.error('[digest]', e);
		}
	}, 10_000);

	// Then every 15 minutes
	setInterval(async () => {
		try {
			await runDigestEmails();
		} catch (e) {
			console.error('[digest]', e);
		}
	}, 15 * 60 * 1000);
}
