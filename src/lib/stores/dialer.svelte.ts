import { api } from '$lib/utils/api.js';
import { normalizePhoneNumber } from '$lib/utils/phone.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'ending';

interface IncomingCallInfo {
	call: any; // TelnyxRTC Call object
	callerNumber: string;
	contactName: string | null;
	contactId: string | null;
	companyId: string | null;
}

// ─── Reactive State ─────────────────────────────────────────────────────────

let client: any = $state(null);
let clientReady = $state(false);
let activeCall: any = $state(null);
let callState = $state<CallState>('idle');
let callDuration = $state(0);
let isMuted = $state(false);
let dialerOpen = $state(false);
let currentNumber = $state('');
let currentContactName = $state<string | null>(null);
let currentContactId = $state<string | null>(null);
let currentCompanyId = $state<string | null>(null);
let incomingCall = $state<IncomingCallInfo | null>(null);
let error = $state<string | null>(null);
let localCallLogId = $state<string | null>(null);
let callerNumbers = $state<string[]>([]);
let _rotationIndex = 0;
let recordCalls = $state(false);

let _durationInterval: ReturnType<typeof setInterval> | null = null;
let _callStartTime: number | null = null;
let _audioElement: HTMLAudioElement | null = null;

// ─── Exported Getters ───────────────────────────────────────────────────────

export function getDialerState() {
	return {
		get clientReady() { return clientReady; },
		get activeCall() { return activeCall; },
		get callState() { return callState; },
		get callDuration() { return callDuration; },
		get isMuted() { return isMuted; },
		get dialerOpen() { return dialerOpen; },
		get currentNumber() { return currentNumber; },
		get currentContactName() { return currentContactName; },
		get currentContactId() { return currentContactId; },
		get currentCompanyId() { return currentCompanyId; },
		get incomingCall() { return incomingCall; },
		get error() { return error; },
		get callerNumbers() { return callerNumbers; },
		get localCallLogId() { return localCallLogId; }
	};
}

// ─── Audio Element ──────────────────────────────────────────────────────────

export function setAudioElement(el: HTMLAudioElement) {
	_audioElement = el;
}

// ─── Client Initialization ──────────────────────────────────────────────────

export async function initClient() {
	if (client) return;

	try {
		// Fetch token from server
		const tokenData = await api<{ token: string; callerNumbers: string[]; recordCalls: boolean }>('/api/telnyx/token');
		callerNumbers = tokenData.callerNumbers;
		recordCalls = tokenData.recordCalls;

		// Dynamic import to avoid loading in SSR and when disabled
		const { TelnyxRTC } = await import('@telnyx/webrtc');

		client = new TelnyxRTC({
			login_token: tokenData.token
		});

		client.on('telnyx.ready', () => {
			clientReady = true;
			error = null;
		});

		client.on('telnyx.error', (err: any) => {
			console.error('Telnyx error:', err);
			error = err?.message || 'Telnyx connection error';
			clientReady = false;
		});

		client.on('telnyx.socket.close', () => {
			clientReady = false;
		});

		client.on('telnyx.notification', handleNotification);

		client.connect();
	} catch (err) {
		console.error('Failed to initialize Telnyx client:', err);
		error = err instanceof Error ? err.message : 'Failed to initialize dialer';
	}
}

function handleNotification(notification: any) {
	const type = notification?.type;
	const call = notification?.call;

	if (type === 'callUpdate' && call) {
		const state = call.state;

		// Attach remote stream to audio element
		if (_audioElement && call.remoteStream) {
			_audioElement.srcObject = call.remoteStream;
		}

		switch (state) {
			case 'new':
			case 'trying':
			case 'requesting':
				if (call.direction === 'inbound' && callState === 'idle') {
					// Incoming call
					handleIncomingCall(call);
				} else {
					callState = 'connecting';
				}
				break;

			case 'ringing':
			case 'early':
				if (call.direction === 'inbound' && callState === 'idle') {
					handleIncomingCall(call);
				} else {
					callState = 'ringing';
				}
				break;

			case 'active':
				callState = 'active';
				activeCall = call;
				incomingCall = null;
				_startDurationTimer();
				break;

			case 'held':
				// Still active, just on hold
				break;

			case 'hangup':
			case 'destroy':
				_handleCallEnd();
				break;

			case 'purge':
				_resetCallState();
				break;
		}
	}

	if (type === 'userMediaError') {
		error = 'Microphone access denied. Please allow microphone permissions.';
		_resetCallState();
	}
}

function handleIncomingCall(call: any) {
	const callerNum = call.options?.callerNumber || call.options?.remoteCallerNumber || 'Unknown';

	incomingCall = {
		call,
		callerNumber: callerNum,
		contactName: null,
		contactId: null,
		companyId: null
	};

	// Try to look up caller in CRM via the server
	lookupCaller(callerNum);

	// Browser notification for incoming call
	if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
		new Notification('Incoming Call', {
			body: `Call from ${callerNum}`,
			icon: '/favicon.png',
			tag: 'incoming-call'
		});
	}
}

