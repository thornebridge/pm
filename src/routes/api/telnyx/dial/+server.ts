import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { telnyxCallLogs } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { getTelnyxConfig, getNextCallerNumber } from '$lib/server/telnyx/index.js';
import {
	createOutboundCall,
	createSipCall,
	getCredentialSipUsername,
	encodeClientState,
	storeSession,
	hangupCall,
	type ActiveCallSession
} from '$lib/server/telnyx/callControl.js';
import { broadcastAll } from '$lib/server/ws/index.js';
import { normalizePhoneNumber } from '$lib/utils/phone.js';

/** POST — initiate a server-side two-leg outbound call */
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const config = await getTelnyxConfig();
	if (!config) {
		return json({ error: 'Telnyx integration is not configured' }, { status: 503 });
	}

	const body = await event.request.json();
	const { toNumber, contactId, companyId, contactName } = body;

	if (!toNumber) {
		return json({ error: 'toNumber is required' }, { status: 400 });
	}

	const normalized = normalizePhoneNumber(toNumber);
	const fromNumber = getNextCallerNumber(config);
	const now = Date.now();
	const callLogId = crypto.randomUUID();
	const sessionId = crypto.randomUUID();

	// 1. Create call log in DB
	await db.insert(telnyxCallLogs).values({
		id: callLogId,
		direction: 'outbound',
		fromNumber,
		toNumber: normalized,
		status: 'initiated',
		startedAt: now,
		contactId: contactId || null,
		companyId: companyId || null,
		userId: user.id,
		createdAt: now,
		updatedAt: now
	});

	// 2. Resolve SIP address
	let sipUsername: string;
	try {
		sipUsername = await getCredentialSipUsername(config);
	} catch (err) {
		await db.update(telnyxCallLogs)
			.set({ status: 'failed', endedAt: Date.now(), updatedAt: Date.now() })
			.where(eq(telnyxCallLogs.id, callLogId));
		return json({ error: 'Failed to resolve SIP credential' }, { status: 500 });
	}

	const sipUri = `sip:${sipUsername}@sip.telnyx.com`;

	// Build session
	const session: ActiveCallSession = {
		id: sessionId,
		callLogId,
		bridged: false,
		createdAt: now,
		toNumber: normalized,
		fromNumber,
		contactId: contactId || null,
		companyId: companyId || null,
		userId: user.id
	};

	try {
		// 3. Create Leg A — PSTN call to lead
		const legAState = encodeClientState({ sid: sessionId, leg: 'A', clid: callLogId });
		const legA = await createOutboundCall(config, {
			to: normalized,
			from: fromNumber,
			connectionId: config.connectionId,
			clientState: legAState,
			timeoutSecs: 30
		});

		session.legA = { callControlId: legA.callControlId, status: 'initiated' };

		// 4. Create Leg B — SIP call to agent's browser
		const legBState = encodeClientState({ sid: sessionId, leg: 'B', clid: callLogId });
		const legB = await createSipCall(config, {
			sipUri,
			from: fromNumber,
			connectionId: config.connectionId,
			clientState: legBState
		});

		session.legB = { callControlId: legB.callControlId, status: 'initiated' };

		// 5. Store session
		storeSession(session);

		// 6. Broadcast connecting event
		broadcastAll({
			type: 'telnyx:call_connecting',
			sessionId,
			callLogId,
			toNumber: normalized,
			contactName: contactName || null,
			contactId: contactId || null,
			companyId: companyId || null
		});

		return json({ callLogId, sessionId }, { status: 201 });
	} catch (err) {
		// 7. On failure — clean up any created legs
		console.error('[Dial] Failed to create call legs:', err);

		if (session.legA) {
			hangupCall(config, session.legA.callControlId).catch(() => {});
		}
		if (session.legB) {
			hangupCall(config, session.legB.callControlId).catch(() => {});
		}

		await db.update(telnyxCallLogs)
			.set({ status: 'failed', endedAt: Date.now(), updatedAt: Date.now() })
			.where(eq(telnyxCallLogs.id, callLogId));

		return json({ error: 'Failed to initiate call' }, { status: 500 });
	}
};
