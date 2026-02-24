import { db } from '../db/index.js';
import { notificationPreferences, users, tasks, projects, taskWatchers, notifications } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sendPushNotification } from './push.js';
import { sendEmail, taskEmailHtml } from './email.js';
import { nanoid } from 'nanoid';

async function getPrefs(userId: string) {
	const [row] = await db
		.select()
		.from(notificationPreferences)
		.where(eq(notificationPreferences.userId, userId));
	return row;
}

async function getUserEmail(userId: string): Promise<string | null> {
	const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
	return user?.email ?? null;
}

async function getTaskWithProject(taskId: string) {
	const [row] = await db
		.select({
			id: tasks.id,
			number: tasks.number,
			title: tasks.title,
			projectId: tasks.projectId,
			projectSlug: projects.slug,
			projectName: projects.name,
			assigneeId: tasks.assigneeId,
			createdBy: tasks.createdBy
		})
		.from(tasks)
		.innerJoin(projects, eq(tasks.projectId, projects.id))
		.where(eq(tasks.id, taskId));
	return row;
}

function taskUrl(projectSlug: string, taskNumber: number): string {
	return `https://pm.thornebridge.tech/projects/${projectSlug}/task/${taskNumber}`;
}

async function getWatcherIds(taskId: string): Promise<string[]> {
	const rows = await db
		.select({ userId: taskWatchers.userId })
		.from(taskWatchers)
		.where(eq(taskWatchers.taskId, taskId));
	return rows.map((w) => w.userId);
}

async function sendNotification(
	record: {
		userId: string;
		type: 'mention' | 'assigned' | 'status_change' | 'comment';
		title: string;
		body?: string;
		url?: string;
		taskId?: string;
		actorId?: string;
	},
	prefs: Awaited<ReturnType<typeof getPrefs>>,
	push: { title: string; body: string; url?: string; tag?: string },
	email: { subject: string; heading: string; body: string; taskUrl?: string; projectName?: string }
) {
	// Insert in-app notification
	await db.insert(notifications).values({
		id: nanoid(12),
		userId: record.userId,
		type: record.type,
		title: record.title,
		body: record.body ?? null,
		url: record.url ?? null,
		taskId: record.taskId ?? null,
		actorId: record.actorId ?? null,
		read: false,
		createdAt: Date.now()
	});

	await sendPushNotification(record.userId, push);

	if (!prefs || prefs.emailEnabled !== false) {
		const addr = await getUserEmail(record.userId);
		if (addr) {
			sendEmail(addr, email.subject, taskEmailHtml(email)).catch(() => {});
		}
	}
}

export async function notifyTaskAssigned(taskId: string, assigneeId: string, assignedByName: string, assignedById: string) {
	const prefs = await getPrefs(assigneeId);
	if (prefs && !prefs.onAssigned) return;

	const task = await getTaskWithProject(taskId);
	if (!task) return;

	const url = taskUrl(task.projectSlug, task.number);

	await sendNotification(
		{
			userId: assigneeId,
			type: 'assigned',
			title: `Assigned: #${task.number} ${task.title}`,
			body: `${assignedByName} assigned you`,
			url: `/projects/${task.projectSlug}/task/${task.number}`,
			taskId,
			actorId: assignedById
		},
		prefs,
		{
			title: `Assigned: #${task.number} ${task.title}`,
			body: `${assignedByName} assigned you`,
			url: `/projects/${task.projectSlug}/task/${task.number}`,
			tag: `task-${taskId}`
		},
		{
			subject: `Assigned: #${task.number} ${task.title}`,
			heading: `You've been assigned #${task.number} ${task.title}`,
			body: `${assignedByName} assigned this task to you.`,
			taskUrl: url,
			projectName: task.projectName
		}
	);
}

export async function notifyStatusChanged(taskId: string, changedByUserId: string, changedByName: string) {
	const task = await getTaskWithProject(taskId);
	if (!task) return;

	const notifyIds = new Set<string>();
	if (task.assigneeId) notifyIds.add(task.assigneeId);
	if (task.createdBy) notifyIds.add(task.createdBy);
	for (const id of await getWatcherIds(taskId)) notifyIds.add(id);
	notifyIds.delete(changedByUserId);

	const url = taskUrl(task.projectSlug, task.number);

	for (const userId of notifyIds) {
		const prefs = await getPrefs(userId);
		if (prefs && !prefs.onStatusChange) continue;

		await sendNotification(
			{
				userId,
				type: 'status_change',
				title: `#${task.number} ${task.title}`,
				body: `${changedByName} changed the status`,
				url: `/projects/${task.projectSlug}/task/${task.number}`,
				taskId,
				actorId: changedByUserId
			},
			prefs,
			{
				title: `#${task.number} ${task.title}`,
				body: `${changedByName} changed the status`,
				tag: `task-${taskId}`
			},
			{
				subject: `Status changed: #${task.number} ${task.title}`,
				heading: `#${task.number} ${task.title}`,
				body: `${changedByName} changed the status of this task.`,
				taskUrl: url,
				projectName: task.projectName
			}
		);
	}
}

export async function notifyMention(taskId: string, mentionedUserId: string, mentionedByName: string, mentionedById: string) {
	const prefs = await getPrefs(mentionedUserId);
	if (prefs && !prefs.onComment) return;

	const task = await getTaskWithProject(taskId);
	if (!task) return;

	const url = taskUrl(task.projectSlug, task.number);

	await sendNotification(
		{
			userId: mentionedUserId,
			type: 'mention',
			title: `Mentioned in #${task.number} ${task.title}`,
			body: `${mentionedByName} mentioned you in a comment`,
			url: `/projects/${task.projectSlug}/task/${task.number}`,
			taskId,
			actorId: mentionedById
		},
		prefs,
		{
			title: `Mentioned in #${task.number} ${task.title}`,
			body: `${mentionedByName} mentioned you in a comment`,
			tag: `task-${taskId}-mention`
		},
		{
			subject: `Mentioned: #${task.number} ${task.title}`,
			heading: `You were mentioned in #${task.number} ${task.title}`,
			body: `${mentionedByName} mentioned you in a comment.`,
			taskUrl: url,
			projectName: task.projectName
		}
	);
}

export async function notifyNewComment(taskId: string, commentByUserId: string, commentByName: string) {
	const task = await getTaskWithProject(taskId);
	if (!task) return;

	const notifyIds = new Set<string>();
	if (task.assigneeId) notifyIds.add(task.assigneeId);
	if (task.createdBy) notifyIds.add(task.createdBy);
	for (const id of await getWatcherIds(taskId)) notifyIds.add(id);
	notifyIds.delete(commentByUserId);

	const url = taskUrl(task.projectSlug, task.number);

	for (const userId of notifyIds) {
		const prefs = await getPrefs(userId);
		if (prefs && !prefs.onComment) continue;

		await sendNotification(
			{
				userId,
				type: 'comment',
				title: `#${task.number} ${task.title}`,
				body: `${commentByName} commented`,
				url: `/projects/${task.projectSlug}/task/${task.number}`,
				taskId,
				actorId: commentByUserId
			},
			prefs,
			{
				title: `#${task.number} ${task.title}`,
				body: `${commentByName} commented`,
				tag: `task-${taskId}-comment`
			},
			{
				subject: `New comment: #${task.number} ${task.title}`,
				heading: `#${task.number} ${task.title}`,
				body: `${commentByName} commented on this task.`,
				taskUrl: url,
				projectName: task.projectName
			}
		);
	}
}
