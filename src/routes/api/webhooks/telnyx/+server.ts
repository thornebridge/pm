import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { telnyxCallLogs, crmActivities } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { lookupContactByPhone } from '$lib/server/telnyx/index.js';

/** POST — receive Telnyx call events (public endpoint, no auth required) */
export const POST: RequestHandler = async (event) => {
	const body = await event.request.json();

	const eventType = body?.data?.event_type;
	const payload = body?.data?.payload;

	if (!eventType || !payload) {
		return json({ error: 'Invalid webhook payload' }, { status: 400 });
	}

	const callControlId = payload.call_control_id;
	const callSessionId = payload.call_session_id;
	const now = Date.now();

	switch (eventType) {
		case 'call.initiated': {
			// Check if we already have a record (browser may have created one)
			const existing = callSessionId
				? db.select().from(telnyxCallLogs).where(eq(telnyxCallLogs.telnyxCallSessionId, callSessionId)).get()
				: null;

			if (existing) {
				// Update with Telnyx IDs
				db.update(telnyxCallLogs)
					.set({
						telnyxCallControlId: callControlId,
						telnyxCallSessionId: callSessionId,
						status: 'initiated',
						updatedAt: now
					})
					.where(eq(telnyxCallLogs.id, existing.id))
					.run();
			}
			// If no existing record and this is inbound, we'll create on call.answered
			// since we need user context
			break;
		}

		case 'call.answered': {
			const record = callSessionId
				? db.select().from(telnyxCallLogs).where(eq(telnyxCallLogs.telnyxCallSessionId, callSessionId)).get()
				: callControlId
					? db.select().from(telnyxCallLogs).where(eq(telnyxCallLogs.telnyxCallControlId, callControlId)).get()
					: null;

			if (record) {
				db.update(telnyxCallLogs)
					.set({ status: 'answered', answeredAt: now, updatedAt: now })
					.where(eq(telnyxCallLogs.id, record.id))
					.run();
			}

			// Broadcast via WebSocket
			globalThis.__wsBroadcastAll?.({ type: 'telnyx:call_update', callSessionId, status: 'answered' });
			break;
		}

		case 'call.hangup': {
			const record = callSessionId
				? db.select().from(telnyxCallLogs).where(eq(telnyxCallLogs.telnyxCallSessionId, callSessionId)).get()
				: callControlId
					? db.select().from(telnyxCallLogs).where(eq(telnyxCallLogs.telnyxCallControlId, callControlId)).get()
					: null;

			if (record) {
				const answeredAt = record.answeredAt || record.startedAt || now;
				const durationSeconds = Math.round((now - answeredAt) / 1000);
				const hangupCause = payload.hangup_cause;
				const finalStatus = hangupCause === 'NORMAL_CLEARING' ? 'completed'
					: hangupCause === 'USER_BUSY' ? 'busy'
					: hangupCause === 'NO_ANSWER' ? 'no_answer'
					: hangupCause === 'ORIGINATOR_CANCEL' ? 'cancelled'
					: 'completed';

				db.update(telnyxCallLogs)
					.set({
						status: finalStatus,
						endedAt: now,
						durationSeconds: record.answeredAt ? durationSeconds : 0,
						updatedAt: now
					})
					.where(eq(telnyxCallLogs.id, record.id))
					.run();

				// Auto-create CRM activity if call was answered
				if (record.answeredAt && durationSeconds > 0) {
					const durationMinutes = Math.ceil(durationSeconds / 60);
					const contactName = record.contactId ? 'contact' : record.toNumber;
					const activityId = crypto.randomUUID();

					db.insert(crmActivities)
						.values({
							id: activityId,
							type: 'call',
							subject: `${record.direction === 'inbound' ? 'Inbound' : 'Outbound'} call — ${contactName}`,
							description: `Duration: ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`,
							contactId: record.contactId,
							companyId: record.companyId,
							completedAt: now,
							durationMinutes,
							userId: record.userId,
							createdAt: now,
							updatedAt: now
						})
						.run();

					// Link activity to call log
					db.update(telnyxCallLogs)
						.set({ crmActivityId: activityId, updatedAt: now })
						.where(eq(telnyxCallLogs.id, record.id))
						.run();
				}
			}

			globalThis.__wsBroadcastAll?.({ type: 'telnyx:call_update', callSessionId, status: 'completed' });
			break;
		}

		case 'call.recording.saved': {
			const recordingUrl = payload.recording_urls?.mp3;
			if (recordingUrl && callSessionId) {
				const record = db.select().from(telnyxCallLogs).where(eq(telnyxCallLogs.telnyxCallSessionId, callSessionId)).get();
				if (record) {
					db.update(telnyxCallLogs)
						.set({ recordingUrl, updatedAt: now })
						.where(eq(telnyxCallLogs.id, record.id))
						.run();
				}
			}
			break;
		}
	}

	return json({ received: true });
};
