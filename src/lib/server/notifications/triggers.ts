import { db } from '../db/index.js';
import { notificationPreferences, users, tasks } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sendPushNotification } from './push.js';

function getPrefs(userId: string) {
	return db
		.select()
		.from(notificationPreferences)
		.where(eq(notificationPreferences.userId, userId))
		.get();
}

export async function notifyTaskAssigned(taskId: string, assigneeId: string, assignedByName: string) {
	const prefs = getPrefs(assigneeId);
	if (prefs && !prefs.onAssigned) return;

	const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
	if (!task) return;

	await sendPushNotification(assigneeId, {
		title: `Assigned: #${task.number} ${task.title}`,
		body: `${assignedByName} assigned you`,
		url: `/projects`, // Would need slug lookup for full URL
		tag: `task-${taskId}`
	});
}

export async function notifyStatusChanged(taskId: string, changedByUserId: string, changedByName: string) {
	const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
	if (!task || !task.assigneeId || task.assigneeId === changedByUserId) return;

	const prefs = getPrefs(task.assigneeId);
	if (prefs && !prefs.onStatusChange) return;

	await sendPushNotification(task.assigneeId, {
		title: `#${task.number} ${task.title}`,
		body: `${changedByName} changed the status`,
		tag: `task-${taskId}`
	});
}

export async function notifyNewComment(taskId: string, commentByUserId: string, commentByName: string) {
	const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
	if (!task) return;

	// Notify assignee and creator (excluding the commenter)
	const notifyIds = new Set<string>();
	if (task.assigneeId) notifyIds.add(task.assigneeId);
	if (task.createdBy) notifyIds.add(task.createdBy);
	notifyIds.delete(commentByUserId);

	for (const userId of notifyIds) {
		const prefs = getPrefs(userId);
		if (prefs && !prefs.onComment) continue;

		await sendPushNotification(userId, {
			title: `#${task.number} ${task.title}`,
			body: `${commentByName} commented`,
			tag: `task-${taskId}-comment`
		});
	}
}
