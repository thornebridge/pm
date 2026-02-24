import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	dialSessions,
	dialQueueItems,
	crmActivities,
	crmTasks,
	crmContacts
} from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DISPOSITION_LABELS: Record<string, string> = {
	connected_interested: 'Interested',
	connected_not_interested: 'Not Interested',
	connected_callback: 'Callback Requested',
	connected_left_voicemail: 'Left Voicemail',
	connected_wrong_number: 'Wrong Number',
	connected_do_not_call: 'Do Not Call',
	no_answer: 'No Answer',
	busy: 'Busy',
	voicemail_left_message: 'Voicemail — Left Message',
	voicemail_no_message: 'Voicemail — No Message'
};

const CONNECTED_DISPOSITIONS = new Set([
	'connected_interested',
	'connected_not_interested',
	'connected_callback',
	'connected_left_voicemail',
	'connected_wrong_number',
	'connected_do_not_call'
]);

const NO_ANSWER_DISPOSITIONS = new Set([
	'no_answer',
	'busy',
	'voicemail_left_message',
	'voicemail_no_message'
]);

/** PATCH — update a queue item (disposition, status, etc.) */
export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { sessionId, itemId } = event.params;
	const body = await event.request.json();

	const item = db
		.select()
		.from(dialQueueItems)
		.where(eq(dialQueueItems.id, itemId))
		.get();

	if (!item || item.sessionId !== sessionId) {
		return json({ error: 'Queue item not found' }, { status: 404 });
	}

	const updates: Record<string, unknown> = {};

	if (body.position !== undefined) updates.position = body.position;
	if (body.status !== undefined) updates.status = body.status;
	if (body.disposition !== undefined) updates.disposition = body.disposition;
	if (body.notes !== undefined) updates.notes = body.notes;
	if (body.callbackAt !== undefined) updates.callbackAt = body.callbackAt;
	if (body.callLogId !== undefined) updates.callLogId = body.callLogId;
	if (body.callDurationSeconds !== undefined) updates.callDurationSeconds = body.callDurationSeconds;
	if (body.dialedAt !== undefined) updates.dialedAt = body.dialedAt;
	if (body.completedAt !== undefined) updates.completedAt = body.completedAt;

	db.update(dialQueueItems).set(updates).where(eq(dialQueueItems.id, itemId)).run();

	// If a disposition was submitted, create a CRM activity and update session stats
	if (body.disposition && body.status === 'completed') {
		const contact = db
			.select()
			.from(crmContacts)
			.where(eq(crmContacts.id, item.contactId))
			.get();

		const contactName = contact
			? `${contact.firstName} ${contact.lastName}`
			: 'Unknown Contact';

		const dispositionLabel = DISPOSITION_LABELS[body.disposition] || body.disposition;

		// Create CRM activity
		const now = Date.now();
		const activityId = nanoid(12);
		const durationMinutes = body.callDurationSeconds
			? Math.ceil(body.callDurationSeconds / 60)
			: null;

		db.insert(crmActivities)
			.values({
				id: activityId,
				type: 'call',
				subject: `Dial session call — ${contactName} — ${dispositionLabel}`,
				description: body.notes || null,
				companyId: contact?.companyId || null,
				contactId: item.contactId,
				opportunityId: null,
				scheduledAt: null,
				completedAt: now,
				durationMinutes,
				userId: user.id,
				createdAt: now,
				updatedAt: now
			})
			.run();

		// Link the activity to the queue item
		db.update(dialQueueItems)
			.set({ crmActivityId: activityId })
			.where(eq(dialQueueItems.id, itemId))
			.run();

		// If callback requested, create a CRM task
		if (body.disposition === 'connected_callback' && body.callbackAt) {
			db.insert(crmTasks)
				.values({
					id: nanoid(12),
					title: `Callback: ${contactName}`,
					description: body.notes || `Follow-up call requested during dial session.`,
					dueDate: body.callbackAt,
					completedAt: null,
					priority: 'high',
					companyId: contact?.companyId || null,
					contactId: item.contactId,
					opportunityId: null,
					assigneeId: user.id,
					createdBy: user.id,
					createdAt: now,
					updatedAt: now
				})
				.run();
		}

		// Update session aggregate stats
		const isConnected = CONNECTED_DISPOSITIONS.has(body.disposition);
		const isNoAnswer = NO_ANSWER_DISPOSITIONS.has(body.disposition);
		const duration = body.callDurationSeconds || 0;

		db.update(dialSessions)
			.set({
				completedContacts: sql`${dialSessions.completedContacts} + 1`,
				totalConnected: isConnected
					? sql`${dialSessions.totalConnected} + 1`
					: dialSessions.totalConnected,
				totalNoAnswer: isNoAnswer
					? sql`${dialSessions.totalNoAnswer} + 1`
					: dialSessions.totalNoAnswer,
				totalDurationSeconds: sql`${dialSessions.totalDurationSeconds} + ${duration}`,
				updatedAt: Date.now()
			})
			.where(eq(dialSessions.id, sessionId))
			.run();
	}

	const updated = db.select().from(dialQueueItems).where(eq(dialQueueItems.id, itemId)).get();
	return json(updated);
};

/** DELETE — remove item from queue */
export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { sessionId, itemId } = event.params;

	const item = db
		.select()
		.from(dialQueueItems)
		.where(eq(dialQueueItems.id, itemId))
		.get();

	if (!item || item.sessionId !== sessionId) {
		return json({ error: 'Queue item not found' }, { status: 404 });
	}

	db.delete(dialQueueItems).where(eq(dialQueueItems.id, itemId)).run();

	// Decrement session totalContacts
	db.update(dialSessions)
		.set({
			totalContacts: sql`max(${dialSessions.totalContacts} - 1, 0)`,
			updatedAt: Date.now()
		})
		.where(eq(dialSessions.id, sessionId))
		.run();

	return json({ ok: true });
};
