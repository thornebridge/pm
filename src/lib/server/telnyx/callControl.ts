import type { TelnyxConfig } from './index.js';

const TELNYX_API_BASE = 'https://api.telnyx.com/v2';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ActiveCallSession {
	id: string;
	callLogId: string;
	legA?: LegInfo; // PSTN call to lead
	legB?: LegInfo; // SIP call to agent
	bridged: boolean;
	createdAt: number;
	toNumber: string;
	fromNumber: string;
	contactId: string | null;
	companyId: string | null;
	userId: string;
}

interface LegInfo {
	callControlId: string;
	status: 'initiated' | 'ringing' | 'answered' | 'hangup';
}

interface ClientState {
	sid: string;  // session id
	leg: 'A' | 'B';
	clid: string; // call log id
}

// ─── Session Store ──────────────────────────────────────────────────────────

const sessions = new Map<string, ActiveCallSession>();
const ccidIndex = new Map<string, string>(); // call_control_id → session id

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Cleanup orphaned sessions every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [id, session] of sessions) {
		if (now - session.createdAt > SESSION_TTL_MS) {
			removeSession(id);
		}
	}
}, 5 * 60 * 1000);

export function getSession(sessionId: string): ActiveCallSession | undefined {
	return sessions.get(sessionId);
}

export function getSessionByCcid(callControlId: string): { session: ActiveCallSession; leg: 'A' | 'B' } | undefined {
	const sessionId = ccidIndex.get(callControlId);
	if (!sessionId) return undefined;
	const session = sessions.get(sessionId);
	if (!session) return undefined;

	const leg = session.legA?.callControlId === callControlId ? 'A'
		: session.legB?.callControlId === callControlId ? 'B'
		: undefined;

	if (!leg) return undefined;
	return { session, leg };
}

export function storeSession(session: ActiveCallSession) {
	sessions.set(session.id, session);
	if (session.legA) ccidIndex.set(session.legA.callControlId, session.id);
	if (session.legB) ccidIndex.set(session.legB.callControlId, session.id);
}

export function removeSession(sessionId: string) {
	const session = sessions.get(sessionId);
	if (session) {
		if (session.legA) ccidIndex.delete(session.legA.callControlId);
		if (session.legB) ccidIndex.delete(session.legB.callControlId);
		sessions.delete(sessionId);
	}
}

// ─── client_state encoding ──────────────────────────────────────────────────

export function encodeClientState(state: ClientState): string {
	return Buffer.from(JSON.stringify(state)).toString('base64');
}

export function decodeClientState(encoded: string): ClientState | null {
	try {
		return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
	} catch {
		return null;
	}
}

// ─── SIP Credential Cache ───────────────────────────────────────────────────

let _cachedSipUsername: string | null = null;
let _sipCacheExpiry = 0;
const SIP_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getCredentialSipUsername(config: TelnyxConfig): Promise<string> {
	const now = Date.now();
	if (_cachedSipUsername && now < _sipCacheExpiry) {
		return _cachedSipUsername;
	}

	const res = await fetch(`${TELNYX_API_BASE}/telephony_credentials/${config.credentialId}`, {
		headers: {
			Authorization: `Bearer ${config.apiKey}`,
			'Content-Type': 'application/json'
		}
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Failed to fetch SIP credential (${res.status}): ${text}`);
	}

	const data = await res.json();
	const username = data.data?.sip_username || data.data?.user_name;
	if (!username) {
		throw new Error('SIP username not found on credential');
	}

	_cachedSipUsername = username;
	_sipCacheExpiry = now + SIP_CACHE_TTL;
	return username;
}

// ─── Call Control API ───────────────────────────────────────────────────────

async function callControlRequest(
	config: TelnyxConfig,
	endpoint: string,
	body: Record<string, unknown>
): Promise<any> {
	const res = await fetch(`${TELNYX_API_BASE}${endpoint}`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config.apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Telnyx API error (${res.status}): ${text}`);
	}

	return res.json();
}

export async function createOutboundCall(
	config: TelnyxConfig,
	params: {
		to: string;
		from: string;
		connectionId: string;
		clientState: string;
		timeoutSecs?: number;
	}
): Promise<{ callControlId: string; callLegId: string }> {
	const data = await callControlRequest(config, '/calls', {
		to: params.to,
		from: params.from,
		connection_id: params.connectionId,
		client_state: params.clientState,
		timeout_secs: params.timeoutSecs || 30
	});

	return {
		callControlId: data.data.call_control_id,
		callLegId: data.data.call_leg_id
	};
}

export async function createSipCall(
	config: TelnyxConfig,
	params: {
		sipUri: string;
		from: string;
		connectionId: string;
		clientState: string;
	}
): Promise<{ callControlId: string; callLegId: string }> {
	const data = await callControlRequest(config, '/calls', {
		to: params.sipUri,
		from: params.from,
		connection_id: params.connectionId,
		client_state: params.clientState,
		timeout_secs: 15 // Agent SIP call should arrive quickly
	});

	return {
		callControlId: data.data.call_control_id,
		callLegId: data.data.call_leg_id
	};
}

export async function bridgeCalls(
	config: TelnyxConfig,
	callControlId: string,
	otherCallControlId: string
): Promise<void> {
	await callControlRequest(config, `/calls/${callControlId}/actions/bridge`, {
		call_control_id: otherCallControlId
	});
}

export async function hangupCall(
	config: TelnyxConfig,
	callControlId: string
): Promise<void> {
	try {
		await callControlRequest(config, `/calls/${callControlId}/actions/hangup`, {});
	} catch (err) {
		// Call may already be hung up — don't throw
		console.warn(`[CallControl] Hangup failed for ${callControlId}:`, err);
	}
}

export async function startRecording(
	config: TelnyxConfig,
	callControlId: string
): Promise<void> {
	try {
		await callControlRequest(config, `/calls/${callControlId}/actions/record_start`, {
			format: 'mp3',
			channels: 'dual'
		});
	} catch (err) {
		console.warn(`[CallControl] Start recording failed:`, err);
	}
}