async function lookupCaller(phone: string) {
	try {
		const normalized = normalizePhoneNumber(phone);
		const results = await api<any[]>(`/api/telnyx/calls?lookup=${encodeURIComponent(normalized)}`);
		// The lookup is done server-side via the webhook; for now just leave as-is
	} catch {
		// Lookup failed, that's okay
	}
}

// ─── Call Actions ───────────────────────────────────────────────────────────

export async function makeCall(
	number: string,
	opts?: { contactId?: string; companyId?: string; contactName?: string }
) {
	if (!client || !clientReady) {
		await initClient();
		if (!client || !clientReady) {
			error = 'Dialer not ready. Please wait and try again.';
			return;
		}
	}

	const normalized = normalizePhoneNumber(number);
	currentNumber = normalized;
	currentContactName = opts?.contactName || null;
	currentContactId = opts?.contactId || null;
	currentCompanyId = opts?.companyId || null;
	callState = 'connecting';
	dialerOpen = true;
	error = null;

	try {
		// Create call log record on server
		const logResult = await api<{ id: string }>('/api/telnyx/calls', {
			method: 'POST',
			body: JSON.stringify({
				toNumber: normalized,
				contactId: opts?.contactId || null,
				companyId: opts?.companyId || null,
				direction: 'outbound'
			})
		});
		localCallLogId = logResult.id;

		// Place the call — rotate through caller numbers
		const outboundNumber = callerNumbers.length > 0
			? callerNumbers[_rotationIndex++ % callerNumbers.length]
			: '';
		const call = client.newCall({
			destinationNumber: normalized,
			callerNumber: outboundNumber,
			audio: true,
			video: false
		});

		activeCall = call;
	} catch (err) {
		console.error('Failed to place call:', err);
		error = err instanceof Error ? err.message : 'Failed to place call';
		callState = 'idle';
	}
}

export function answerCall() {
	if (incomingCall?.call) {
		currentNumber = incomingCall.callerNumber;
		currentContactName = incomingCall.contactName;
		currentContactId = incomingCall.contactId;
		currentCompanyId = incomingCall.companyId;
		callState = 'connecting';

		incomingCall.call.answer({ audio: true, video: false });
		activeCall = incomingCall.call;
		incomingCall = null;
	}
}

export function rejectCall() {
	if (incomingCall?.call) {
		incomingCall.call.hangup();
		incomingCall = null;
	}
}

export function hangup() {
	if (activeCall) {
		activeCall.hangup();
	}
	_handleCallEnd();
}

export function toggleMute() {
	if (!activeCall) return;
	if (isMuted) {
		activeCall.unmuteAudio();
		isMuted = false;
	} else {
		activeCall.muteAudio();
		isMuted = true;
	}
}

export function sendDtmf(digits: string) {
	if (activeCall) {
		activeCall.dtmf(digits);
	}
}

// ─── UI Actions ─────────────────────────────────────────────────────────────

export function openDialer(number?: string) {
	dialerOpen = true;
	if (number) currentNumber = number;
}

export function closeDialer() {
	if (callState === 'idle') {
		dialerOpen = false;
	}
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

function _startDurationTimer() {
	_callStartTime = Date.now();
	callDuration = 0;
	_durationInterval = setInterval(() => {
		if (_callStartTime) {
			callDuration = Math.floor((Date.now() - _callStartTime) / 1000);
		}
	}, 1000);
}

function _handleCallEnd() {
	callState = 'ending';

	// Update call log on server with final state
	if (localCallLogId) {
		const updates: Record<string, unknown> = {
			status: 'completed',
			endedAt: Date.now(),
			durationSeconds: callDuration
		};
		if (activeCall?.telnyxIDs) {
			updates.telnyxCallControlId = activeCall.telnyxIDs.telnyxCallControlId;
			updates.telnyxCallSessionId = activeCall.telnyxIDs.telnyxSessionId;
		}
		api(`/api/telnyx/calls/${localCallLogId}`, {
			method: 'PATCH',
			body: JSON.stringify(updates)
		}).catch(() => {}); // Best effort
	}

	setTimeout(() => _resetCallState(), 1500);
}

function _resetCallState() {
	if (_durationInterval) {
		clearInterval(_durationInterval);
		_durationInterval = null;
	}
	_callStartTime = null;
	activeCall = null;
	callState = 'idle';
	callDuration = 0;
	isMuted = false;
	currentNumber = '';
	currentContactName = null;
	currentContactId = null;
	currentCompanyId = null;
	localCallLogId = null;
	error = null;
	incomingCall = null;
}

export function destroy() {
	_resetCallState();
	if (client) {
		client.disconnect();
		client = null;
		clientReady = false;
	}
}
