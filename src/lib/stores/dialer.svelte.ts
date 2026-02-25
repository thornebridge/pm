import { api } from '$lib/utils/api.js';
import { normalizePhoneNumber } from '$lib/utils/phone.js';
import { onWsEvent } from './websocket.js';

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
let recordCalls = $state(false);

// Server-side call control state
let activeSessionId = $state<string | null>(null);
let expectingServerCall = $state(false);

let _durationInterval: ReturnType<typeof setInterval> | null = null;
let _callStartTime: number | null = null;
let _audioElement: HTMLAudioElement | null = null;
let _ringbackAudio: HTMLAudioElement | null = null;
let _sipTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
let _wsUnsubscribers: (() => void)[] = [];

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

// ─── WebSocket Event Subscriptions ──────────────────────────────────────────

function subscribeWsEvents() {
	_wsUnsubscribers.push(
		onWsEvent('telnyx:call_connecting', (msg) => {
			// This fires after our POST to /api/telnyx/dial succeeds
			// State is already set by makeCall() — this is mainly for multi-tab sync
			if (msg.sessionId && msg.sessionId !== activeSessionId && callState === 'idle') {
				activeSessionId = msg.sessionId;
				localCallLogId = msg.callLogId;
				currentNumber = msg.toNumber || '';
				currentContactName = msg.contactName || null;
				currentContactId = msg.contactId || null;
				currentCompanyId = msg.companyId || null;
				callState = 'connecting';
				dialerOpen = true;
			}
		}),

		onWsEvent('telnyx:call_ringing', (msg) => {
			if (msg.sessionId === activeSessionId) {
				callState = 'ringing';
			}
		}),

		onWsEvent('telnyx:call_active', (msg) => {
			if (msg.sessionId === activeSessionId) {
				callState = 'active';
				_stopRingback();
				_startDurationTimer();
			}
		}),

		onWsEvent('telnyx:call_ended', (msg) => {
			if (msg.sessionId === activeSessionId) {
				if (msg.error) {
					error = msg.error;
				}
				_handleCallEnd();
			}
		})
	);
}

// ─── Client Initialization ──────────────────────────────────────────────────

