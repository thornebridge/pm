import { db } from '../db/index.js';
import {
	crmOpportunities, crmActivities, crmTasks, crmCompanies, notifications
} from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { AUTOMATION_USER_ID } from '../db/seed.js';
import { sendPushNotification } from '../notifications/push.js';
import { indexDocument } from '../search/meilisearch.js';
import type {
	CrmActionDef, CrmActionResult, CrmActionSetField, CrmActionLogActivity,
	CrmActionCreateTask, CrmActionSendNotification, CrmActionFireWebhook,
	CrmAutomationPayload
} from './types.js';
import crypto from 'node:crypto';

function renderTemplate(template: string, entity: Record<string, unknown>): string {
	return template
		.replace(/\{\{opp\.title\}\}/g, String(entity.title || ''))
		.replace(/\{\{opp\.id\}\}/g, String(entity.id || ''))
		.replace(/\{\{opp\.value\}\}/g, String(entity.value || ''))
		.replace(/\{\{company\.name\}\}/g, (() => {
			if (entity.companyId) {
				const c = db.select({ name: crmCompanies.name }).from(crmCompanies).where(eq(crmCompanies.id, entity.companyId as string)).get();
				return c?.name || '';
			}
			return '';
		})());
}

export async function executeCrmAction(
	action: CrmActionDef,
	payload: CrmAutomationPayload
): Promise<CrmActionResult> {
	switch (action.type) {
		case 'set_field':
			return executeSetField(action, payload);
		case 'log_activity':
			return executeLogActivity(action, payload);
		case 'create_task':
			return executeCreateTask(action, payload);
		case 'send_notification':
			return executeSendNotification(action, payload);
		case 'fire_webhook':
			return executeFireWebhook(action, payload);
		default:
			return { action: (action as CrmActionDef).type, result: 'unknown_action' };
	}
}

function executeSetField(action: CrmActionSetField, payload: CrmAutomationPayload): CrmActionResult {
	const now = Date.now();
	const updates: Record<string, unknown> = { updatedAt: now };
	updates[action.field] = action.value;

	if (payload.entityType === 'opportunity') {
		// If changing stage, update stageEnteredAt
		if (action.field === 'stageId') {
			updates.stageEnteredAt = now;
		}
		db.update(crmOpportunities).set(updates).where(eq(crmOpportunities.id, payload.entityId)).run();
		const updated = db.select().from(crmOpportunities).where(eq(crmOpportunities.id, payload.entityId)).get();
		if (updated) indexDocument('opportunities', { id: updated.id, title: updated.title, description: updated.description, value: updated.value, currency: updated.currency, priority: updated.priority, source: updated.source, companyId: updated.companyId, stageId: updated.stageId, ownerId: updated.ownerId, nextStep: updated.nextStep, expectedCloseDate: updated.expectedCloseDate, updatedAt: updated.updatedAt });
	}

	return { action: 'set_field', result: `Set ${action.field} to ${action.value}` };
}

function executeLogActivity(action: CrmActionLogActivity, payload: CrmAutomationPayload): CrmActionResult {
	const subject = renderTemplate(action.subject, payload.entity);
	const now = Date.now();

	const activity: Record<string, unknown> = {
		id: nanoid(12),
		type: action.activityType,
		subject,
		description: 'Auto-logged by automation',
		userId: AUTOMATION_USER_ID,
		createdAt: now,
		updatedAt: now
	};

	if (payload.entityType === 'opportunity') {
		activity.opportunityId = payload.entityId;
		activity.companyId = payload.entity.companyId || null;
	} else if (payload.entityType === 'company') {
		activity.companyId = payload.entityId;
	} else if (payload.entityType === 'contact') {
		activity.contactId = payload.entityId;
	}

	db.insert(crmActivities).values(activity).run();
	return { action: 'log_activity', result: `Logged ${action.activityType}: ${subject}` };
}

function executeCreateTask(action: CrmActionCreateTask, payload: CrmAutomationPayload): CrmActionResult {
	const title = renderTemplate(action.title, payload.entity);
	const now = Date.now();
	const dueDate = now + (action.daysFromNow * 86400000);

	const task: Record<string, unknown> = {
		id: nanoid(12),
		title,
		priority: action.priority,
		dueDate,
		completedAt: null,
		assigneeId: (payload.entity.ownerId as string) || null,
		createdBy: AUTOMATION_USER_ID,
		createdAt: now,
		updatedAt: now
	};

	if (payload.entityType === 'opportunity') {
		task.opportunityId = payload.entityId;
		task.companyId = payload.entity.companyId || null;
	} else if (payload.entityType === 'company') {
		task.companyId = payload.entityId;
	} else if (payload.entityType === 'contact') {
		task.contactId = payload.entityId;
	}

	db.insert(crmTasks).values(task).run();
	return { action: 'create_task', result: `Created task: ${title}` };
}

async function executeSendNotification(
	action: CrmActionSendNotification,
	payload: CrmAutomationPayload
): Promise<CrmActionResult> {
	const title = renderTemplate(action.title, payload.entity);
	const body = renderTemplate(action.body, payload.entity);

	let targetUserId: string | null = null;
	if (action.target === 'owner') {
		targetUserId = (payload.entity.ownerId as string) || null;
	} else {
		targetUserId = action.target;
	}

	if (!targetUserId) {
		return { action: 'send_notification', result: 'skipped - no target user' };
	}

	db.insert(notifications).values({
		id: nanoid(12),
		userId: targetUserId,
		type: 'status_change',
		title,
		body,
		url: `/crm/opportunities/${payload.entityId}`,
		taskId: null,
		actorId: AUTOMATION_USER_ID,
		read: false,
		createdAt: Date.now()
	}).run();

	sendPushNotification(targetUserId, { title, body, tag: `crm-auto-${payload.entityId}` }).catch(() => {});

	return { action: 'send_notification', result: `Notified ${action.target}` };
}

async function executeFireWebhook(
	action: CrmActionFireWebhook,
	payload: CrmAutomationPayload
): Promise<CrmActionResult> {
	const body = JSON.stringify({
		event: 'crm.automation.fired',
		timestamp: Date.now(),
		data: {
			entityType: payload.entityType,
			entityId: payload.entityId,
			entity: payload.entity
		}
	});

	const signature = action.secret
		? crypto.createHmac('sha256', action.secret).update(body).digest('hex')
		: '';

	await fetch(action.url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Webhook-Signature': signature
		},
		body,
		signal: AbortSignal.timeout(10_000)
	});

	return { action: 'fire_webhook', result: `Webhook sent to ${action.url}` };
}
