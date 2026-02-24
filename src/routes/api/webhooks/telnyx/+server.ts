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
			const [existing] = callSessionId
				? await db.select().from(telnyxCallLogs).where(eq(telnyxCallLogs.telnyxCallSessionId, callSessionId))
				: [undefined];

			if (existing) {
				// Update with Telnyx IDs
				await db.update(telnyxCallLogs)
					.set({
						telnyxCallControlId: callControlId,
						telnyxCallSessionId: callSessionId,
						status: 'initiated',
						updatedAt: now
					})
					.where(eq(telnyxCallLogs.id, existing.id));
			}
			// If no existing record and this is inbound, we'll create on call.answered
			// since we need user context
			break;
		}

		case 'call.answered': {
			const [record] = callSessionId
				? await db.select().from(telnyxCallLogs).where(eq(telnyxCallLogs.telnyxCallSessionId, callSessionId))
				: callControlId
					? await db.select().from(telnyxCallLogs).where(eq(telnyxCallLogs.telnyxCallControlId, callControlId))
					: [undefined];

			if (record) {
				await db.update(telnyxCallLogs)
					.set({ status: 'answered', answeredAt: now, updatedAt: now })
					.where(eq(telnyxCallLogs.id, record.id));
			}

			// Broadcast via WebSocket
			globalThis.__wsBroadcastAll?.({ type: 'telnyx:call_update', callSessionId, status: 'answered' });
			break;
		}

		case 'call.hangup': {
			const [record] = callSessionId
				? await db.select().from(telnyxCallLogs).where(eq(telnyxCallLogs.telnyxCallSessionId, callSessionId))
				: callControlId
					? await db.select().from(telnyxCallLogs).where(eq(telnyxCallLogs.telnyxCallControlId, callControlId))
					: [undefined];

			if (record) {
				const answeredAt = record.answeredAt || record.startedAt || now;
				const durationSeconds = Math.round((now - answeredAt) / 1000);
				const hangupCause = payload.hangup_cause;
				const finalStatus = hangupCause === 'NORMAL_CLEARING' ? 'completed'
					: hangupCause === 'USER_BUSY' ? 'busy'
					: hangupCause === 'NO_ANSWER' ? 'no_answer'
					: hangupCause === 'ORIGINATOR_CANCEL' ? 'cancelled'
					: 'completed';

				await db.update(telnyxCallLogs)
					.set({
						status: finalStatus,
						endedAt: now,
						durationSeconds: record.answeredAt ? durationSeconds : 0,
						updatedAt: now
					})
					.where(eq(telnyxCallLogs.id, record.id));

				// Auto-create CRM activity if call was answered
				if (record.answeredAt && durationSeconds > 0) {
					const durationMinutes = Math.ceil(durationSeconds / 60);
					const contactName = record.contactId ? 'contact' : record.toNumber;
					const activityId = crypto.randomUUID();

					await db.insert(crmActivities)
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
						});

					// Link activity to call log
					await db.update(telnyxCallLogs)
						.set({ crmActivityId: activityId, updatedAt: now })
						.where(eq(telnyxCallLogs.id, record.id));
				}
			}

			globalThis.__wsBroadcastAll?.({ type: 'telnyx:call_update', callSessionId, status: 'completed' });
			break;
		}

		case 'call.recording.saved': {
			const recordingUrl = payload.recording_urls?.mp3;
			if (recordingUrl && callSessionId) {
				const [record] = await db.select().from(telnyxCallLogs).where(eq(telnyxCallLogs.telnyxCallSessionId, callSessionId));
				if (record) {
					await db.update(telnyxCallLogs)
						.set({ recordingUrl, updatedAt: now })
						.where(eq(telnyxCallLogs.id, record.id));
				}
			}
			break;
		}
	}

	return json({ received: true });
};