export async function initClient() {
	if (client) return;

	// Subscribe to WS events on first init
	if (_wsUnsubscribers.length === 0) {
		subscribeWsEvents();
	}

	try {
		// Fetch token from server
		const tokenData = await api<{ token: string; callerNumbers: string[]; recordCalls: boolean }>('/api/telnyx/token');
		callerNumbers = tokenData.callerNumbers;
		recordCalls = tokenData.recordCalls;

		// Dynamic import to avoid loading in SSR and when disabled
		const { TelnyxRTC } = await import('@telnyx/webrtc');

		client = new TelnyxRTC({
			login_token: tokenData.token,
			debug: true
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

	console.log('[Dialer] notification:', type, 'state:', call?.state, 'dir:', call?.direction, 'expecting:', expectingServerCall);

	if (type === 'callUpdate' && call) {
		const state = call.state;

		// Attach remote stream to audio element
		if (_audioElement && call.remoteStream) {
			_audioElement.srcObject = call.remoteStream;
		}

		// Auto-answer Leg B: if we're expecting a server call, answer it
		// Note: call.direction is undefined when the call first arrives in TelnyxRTC
		if (expectingServerCall && !activeCall && state !== 'hangup' && state !== 'destroy' && state !== 'purge' && state !== 'active') {
			console.log('[Dialer] Auto-answering server Leg B (state:', state, ')');
			call.answer({ audio: true, video: false });
			activeCall = call;
			_clearSipTimeout();
			_startRingback();
			return;
		}

		switch (state) {
			case 'new':
			case 'trying':
			case 'requesting':
				if (call.direction === 'inbound' && callState === 'idle') {
					// Genuine inbound call (not server-initiated)
					handleIncomingCall(call);
				}
				break;

			case 'ringing':
			case 'early':
				if (call.direction === 'inbound' && callState === 'idle') {
					handleIncomingCall(call);
				}
				break;

			case 'active':
				if (expectingServerCall) {
					// Leg B is now active (audio connected to agent)
					// The actual "Active" state transition happens when the server bridges
					// (via telnyx:call_active WS event). For now, agent just hears ringback.
					activeCall = call;
					_clearSipTimeout();
				} else {
					// Legacy/inbound call went active
					callState = 'active';
					activeCall = call;
					incomingCall = null;
					_startDurationTimer();
				}
				break;

			case 'held':
				break;

			case 'hangup':
			case 'destroy': {
				const cause = call.cause || '';
				const sipCode = call.sipCode || '';
				const sipReason = call.sipReason || '';
				if (cause || sipCode) {
					console.error(`[Dialer] Call ended: cause=${cause} causeCode=${call.causeCode || ''} sipCode=${sipCode} sipReason=${sipReason}`);
				}

				if (expectingServerCall) {
					// Leg B hung up — the server webhook will handle cleanup
					// but surface errors if call never connected
					if (callState === 'connecting' || callState === 'ringing') {
						error = sipReason
							? `Call failed: ${sipReason} (${sipCode})`
							: cause
								? `Call failed: ${cause}`
								: 'Call failed to connect';
					}
					activeCall = null;
				} else {
					// Legacy call ended
					if (callState === 'connecting' || callState === 'ringing') {
						error = sipReason
							? `Call failed: ${sipReason} (${sipCode})`
							: cause
								? `Call failed: ${cause}`
								: 'Call failed to connect';
					}
					_handleCallEnd();
				}
				break;
			}

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

	// Browser notification for incoming call
	if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
		new Notification('Incoming Call', {
			body: `Call from ${callerNum}`,
			icon: '/favicon.png',
			tag: 'incoming-call'
		});
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
	expectingServerCall = true;

	try {
		// POST to server — creates both PSTN + SIP legs
		const result = await api<{ callLogId: string; sessionId: string }>('/api/telnyx/dial', {
			method: 'POST',
			body: JSON.stringify({
				toNumber: normalized,
				contactId: opts?.contactId || null,
				companyId: opts?.companyId || null,
				contactName: opts?.contactName || null
			})
		});

		localCallLogId = result.callLogId;
		activeSessionId = result.sessionId;

		// 10-second timeout: if Leg B (SIP call) never arrives at the browser
		_sipTimeoutTimer = setTimeout(() => {
			if (expectingServerCall && !activeCall) {
				console.error('[Dialer] SIP call (Leg B) never arrived — timing out');
				error = 'Call setup timed out. Please try again.';
				// Tell server to clean up
				if (activeSessionId) {
					api('/api/telnyx/hangup', {
						method: 'POST',
						body: JSON.stringify({ sessionId: activeSessionId })
					}).catch(() => {});
				}
				_handleCallEnd();
			}
		}, 10000);
	} catch (err) {
		console.error('Failed to place call:', err);
		error = err instanceof Error ? err.message : 'Failed to place call';
		callState = 'idle';
		expectingServerCall = false;
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
	// Hang up local WebRTC call
	if (activeCall) {
		activeCall.hangup();
	}

	// Tell server to hang up both PSTN + SIP legs
	if (activeSessionId) {
		api('/api/telnyx/hangup', {
			method: 'POST',
			body: JSON.stringify({ sessionId: activeSessionId })
		}).catch(() => {});
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

// ─── Ringback Audio ─────────────────────────────────────────────────────────

function _startRingback() {
	_stopRingback();
	try {
		_ringbackAudio = new Audio('/audio/ringback.wav');
		_ringbackAudio.loop = true;
		_ringbackAudio.volume = 0.3;
		_ringbackAudio.play().catch(() => {});
	} catch {
		// Audio playback not critical
	}
}

function _stopRingback() {
	if (_ringbackAudio) {
		_ringbackAudio.pause();
		_ringbackAudio.src = '';
		_ringbackAudio = null;
	}
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

function _clearSipTimeout() {
	if (_sipTimeoutTimer) {
		clearTimeout(_sipTimeoutTimer);
		_sipTimeoutTimer = null;
	}
}

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
	_stopRingback();
	_clearSipTimeout();
	expectingServerCall = false;

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
	activeSessionId = null;
	expectingServerCall = false;
	_stopRingback();
	_clearSipTimeout();
	// Keep error visible briefly so user can read it
	const pendingError = error;
	if (pendingError) {
		setTimeout(() => { if (error === pendingError) error = null; }, 4000);
	} else {
		error = null;
	}
	incomingCall = null;
}

export function destroy() {
	_resetCallState();
	// Unsubscribe WS event handlers
	for (const unsub of _wsUnsubscribers) unsub();
	_wsUnsubscribers = [];
	if (client) {
		client.disconnect();
		client = null;
		clientReady = false;
	}
}
