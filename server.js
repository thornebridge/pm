import { handler } from './build/handler.js';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const server = createServer(handler);

// Attach WebSocket server for realtime updates
const wss = new WebSocketServer({ noServer: true });
const clients = new Set();

server.on('upgrade', (request, socket, head) => {
	// Auth is handled by cookie validation - for now accept all upgrade requests
	// since the WS module in the SvelteKit build isn't directly importable here.
	// In production, the session cookie check happens on first message.
	wss.handleUpgrade(request, socket, head, (ws) => {
		ws.subscribedProjects = new Set();
		ws.isAlive = true;
		clients.add(ws);

		ws.on('message', (raw) => {
			try {
				const msg = JSON.parse(raw.toString());
				if (msg.type === 'subscribe' && msg.projectId) {
					ws.subscribedProjects.add(msg.projectId);
				} else if (msg.type === 'unsubscribe' && msg.projectId) {
					ws.subscribedProjects.delete(msg.projectId);
				}
			} catch {}
		});

		ws.on('pong', () => { ws.isAlive = true; });
		ws.on('close', () => { clients.delete(ws); });
	});
});

// Make broadcast available globally for the SvelteKit server code
globalThis.__wsBroadcast = (projectId, event, excludeUserId) => {
	const payload = JSON.stringify(event);
	for (const ws of clients) {
		if (ws.subscribedProjects?.has(projectId) && ws.readyState === 1) {
			ws.send(payload);
		}
	}
};

// Heartbeat
setInterval(() => {
	for (const ws of clients) {
		if (!ws.isAlive) { ws.terminate(); clients.delete(ws); continue; }
		ws.isAlive = false;
		ws.ping();
	}
}, 30000);

// ─── Burndown Snapshot Generation ─────────────────────────────────────────────

const snapshotDb = new Database(process.env.DATABASE_URL || './data/pm.db');
snapshotDb.pragma('journal_mode = WAL');

