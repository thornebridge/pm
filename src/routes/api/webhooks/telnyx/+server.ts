import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { telnyxCallLogs, crmActivities } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { lookupContactByPhone, getTelnyxConfig } from '$lib/server/telnyx/index.js';
import {
	decodeClientState,
	getSession,
	getSessionByCcid,
	removeSession,
	bridgeCalls,
	hangupCall,
	startRecording
} from '$lib/server/telnyx/callControl.js';
import { broadcastAll } from '$lib/server/ws/index.js';

/** POST — receive Telnyx call events (public endpoint, no auth required) */
export const POST: RequestHandler = async (event) => {
	const body = await event.request.json();

	const eventType = body?.data?.event_type;
	const payload = body?.data?.payload;

	if (!eventType || !payload) {
		return json({ error: 'Invalid webhook payload' }, { status: 400 });
	}

	// Branch: server-initiated two-leg calls have client_state
	const clientStateEncoded = payload.client_state;
	if (clientStateEncoded) {
		return handleServerCall(eventType, payload, clientStateEncoded);
	}

	// Legacy/inbound calls — no client_state
	return handleLegacyCall(eventType, payload);
};

// ─── Server-Side Call Control Handler ────────────────────────────────────────

async function handleServerCall(
	eventType: string,
	payload: any,
	clientStateEncoded: string
): Promise<Response> {
	const cs = decodeClientState(clientStateEncoded);
	if (!cs) {
		console.warn('[Webhook] Invalid client_state:', clientStateEncoded);
		return json({ received: true });
	}

	const session = getSession(cs.sid);
	// Session may have been cleaned up (e.g. server restart) — handle gracefully
	if (!session) {
		console.warn(`[Webhook] Session ${cs.sid} not found for ${eventType}`);
		return json({ received: true });
	}

	const leg = cs.leg; // 'A' (lead) or 'B' (agent)
	const callControlId = payload.call_control_id;

	switch (eventType) {
		case 'call.initiated': {
			if (leg === 'A' && session.legA) {
				session.legA.status = 'initiated';
				session.legA.callControlId = callControlId;
			} else if (leg === 'B' && session.legB) {
				session.legB.status = 'initiated';
				session.legB.callControlId = callControlId;
			}
			break;
		}

		case 'call.ringing': {
			if (leg === 'A') {
				if (session.legA) session.legA.status = 'ringing';
				// Lead's phone is ringing — tell the browser
				broadcastAll({
					type: 'telnyx:call_ringing',
					sessionId: cs.sid,
					callLogId: cs.clid
				});

				await db.update(telnyxCallLogs)
					.set({ status: 'ringing', updatedAt: Date.now() })
					.where(eq(telnyxCallLogs.id, cs.clid));
			}
			break;
		}

		case 'call.answered': {
			if (leg === 'A') {
				// Lead answered — bridge A↔B
				if (session.legA) session.legA.status = 'answered';

				const config = await getTelnyxConfig();
				if (!config || !session.legB) {
					console.error('[Webhook] Cannot bridge — missing config or leg B');
					break;
				}

				try {
					await bridgeCalls(config, session.legA!.callControlId, session.legB.callControlId);
					session.bridged = true;

					// Start recording if enabled
					if (config.recordCalls) {
						await startRecording(config, session.legA!.callControlId);
					}

					broadcastAll({
						type: 'telnyx:call_active',
						sessionId: cs.sid,
						callLogId: cs.clid
					});

					await db.update(telnyxCallLogs)
						.set({ status: 'answered', answeredAt: Date.now(), updatedAt: Date.now() })
						.where(eq(telnyxCallLogs.id, cs.clid));
				} catch (err) {
					console.error('[Webhook] Bridge failed:', err);
					// Hang up both legs on bridge failure
					hangupCall(config, session.legA!.callControlId).catch(() => {});
					hangupCall(config, session.legB.callControlId).catch(() => {});

					broadcastAll({
						type: 'telnyx:call_ended',
						sessionId: cs.sid,
						callLogId: cs.clid,
						error: 'Bridge failed'
					});
				}
			} else if (leg === 'B') {
				// Agent SIP call answered (browser auto-answered) — wait for lead
				if (session.legB) session.legB.status = 'answered';
			}
			break;
		}

		case 'call.hangup': {
			const config = await getTelnyxConfig();
			const hangupCause = payload.hangup_cause;

			// Hang up the OTHER leg
			if (config) {
				if (leg === 'A' && session.legB) {
					hangupCall(config, session.legB.callControlId).catch(() => {});
				} else if (leg === 'B' && session.legA) {
					hangupCall(config, session.legA.callControlId).catch(() => {});
				}
			}

			// Finalize call log
			const now = Date.now();
			const [record] = await db.select().from(telnyxCallLogs).where(eq(telnyxCallLogs.id, cs.clid));

			if (record) {
				const answeredAt = record.answeredAt || record.startedAt || now;
				const durationSeconds = record.answeredAt ? Math.round((now - answeredAt) / 1000) : 0;
				const finalStatus = hangupCause === 'NORMAL_CLEARING' ? 'completed'
					: hangupCause === 'USER_BUSY' ? 'busy'
					: hangupCause === 'NO_ANSWER' ? 'no_answer'
					: hangupCause === 'ORIGINATOR_CANCEL' ? 'cancelled'
					: record.answeredAt ? 'completed'
					: 'failed';

				await db.update(telnyxCallLogs)
					.set({
						status: finalStatus,
						endedAt: now,
						durationSeconds,
						updatedAt: now
					})
					.where(eq(telnyxCallLogs.id, cs.clid));

				// Auto-create CRM activity if call was answered
				if (record.answeredAt && durationSeconds > 0) {
					const durationMinutes = Math.ceil(durationSeconds / 60);
					const contactName = record.contactId ? 'contact' : record.toNumber;
					const activityId = crypto.randomUUID();

					await db.insert(crmActivities)
						.values({
							id: activityId,
							type: 'call',
							subject: `Outbound call — ${contactName}`,
							description: `Duration: ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`,
							contactId: record.contactId,
							companyId: record.companyId,
							completedAt: now,
							durationMinutes,
							userId: record.userId,
							createdAt: now,
							updatedAt: now
						});

					await db.update(telnyxCallLogs)
						.set({ crmActivityId: activityId, updatedAt: now })
						.where(eq(telnyxCallLogs.id, cs.clid));
				}
			}

			// Broadcast end
			broadcastAll({
				type: 'telnyx:call_ended',
				sessionId: cs.sid,
				callLogId: cs.clid,
				hangupCause
			});

			// Clean up session
			removeSession(cs.sid);
			break;
		}

		case 'call.recording.saved': {
			const recordingUrl = payload.recording_urls?.mp3;
			if (recordingUrl) {
				await db.update(telnyxCallLogs)
					.set({ recordingUrl, updatedAt: Date.now() })
					.where(eq(telnyxCallLogs.id, cs.clid));
			}
			break;
		}
	}

	return json({ received: true });
}

// ─── Legacy / Inbound Call Handler ───────────────────────────────────────────

async function handleLegacyCall(eventType: string, payload: any): Promise<Response> {
	const callControlId = payload.call_control_id;
	const callSessionId = payload.call_session_id;
	const now = Date.now();

	switch (eventType) {
		case 'call.initiated': {
			const [existing] = callSessionId
				? await db.select().from(telnyxCallLogs).where(eq(telnyxCallLogs.telnyxCallSessionId, callSessionId))
				: [undefined];

			if (existing) {
				await db.update(telnyxCallLogs)
					.set({
						telnyxCallControlId: callControlId,
						telnyxCallSessionId: callSessionId,
						status: 'initiated',
						updatedAt: now
					})
					.where(eq(telnyxCallLogs.id, existing.id));
			}
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

			broadcastAll({ type: 'telnyx:call_update', callSessionId, status: 'answered' });
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

					await db.update(telnyxCallLogs)
						.set({ crmActivityId: activityId, updatedAt: now })
						.where(eq(telnyxCallLogs.id, record.id));
				}
			}

			broadcastAll({ type: 'telnyx:call_update', callSessionId, status: 'completed' });
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
}
