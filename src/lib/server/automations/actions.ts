import { db } from '../db/index.js';
import {
	tasks, comments, activityLog, taskLabelAssignments, notifications
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { AUTOMATION_USER_ID } from '../db/seed.js';
import { sendPushNotification } from '../notifications/push.js';
import type {
	ActionDef, ActionResult, ActionSetField, ActionAddLabel,
	ActionRemoveLabel, ActionAddComment, ActionSendNotification,
	ActionFireWebhook
} from './types.js';
import crypto from 'node:crypto';

function renderTemplate(template: string, task: Record<string, unknown>): string {
	return template
		.replace(/\{\{task\.title\}\}/g, String(task.title || ''))
		.replace(/\{\{task\.number\}\}/g, String(task.number || ''))
		.replace(/\{\{task\.id\}\}/g, String(task.id || ''));
}

export async function executeAction(
	action: ActionDef,
	taskId: string,
	task: Record<string, unknown>,
	projectId: string
): Promise<ActionResult> {
	switch (action.type) {
		case 'set_field':
			return executeSetField(action, taskId);
		case 'add_label':
			return executeAddLabel(action, taskId);
		case 'remove_label':
			return executeRemoveLabel(action, taskId);
		case 'add_comment':
			return executeAddComment(action, taskId, task);
		case 'send_notification':
			return executeSendNotification(action, taskId, task, projectId);
		case 'fire_webhook':
			return executeFireWebhook(action, taskId, task, projectId);
		default:
			return { action: (action as ActionDef).type, result: 'unknown_action' };
	}
}

async function executeSetField(action: ActionSetField, taskId: string): Promise<ActionResult> {
	const now = Date.now();
	const updates: Record<string, unknown> = { updatedAt: now };
	updates[action.field] = action.value;

	await db.update(tasks).set(updates).where(eq(tasks.id, taskId));

	await db.insert(activityLog).values({
		id: nanoid(12),
		taskId,
		userId: AUTOMATION_USER_ID,
		action: action.field === 'statusId' ? 'status_changed'
			: action.field === 'priority' ? 'priority_changed'
			: action.field === 'assigneeId' ? 'assigned'
			: 'edited',
		detail: JSON.stringify({ field: action.field, to: action.value, automated: true }),
		createdAt: now
	});

	return { action: 'set_field', result: `Set ${action.field} to ${action.value}` };
}

async function executeAddLabel(action: ActionAddLabel, taskId: string): Promise<ActionResult> {
	await db.insert(taskLabelAssignments)
		.values({ taskId, labelId: action.labelId })
		.onConflictDoNothing();

	await db.insert(activityLog).values({
		id: nanoid(12),
		taskId,
		userId: AUTOMATION_USER_ID,
		action: 'label_added',
		detail: JSON.stringify({ labelId: action.labelId, automated: true }),
		createdAt: Date.now()
	});

	return { action: 'add_label', result: `Added label ${action.labelId}` };
}

async function executeRemoveLabel(action: ActionRemoveLabel, taskId: string): Promise<ActionResult> {
	await db.delete(taskLabelAssignments)
		.where(and(eq(taskLabelAssignments.taskId, taskId), eq(taskLabelAssignments.labelId, action.labelId)));

	await db.insert(activityLog).values({
		id: nanoid(12),
		taskId,
		userId: AUTOMATION_USER_ID,
		action: 'label_removed',
		detail: JSON.stringify({ labelId: action.labelId, automated: true }),
		createdAt: Date.now()
	});

	return { action: 'remove_label', result: `Removed label ${action.labelId}` };
}

async function executeAddComment(action: ActionAddComment, taskId: string, task: Record<string, unknown>): Promise<ActionResult> {
	const body = renderTemplate(action.body, task);
	const now = Date.now();
	const id = nanoid(12);

	await db.insert(comments).values({
		id,
		taskId,
		userId: AUTOMATION_USER_ID,
		body,
		createdAt: now,
		updatedAt: now
	});

	await db.insert(activityLog).values({
		id: nanoid(12),
		taskId,
		userId: AUTOMATION_USER_ID,
		action: 'commented',
		detail: JSON.stringify({ commentId: id, automated: true }),
		createdAt: now
	});

	return { action: 'add_comment', result: `Added comment: ${body.slice(0, 80)}` };
}

async function executeSendNotification(
	action: ActionSendNotification,
	taskId: string,
	task: Record<string, unknown>,
	projectId: string
): Promise<ActionResult> {
	const title = renderTemplate(action.title, task);
	const body = renderTemplate(action.body, task);

	let targetUserId: string | null = null;

	if (action.target === 'assignee') {
		targetUserId = task.assigneeId as string | null;
	} else if (action.target === 'creator') {
		targetUserId = task.createdBy as string | null;
	} else {
		targetUserId = action.target;
	}

	if (!targetUserId) {
		return { action: 'send_notification', result: 'skipped — no target user' };
	}

	await db.insert(notifications).values({
		id: nanoid(12),
		userId: targetUserId,
		type: 'status_change',
		title,
		body,
		url: null,
		taskId,
		actorId: AUTOMATION_USER_ID,
		read: false,
		createdAt: Date.now()
	});

	sendPushNotification(targetUserId, { title, body, tag: `automation-${taskId}` }).catch(() => {});

	return { action: 'send_notification', result: `Notified ${action.target}` };
}

async function executeFireWebhook(
	action: ActionFireWebhook,
	taskId: string,
	task: Record<string, unknown>,
	projectId: string
): Promise<ActionResult> {
	const payload = JSON.stringify({
		event: 'automation.fired',
		timestamp: Date.now(),
		data: { projectId, taskId, task }
	});

	const signature = action.secret
		? crypto.createHmac('sha256', action.secret).update(payload).digest('hex')
		: '';

	await fetch(action.url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Webhook-Signature': signature
		},
		body: payload,
		signal: AbortSignal.timeout(10_000)
	});

	return { action: 'fire_webhook', result: `Webhook sent to ${action.url}` };
}