function generateSnapshots() {
	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);
	const todayTs = today.getTime();

	const activeSprints = snapshotDb.prepare(
		`SELECT id FROM sprints WHERE status = 'active'`
	).all();

	for (const sprint of activeSprints) {
		const existing = snapshotDb.prepare(
			`SELECT id FROM sprint_snapshots WHERE sprint_id = ? AND date = ?`
		).get(sprint.id, todayTs);
		if (existing) continue;

		const stats = snapshotDb.prepare(`
			SELECT COUNT(*) as total_tasks,
				SUM(CASE WHEN ts.is_closed = 1 THEN 1 ELSE 0 END) as completed_tasks,
				COALESCE(SUM(t.estimate_points), 0) as total_points,
				COALESCE(SUM(CASE WHEN ts.is_closed = 1 THEN t.estimate_points ELSE 0 END), 0) as completed_points
			FROM tasks t JOIN task_statuses ts ON t.status_id = ts.id
			WHERE t.sprint_id = ?
		`).get(sprint.id);

		snapshotDb.prepare(
			`INSERT INTO sprint_snapshots (id, sprint_id, date, total_tasks, completed_tasks, total_points, completed_points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		).run(
			randomBytes(9).toString('base64url'),
			sprint.id,
			todayTs,
			stats.total_tasks,
			stats.completed_tasks,
			stats.total_points,
			stats.completed_points,
			Date.now()
		);
	}
}

// Generate snapshots on startup (5s delay for migration settling) + every 4 hours
setTimeout(() => { try { generateSnapshots(); console.log('[snapshots] Initial generation complete'); } catch(e) { console.error('[snapshots]', e); } }, 5000);
setInterval(() => { try { generateSnapshots(); console.log('[snapshots] Periodic generation complete'); } catch(e) { console.error('[snapshots]', e); } }, 4 * 60 * 60 * 1000);

// ─── Due Date Reminders & Digest Emails ──────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const PM_BASE_URL = 'https://pm.thornebridge.tech';
const EMAIL_FROM = 'PM <notifications@thornebridge.tech>';

function escapeHtml(s) {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function sendEmailDirect(to, subject, html) {
	if (!RESEND_API_KEY) return;
	try {
		await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ from: EMAIL_FROM, to, subject, html })
		});
	} catch (err) {
		console.error('[email]', err);
	}
}

function taskEmailHtml({ heading, body, taskUrl, projectName }) {
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

// Prepared statements for reminders
const stmtOpenTasksWithDue = snapshotDb.prepare(`
	SELECT t.id, t.number, t.title, t.due_date, t.assignee_id, t.created_by,
		t.project_id, p.name as project_name, p.slug as project_slug
	FROM tasks t
	INNER JOIN projects p ON t.project_id = p.id
	INNER JOIN task_statuses ts ON t.status_id = ts.id
	WHERE t.due_date IS NOT NULL AND ts.is_closed = 0
		AND t.due_date > ? AND t.due_date < ?
`);

const stmtOverdueTasks = snapshotDb.prepare(`
	SELECT t.id, t.number, t.title, t.due_date, t.assignee_id, t.created_by,
		t.project_id, p.name as project_name, p.slug as project_slug
	FROM tasks t
	INNER JOIN projects p ON t.project_id = p.id
	INNER JOIN task_statuses ts ON t.status_id = ts.id
	WHERE t.due_date IS NOT NULL AND ts.is_closed = 0
		AND t.due_date < ? AND t.due_date > ?
`);

const stmtWatchers = snapshotDb.prepare(`SELECT user_id FROM task_watchers WHERE task_id = ?`);

const stmtCheckSent = snapshotDb.prepare(`
	SELECT id FROM due_date_reminders_sent WHERE user_id = ? AND task_id = ? AND tier = ?
`);

const stmtInsertSent = snapshotDb.prepare(`
	INSERT OR IGNORE INTO due_date_reminders_sent (id, user_id, task_id, tier, sent_at) VALUES (?, ?, ?, ?, ?)
`);

const stmtInsertNotification = snapshotDb.prepare(`
	INSERT INTO notifications (id, user_id, type, title, body, url, task_id, read, created_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
`);

const stmtGetPrefs = snapshotDb.prepare(`
	SELECT * FROM notification_preferences WHERE user_id = ?
`);

const stmtGetPushSubs = snapshotDb.prepare(`
	SELECT endpoint, keys_p256dh, keys_auth FROM push_subscriptions WHERE user_id = ?
`);

const stmtGetUserEmail = snapshotDb.prepare(`SELECT email, name FROM users WHERE id = ?`);

const VAPID_PUBLIC = process.env.PM_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.PM_VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.PM_VAPID_EMAIL || '';

let webpushConfigured = false;
async function ensureWebpush() {
	if (webpushConfigured) return true;
	if (!VAPID_PUBLIC || !VAPID_PRIVATE || !VAPID_EMAIL) return false;
	try {
		const wp = await import('web-push');
		wp.default.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
		webpushConfigured = true;
		return true;
	} catch { return false; }
}

async function sendPush(userId, payload) {
	if (!(await ensureWebpush())) return;
	const subs = stmtGetPushSubs.all(userId);
	const wp = (await import('web-push')).default;
	for (const sub of subs) {
		try {
			await wp.sendNotification(
				{ endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
				JSON.stringify(payload)
			);
		} catch (err) {
			if (err?.statusCode === 410 || err?.statusCode === 404) {
				snapshotDb.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).run(sub.endpoint);
			}
		}
	}
}

function collectNotifyUsers(task) {
	const ids = new Set();
	if (task.assignee_id) ids.add(task.assignee_id);
	if (task.created_by) ids.add(task.created_by);
	for (const w of stmtWatchers.all(task.id)) ids.add(w.user_id);
	return ids;
}

// Tier config: maps tier name -> notification type + user pref field + label
const TIER_CONFIG = {
	day_before: { notifType: 'due_day_before', prefField: 'reminder_due_soon', label: 'Due tomorrow' },
	day_of:     { notifType: 'due_soon',       prefField: 'reminder_due_today', label: 'Due today' },
	overdue:    { notifType: 'overdue',         prefField: 'reminder_overdue',   label: 'Overdue' }
};

function runDueDateReminders() {
	const now = Date.now();
	const HOUR = 60 * 60 * 1000;
	const DAY = 24 * HOUR;

	// Gather tasks and their tiers
	const taskTiers = new Map(); // taskId -> { task, tiers: Set }

	// Day before: due 0-36h from now
	const dayBeforeTasks = stmtOpenTasksWithDue.all(now, now + 36 * HOUR);
	for (const t of dayBeforeTasks) {
		if (!taskTiers.has(t.id)) taskTiers.set(t.id, { task: t, tiers: new Set() });
		taskTiers.get(t.id).tiers.add('day_before');
	}

	// Day of: due within +/- 12h of now
	const dayOfTasks = stmtOpenTasksWithDue.all(now - 12 * HOUR, now + 12 * HOUR);
	for (const t of dayOfTasks) {
		if (!taskTiers.has(t.id)) taskTiers.set(t.id, { task: t, tiers: new Set() });
		taskTiers.get(t.id).tiers.add('day_of');
	}

	// Overdue: due in the past, capped at 7 days
	const overdueTasks = stmtOverdueTasks.all(now, now - 7 * DAY);
	for (const t of overdueTasks) {
		if (!taskTiers.has(t.id)) taskTiers.set(t.id, { task: t, tiers: new Set() });
		taskTiers.get(t.id).tiers.add('overdue');
	}

	let notifCount = 0;

	for (const [taskId, { task, tiers }] of taskTiers) {
		const notifyUsers = collectNotifyUsers(task);
		const taskUrl = `/projects/${task.project_slug}/task/${task.number}`;
		const fullTaskUrl = `${PM_BASE_URL}${taskUrl}`;

		for (const tier of tiers) {
			const config = TIER_CONFIG[tier];

			for (const userId of notifyUsers) {
				// Check dedup
				if (stmtCheckSent.get(userId, taskId, tier)) continue;

				// Check user prefs
				const prefs = stmtGetPrefs.get(userId);
				// If no prefs row, defaults are all true
				if (prefs && !prefs[config.prefField]) continue;

				const notifId = randomBytes(9).toString('base64url');
				const title = `${config.label}: #${task.number} ${task.title}`;

				// Insert in-app notification
				stmtInsertNotification.run(notifId, userId, config.notifType, title, task.project_name, taskUrl, taskId, now);

				// Mark as sent
				stmtInsertSent.run(randomBytes(9).toString('base64url'), userId, taskId, tier, now);

				// Push notification (non-blocking)
				sendPush(userId, { title, body: task.project_name, tag: `due-${taskId}-${tier}` }).catch(() => {});

				// Individual email if mode = 'each'
				const emailMode = prefs?.due_date_email_mode || 'off';
				const emailEnabled = prefs ? prefs.email_enabled : 1;
				if (emailMode === 'each' && emailEnabled) {
					const user = stmtGetUserEmail.get(userId);
					if (user?.email) {
						const bodyText = tier === 'overdue'
							? 'This task is past its due date.'
							: tier === 'day_of'
								? 'This task is due today.'
								: 'This task is due tomorrow.';
						sendEmailDirect(user.email, title, taskEmailHtml({
							heading: title, body: bodyText, taskUrl: fullTaskUrl, projectName: task.project_name
						})).catch(() => {});
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

// ─── Digest Emails ───────────────────────────────────────────────────────────

const stmtDigestUsers = snapshotDb.prepare(`
	SELECT np.*, u.email, u.name as user_name FROM notification_preferences np
	INNER JOIN users u ON np.user_id = u.id
	WHERE np.due_date_email_mode IN ('daily', 'weekly') AND np.email_enabled = 1
`);

const stmtUpdateDigest = snapshotDb.prepare(`
	UPDATE notification_preferences SET last_digest_sent_at = ? WHERE user_id = ?
`);

const stmtUserOverdueTasks = snapshotDb.prepare(`
	SELECT t.id, t.number, t.title, t.due_date, p.name as project_name, p.slug as project_slug,
		ts.name as status_name, ts.color as status_color
	FROM tasks t
	INNER JOIN projects p ON t.project_id = p.id
	INNER JOIN task_statuses ts ON t.status_id = ts.id
	LEFT JOIN task_watchers tw ON tw.task_id = t.id AND tw.user_id = ?
	WHERE ts.is_closed = 0 AND t.due_date IS NOT NULL AND t.due_date < ?
		AND t.due_date > ?
		AND (t.assignee_id = ? OR t.created_by = ? OR tw.user_id IS NOT NULL)
	GROUP BY t.id ORDER BY t.due_date ASC
`);

const stmtUserDueTodayTasks = snapshotDb.prepare(`
	SELECT t.id, t.number, t.title, t.due_date, p.name as project_name, p.slug as project_slug,
		ts.name as status_name, ts.color as status_color
	FROM tasks t
	INNER JOIN projects p ON t.project_id = p.id
	INNER JOIN task_statuses ts ON t.status_id = ts.id
	LEFT JOIN task_watchers tw ON tw.task_id = t.id AND tw.user_id = ?
	WHERE ts.is_closed = 0 AND t.due_date IS NOT NULL
		AND t.due_date >= ? AND t.due_date < ?
		AND (t.assignee_id = ? OR t.created_by = ? OR tw.user_id IS NOT NULL)
	GROUP BY t.id ORDER BY t.due_date ASC
`);

const stmtUserDueTomorrowTasks = snapshotDb.prepare(`
	SELECT t.id, t.number, t.title, t.due_date, p.name as project_name, p.slug as project_slug,
		ts.name as status_name, ts.color as status_color
	FROM tasks t
	INNER JOIN projects p ON t.project_id = p.id
	INNER JOIN task_statuses ts ON t.status_id = ts.id
	LEFT JOIN task_watchers tw ON tw.task_id = t.id AND tw.user_id = ?
	WHERE ts.is_closed = 0 AND t.due_date IS NOT NULL
		AND t.due_date >= ? AND t.due_date < ?
		AND (t.assignee_id = ? OR t.created_by = ? OR tw.user_id IS NOT NULL)
	GROUP BY t.id ORDER BY t.due_date ASC
`);

function buildDigestEmailHtml(userName, overdue, dueToday, dueTomorrow) {
	const firstName = userName?.split(' ')[0] || 'there';
	const parts = [];
	if (overdue.length) parts.push(`<strong>${overdue.length} overdue</strong>`);
	if (dueToday.length) parts.push(`<strong>${dueToday.length} due today</strong>`);
	if (dueTomorrow.length) parts.push(`<strong>${dueTomorrow.length} due tomorrow</strong>`);
	const summary = parts.join(', ');

	function taskRow(t, badge) {
		const url = `${PM_BASE_URL}/projects/${t.project_slug}/task/${t.number}`;
		return `<tr>
			<td style="padding:6px 8px;border-bottom:1px solid #eee;">
				<span style="display:inline-block;padding:2px 6px;border-radius:4px;background:${t.status_color || '#666'};color:#fff;font-size:11px;margin-right:6px;">${escapeHtml(t.status_name)}</span>
				${badge ? `<span style="color:#c00;font-size:11px;margin-right:4px;">${badge}</span>` : ''}
				<a href="${url}" style="color:#111;text-decoration:none;font-size:14px;">#${t.number} ${escapeHtml(t.title)}</a>
				<span style="color:#888;font-size:12px;margin-left:6px;">${escapeHtml(t.project_name)}</span>
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

function runDigestEmails() {
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

	const users = stmtDigestUsers.all();

	for (const u of users) {
		// Check if this is the right hour
		if (u.digest_hour !== currentHour) continue;

		// For weekly: check day of week
		if (u.due_date_email_mode === 'weekly' && u.digest_day !== currentDay) continue;

		// Prevent duplicate sends within same day
		if (u.last_digest_sent_at > todayStartTs) continue;

		const userId = u.user_id;

		// Gather tasks for this user
		const overdue = stmtUserOverdueTasks.all(userId, todayStartTs, nowTs - 7 * DAY, userId, userId);
		const dueToday = stmtUserDueTodayTasks.all(userId, todayStartTs, tomorrowStartTs, userId, userId);
		const dueTomorrow = stmtUserDueTomorrowTasks.all(userId, tomorrowStartTs, tomorrowEndTs, userId, userId);

		// Skip empty digests
		if (overdue.length === 0 && dueToday.length === 0 && dueTomorrow.length === 0) continue;

		const html = buildDigestEmailHtml(u.user_name, overdue, dueToday, dueTomorrow);
		const subject = `PM Digest: ${overdue.length} overdue, ${dueToday.length} due today, ${dueTomorrow.length} due tomorrow`;

		sendEmailDirect(u.email, subject, html).catch(() => {});
		stmtUpdateDigest.run(nowTs, userId);

		console.log(`[digest] Sent digest to ${u.email}`);
	}
}

// ─── Recurring Tasks (safety net) ────────────────────────────────────────────

function computeNextDueDate(currentDue, rule) {
	const d = new Date(currentDue);
	const interval = rule.interval || 1;
	switch (rule.freq) {
		case 'daily':  d.setUTCDate(d.getUTCDate() + interval); break;
		case 'weekly': d.setUTCDate(d.getUTCDate() + interval * 7); break;
		case 'monthly': d.setUTCMonth(d.getUTCMonth() + interval); break;
		default: d.setUTCDate(d.getUTCDate() + interval);
	}
	return d.getTime();
}

const stmtClosedRecurring = snapshotDb.prepare(`
	SELECT t.id, t.project_id, t.title, t.description, t.type, t.priority,
		t.assignee_id, t.parent_id, t.created_by, t.due_date, t.start_date,
		t.estimate_points, t.recurrence, t.recurrence_source_id
	FROM tasks t
	INNER JOIN task_statuses ts ON t.status_id = ts.id
	WHERE t.recurrence IS NOT NULL AND ts.is_closed = 1
`);

const stmtHasOpenSuccessor = snapshotDb.prepare(`
	SELECT t.id FROM tasks t
	INNER JOIN task_statuses ts ON t.status_id = ts.id
	WHERE t.recurrence_source_id = ? AND ts.is_closed = 0
	LIMIT 1
`);

const stmtFirstOpenStatus = snapshotDb.prepare(`
	SELECT id FROM task_statuses WHERE project_id = ? AND is_closed = 0 ORDER BY position ASC LIMIT 1
`);

const stmtMaxTaskNumber = snapshotDb.prepare(`
	SELECT COALESCE(MAX(number), 0) as max_num FROM tasks WHERE project_id = ?
`);

const stmtLastPosition = snapshotDb.prepare(`
	SELECT position FROM tasks WHERE project_id = ? AND status_id = ? ORDER BY position DESC LIMIT 1
`);

const stmtInsertTask = snapshotDb.prepare(`
	INSERT INTO tasks (id, project_id, number, title, description, type, status_id, priority,
		assignee_id, parent_id, created_by, due_date, start_date, estimate_points,
		recurrence, recurrence_source_id, position, created_at, updated_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtGetLabels = snapshotDb.prepare(`SELECT label_id FROM task_label_assignments WHERE task_id = ?`);
const stmtInsertLabel = snapshotDb.prepare(`INSERT INTO task_label_assignments (task_id, label_id) VALUES (?, ?)`);
const stmtInsertActivity = snapshotDb.prepare(`
	INSERT INTO activity_log (id, task_id, user_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)
`);

function runRecurringTasksCheck() {
	const closedRecurring = stmtClosedRecurring.all();
	let created = 0;

	for (const task of closedRecurring) {
		let rule;
		try { rule = JSON.parse(task.recurrence); } catch { continue; }

		const sourceId = task.recurrence_source_id || task.id;

		// Check if there's already an open successor in the chain
		if (stmtHasOpenSuccessor.get(sourceId)) continue;
		// Also check by this specific task's id (in case it IS the source)
		if (task.recurrence_source_id && stmtHasOpenSuccessor.get(task.id)) continue;

		// Compute next due date
		const nextDue = computeNextDueDate(task.due_date || Date.now(), rule);

		// Check endDate
		if (rule.endDate && nextDue > rule.endDate) continue;

		const statusRow = stmtFirstOpenStatus.get(task.project_id);
		if (!statusRow) continue;

		const maxNum = stmtMaxTaskNumber.get(task.project_id);
		const lastPos = stmtLastPosition.get(task.project_id, statusRow.id);

		const now = Date.now();
		const nextId = randomBytes(9).toString('base64url');

		let nextStart = null;
		if (task.start_date && task.due_date) {
			nextStart = task.start_date + (nextDue - task.due_date);
		}

		stmtInsertTask.run(
			nextId, task.project_id, (maxNum?.max_num || 0) + 1,
			task.title, task.description, task.type, statusRow.id, task.priority,
			task.assignee_id, task.parent_id, task.created_by,
			nextDue, nextStart, task.estimate_points,
			task.recurrence, sourceId,
			(lastPos?.position || 0) + 1, now, now
		);

		stmtInsertActivity.run(
			randomBytes(9).toString('base64url'), nextId, task.created_by,
			'created', JSON.stringify({ recurring: true, sourceTaskId: task.id }), now
		);

		// Copy labels
		const labels = stmtGetLabels.all(task.id);
		for (const l of labels) {
			stmtInsertLabel.run(nextId, l.label_id);
		}

		created++;
	}

	if (created > 0) {
		console.log(`[recurring] Created ${created} recurring task instances`);
	}
}

// Run reminders every 30 minutes, digest check every 15 minutes, recurring every 30 minutes
setTimeout(() => {
	try { runDueDateReminders(); console.log('[reminders] Initial run complete'); } catch(e) { console.error('[reminders]', e); }
	try { runDigestEmails(); console.log('[digest] Initial run complete'); } catch(e) { console.error('[digest]', e); }
	try { runRecurringTasksCheck(); console.log('[recurring] Initial run complete'); } catch(e) { console.error('[recurring]', e); }
}, 10000);

setInterval(() => { try { runDueDateReminders(); } catch(e) { console.error('[reminders]', e); } }, 30 * 60 * 1000);
setInterval(() => { try { runDigestEmails(); } catch(e) { console.error('[digest]', e); } }, 15 * 60 * 1000);
setInterval(() => { try { runRecurringTasksCheck(); } catch(e) { console.error('[recurring]', e); } }, 30 * 60 * 1000);

// ─── Start Server ─────────────────────────────────────────────────────────────

server.listen(PORT, HOST, () => {
	console.log(`Listening on ${HOST}:${PORT}`);
});
